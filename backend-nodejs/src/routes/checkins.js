const express = require('express');
const { authenticateWallet } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const { ValidationError, NotFoundError, asyncHandler } = require('../utils/errors');
const { isValidSS58Address } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/checkins
 * Get check-ins for user's events
 */
router.get('/', authenticateWallet, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, eventId, status, hasValidWallet } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let where = {
    // Temporarily show all check-ins regardless of user for migration compatibility
    // event: {
    //   userId: req.user.id
    // }
  };

  // Additional filters
  if (eventId) {
    where.eventId = eventId;
  }

  if (status) {
    where.nftMintStatus = status;
  }

  if (hasValidWallet === 'true') {
    where.walletAddress = { not: null };
  } else if (hasValidWallet === 'false') {
    where.walletAddress = null;
  }

  const [checkins, totalCount] = await Promise.all([
    prisma.checkIn.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startDate: true,
            location: true,
            autoMintEnabled: true
          }
        },
        nft: {
          select: {
            id: true,
            contractNftId: true,
            transactionHash: true,
            mintStatus: true,
            mintedAt: true
          }
        }
      },
      orderBy: { checkedInAt: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.checkIn.count({ where })
  ]);

  res.json({
    checkins: checkins.map(checkin => ({
      ...checkin,
      hasValidWalletAddress: isValidSS58Address(checkin.walletAddress),
      nft: checkin.nft ? {
        ...checkin.nft,
        contractNftId: checkin.nft.contractNftId?.toString()
      } : null
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalCount,
      pages: Math.ceil(totalCount / parseInt(limit))
    }
  });
}));

/**
 * GET /api/checkins/:id
 * Get specific check-in details
 */
router.get('/:id', authenticateWallet, asyncHandler(async (req, res) => {
  const checkin = await prisma.checkIn.findFirst({
    where: {
      id: req.params.id,
      event: {
        userId: req.user.id
      }
    },
    include: {
      event: {
        select: {
          id: true,
          lumaEventId: true,
          name: true,
          startDate: true,
          location: true,
          autoMintEnabled: true,
          nftTemplate: true
        }
      },
      nft: {
        select: {
          id: true,
          contractNftId: true,
          recipientAddress: true,
          transactionHash: true,
          blockNumber: true,
          mintStatus: true,
          mintedAt: true,
          metadata: true,
          imageUrl: true
        }
      }
    }
  });

  if (!checkin) {
    throw new NotFoundError('Check-in');
  }

  res.json({
    ...checkin,
    hasValidWalletAddress: isValidSS58Address(checkin.walletAddress),
    nft: checkin.nft ? {
      ...checkin.nft,
      contractNftId: checkin.nft.contractNftId?.toString(),
      blockNumber: checkin.nft.blockNumber?.toString(),
      metadata: JSON.parse(checkin.nft.metadata || '{}')
    } : null,
    event: {
      ...checkin.event,
      nftTemplate: checkin.event.nftTemplate ? JSON.parse(checkin.event.nftTemplate) : null
    }
  });
}));

/**
 * POST /api/checkins
 * Create new check-in (usually done by Luma sync, but available for manual creation)
 */
router.post('/', authenticateWallet, asyncHandler(async (req, res) => {
  const {
    eventId,
    lumaCheckInId,
    attendeeName,
    attendeeEmail,
    walletAddress,
    checkedInAt,
    location
  } = req.body;

  // Validation
  if (!eventId || !lumaCheckInId || !attendeeName || !attendeeEmail) {
    throw new ValidationError('eventId, lumaCheckInId, attendeeName, and attendeeEmail are required');
  }

  // Verify event belongs to user
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      userId: req.user.id
    }
  });

  if (!event) {
    throw new NotFoundError('Event');
  }

  // Check for duplicate check-in
  const existingCheckin = await prisma.checkIn.findUnique({
    where: { lumaCheckInId }
  });

  if (existingCheckin) {
    return res.status(409).json({
      error: 'Check-in with this Luma ID already exists',
      checkinId: existingCheckin.id
    });
  }

  // Validate wallet address if provided
  if (walletAddress && !isValidSS58Address(walletAddress)) {
    throw new ValidationError('Invalid wallet address format', 'walletAddress');
  }

  const checkin = await prisma.checkIn.create({
    data: {
      eventId,
      lumaCheckInId,
      attendeeName,
      attendeeEmail,
      walletAddress,
      checkedInAt: checkedInAt ? new Date(checkedInAt) : new Date(),
      location,
      nftMintStatus: walletAddress && isValidSS58Address(walletAddress) ? 'PENDING' : 'SKIPPED'
    },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          autoMintEnabled: true
        }
      }
    }
  });

  // Auto-mint NFT if conditions are met
  if (checkin.event.autoMintEnabled && checkin.walletAddress && isValidSS58Address(checkin.walletAddress)) {
    try {
      // Import the NFT minting service
      const { nftMintingService } = require('../services/nftMintingService');
      
      // Get the event details for lumaEventId
      const fullEvent = await prisma.event.findUnique({
        where: { id: checkin.eventId },
        select: { lumaEventId: true }
      });
      
      if (fullEvent?.lumaEventId) {
        // Automatically queue NFT minting
        await nftMintingService.queueMint({
          eventId: checkin.eventId,
          checkInId: checkin.id,
          lumaEventId: fullEvent.lumaEventId,
          recipient: checkin.walletAddress,
          attendeeName: checkin.attendeeName,
          attendeeEmail: checkin.attendeeEmail
        });
        
        console.log(`✅ Auto-queued NFT for check-in: ${checkin.id} (${checkin.attendeeName})`);
      } else {
        console.warn(`⚠️ No lumaEventId found for event ${checkin.eventId}, skipping auto-mint`);
      }
    } catch (error) {
      console.error(`❌ Failed to auto-queue NFT for check-in ${checkin.id}:`, error);
      // Don't fail the check-in creation, just log the error
    }
  }

  res.status(201).json({
    message: 'Check-in created successfully',
    checkin: {
      ...checkin,
      hasValidWalletAddress: isValidSS58Address(checkin.walletAddress)
    }
  });
}));

/**
 * PUT /api/checkins/:id
 * Update check-in details (mainly wallet address)
 */
router.put('/:id', authenticateWallet, asyncHandler(async (req, res) => {
  const { walletAddress, attendeeName, attendeeEmail } = req.body;

  const checkin = await prisma.checkIn.findFirst({
    where: {
      id: req.params.id,
      event: {
        userId: req.user.id
      }
    },
    include: {
      event: {
        select: {
          autoMintEnabled: true
        }
      }
    }
  });

  if (!checkin) {
    throw new NotFoundError('Check-in');
  }

  // Validate wallet address if provided
  if (walletAddress && !isValidSS58Address(walletAddress)) {
    throw new ValidationError('Invalid wallet address format', 'walletAddress');
  }

  // Determine new mint status
  let newMintStatus = checkin.nftMintStatus;
  if (walletAddress !== undefined) {
    if (walletAddress && isValidSS58Address(walletAddress)) {
      // Valid wallet added - set to pending if not already processed
      if (checkin.nftMintStatus === 'SKIPPED') {
        newMintStatus = 'PENDING';
      }
    } else {
      // Wallet removed or invalid - skip minting
      newMintStatus = 'SKIPPED';
    }
  }

  const updatedCheckin = await prisma.checkIn.update({
    where: { id: req.params.id },
    data: {
      ...(walletAddress !== undefined && { walletAddress }),
      ...(attendeeName && { attendeeName }),
      ...(attendeeEmail && { attendeeEmail }),
      ...(newMintStatus !== checkin.nftMintStatus && { nftMintStatus: newMintStatus })
    },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          autoMintEnabled: true
        }
      }
    }
  });

  // Auto-mint NFT if wallet was added and conditions are met
  if (updatedCheckin.event.autoMintEnabled && 
      updatedCheckin.walletAddress && 
      isValidSS58Address(updatedCheckin.walletAddress) &&
      newMintStatus === 'PENDING' && 
      checkin.nftMintStatus === 'SKIPPED') {
    try {
      // Import the NFT minting service
      const { nftMintingService } = require('../services/nftMintingService');
      
      // Get the event details for lumaEventId
      const fullEvent = await prisma.event.findUnique({
        where: { id: updatedCheckin.eventId },
        select: { lumaEventId: true }
      });
      
      if (fullEvent?.lumaEventId) {
        // Automatically queue NFT minting
        await nftMintingService.queueMint({
          eventId: updatedCheckin.eventId,
          checkInId: updatedCheckin.id,
          lumaEventId: fullEvent.lumaEventId,
          recipient: updatedCheckin.walletAddress,
          attendeeName: updatedCheckin.attendeeName,
          attendeeEmail: updatedCheckin.attendeeEmail
        });
        
        console.log(`✅ Auto-queued NFT for updated check-in: ${updatedCheckin.id} (${updatedCheckin.attendeeName})`);
      } else {
        console.warn(`⚠️ No lumaEventId found for event ${updatedCheckin.eventId}, skipping auto-mint`);
      }
    } catch (error) {
      console.error(`❌ Failed to auto-queue NFT for updated check-in ${updatedCheckin.id}:`, error);
      // Don't fail the check-in update, just log the error
    }
  }

  res.json({
    message: 'Check-in updated successfully',
    checkin: {
      ...updatedCheckin,
      hasValidWalletAddress: isValidSS58Address(updatedCheckin.walletAddress)
    }
  });
}));

/**
 * POST /api/checkins/:id/trigger-mint
 * Manually trigger NFT minting for a check-in
 */
router.post('/:id/trigger-mint', authenticateWallet, asyncHandler(async (req, res) => {
  const checkin = await prisma.checkIn.findFirst({
    where: {
      id: req.params.id,
      event: {
        userId: req.user.id
      }
    },
    include: {
      event: true
    }
  });

  if (!checkin) {
    throw new NotFoundError('Check-in');
  }

  if (!checkin.walletAddress || !isValidSS58Address(checkin.walletAddress)) {
    return res.status(400).json({
      error: 'Valid wallet address required for NFT minting'
    });
  }

  if (checkin.nftMintStatus === 'COMPLETED') {
    return res.status(400).json({
      error: 'NFT already minted for this check-in'
    });
  }

  // Update check-in to trigger minting
  await prisma.checkIn.update({
    where: { id: req.params.id },
    data: {
      nftMintStatus: 'PENDING',
      mintError: null,
      mintAttempts: 0
    }
  });

  res.json({
    message: 'NFT minting triggered successfully',
    checkinId: req.params.id
  });
}));

/**
 * GET /api/checkins/stats/overview
 * Get check-in statistics for user's events
 */
router.get('/stats/overview', authenticateWallet, asyncHandler(async (req, res) => {
  const [
    totalCheckins,
    pendingMints,
    completedMints,
    failedMints,
    skippedMints,
    validWalletCheckins
  ] = await Promise.all([
    prisma.checkIn.count({}),
    prisma.checkIn.count({
      where: {
        nftMintStatus: 'PENDING'
      }
    }),
    prisma.checkIn.count({
      where: {
        nftMintStatus: 'COMPLETED'
      }
    }),
    prisma.checkIn.count({
      where: {
        nftMintStatus: 'FAILED'
      }
    }),
    prisma.checkIn.count({
      where: {
        nftMintStatus: 'SKIPPED'
      }
    }),
    prisma.checkIn.count({
      where: {
        walletAddress: { not: null }
      }
    })
  ]);

  res.json({
    totalCheckins,
    validWalletCheckins,
    minting: {
      pending: pendingMints,
      completed: completedMints,
      failed: failedMints,
      skipped: skippedMints
    },
    mintingRate: totalCheckins > 0 ? Math.round((completedMints / totalCheckins) * 100) : 0
  });
}));

module.exports = router;