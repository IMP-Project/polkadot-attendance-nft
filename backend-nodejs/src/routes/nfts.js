const express = require('express');
const { authenticateWallet, optionalAuth } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const { ValidationError, NotFoundError, asyncHandler } = require('../utils/errors');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/nfts
 * Get NFTs for authenticated user or public gallery
 */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, eventId, public: isPublic } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let where = {};

  if (isPublic === 'true') {
    // Public gallery - show all completed NFTs
    where = {
      mintStatus: 'COMPLETED'
    };
  } else if (req.user) {
    // Authenticated user - show their NFTs
    where = {
      userId: req.user.id,
      ...(status && { mintStatus: status }),
      ...(eventId && { eventId })
    };
  } else {
    return res.status(401).json({
      error: 'Authentication required for private NFT access'
    });
  }

  const [nfts, totalCount] = await Promise.all([
    prisma.nFT.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startDate: true,
            location: true,
            imageUrl: true
          }
        },
        user: isPublic === 'true' ? {
          select: {
            walletAddress: true
          }
        } : false,
        checkin: {
          select: {
            id: true,
            attendeeName: true,
            checkedInAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.nFT.count({ where })
  ]);

  res.json({
    nfts: nfts.map(nft => ({
      ...nft,
      metadata: JSON.parse(nft.metadata || '{}'),
      contractNftId: nft.contractNftId?.toString(), // Convert BigInt to string
      blockNumber: nft.blockNumber?.toString()
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
 * GET /api/nfts/:id
 * Get specific NFT details
 */
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const nft = await prisma.nFT.findUnique({
    where: { id: req.params.id },
    include: {
      event: {
        select: {
          id: true,
          lumaEventId: true,
          name: true,
          description: true,
          startDate: true,
          endDate: true,
          location: true,
          imageUrl: true
        }
      },
      user: {
        select: {
          walletAddress: true
        }
      },
      checkin: {
        select: {
          id: true,
          attendeeName: true,
          attendeeEmail: true,
          checkedInAt: true,
          location: true
        }
      }
    }
  });

  if (!nft) {
    throw new NotFoundError('NFT');
  }

  // Check access permissions
  if (nft.mintStatus !== 'COMPLETED' && (!req.user || nft.userId !== req.user.id)) {
    throw new NotFoundError('NFT');
  }

  res.json({
    ...nft,
    metadata: JSON.parse(nft.metadata || '{}'),
    contractNftId: nft.contractNftId?.toString(),
    blockNumber: nft.blockNumber?.toString()
  });
}));

/**
 * GET /api/nfts/wallet/:address
 * Get NFTs owned by specific wallet address (public endpoint)
 */
router.get('/wallet/:address', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [nfts, totalCount] = await Promise.all([
    prisma.nFT.findMany({
      where: {
        recipientAddress: req.params.address,
        mintStatus: 'COMPLETED'
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startDate: true,
            location: true,
            imageUrl: true
          }
        }
      },
      orderBy: { mintedAt: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.nFT.count({
      where: {
        recipientAddress: req.params.address,
        mintStatus: 'COMPLETED'
      }
    })
  ]);

  res.json({
    walletAddress: req.params.address,
    nfts: nfts.map(nft => ({
      ...nft,
      metadata: JSON.parse(nft.metadata || '{}'),
      contractNftId: nft.contractNftId?.toString(),
      blockNumber: nft.blockNumber?.toString()
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
 * POST /api/nfts/:id/retry-mint
 * Retry failed NFT minting
 */
router.post('/:id/retry-mint', authenticateWallet, asyncHandler(async (req, res) => {
  const nft = await prisma.nFT.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id
    }
  });

  if (!nft) {
    throw new NotFoundError('NFT');
  }

  if (nft.mintStatus !== 'FAILED') {
    return res.status(400).json({
      error: 'Can only retry failed NFT mints',
      currentStatus: nft.mintStatus
    });
  }

  // Reset NFT to pending status for retry
  const updatedNft = await prisma.nFT.update({
    where: { id: req.params.id },
    data: {
      mintStatus: 'PENDING',
      mintError: null
    }
  });

  res.json({
    message: 'NFT mint retry queued successfully',
    nft: {
      ...updatedNft,
      contractNftId: updatedNft.contractNftId?.toString(),
      blockNumber: updatedNft.blockNumber?.toString()
    }
  });
}));

/**
 * GET /api/nfts/stats/global
 * Get global NFT statistics (public endpoint)
 */
router.get('/stats/global', asyncHandler(async (req, res) => {
  const [totalNFTs, totalEvents, totalUsers, recentNFTs] = await Promise.all([
    prisma.nFT.count({
      where: { mintStatus: 'COMPLETED' }
    }),
    prisma.event.count(),
    prisma.user.count(),
    prisma.nFT.count({
      where: {
        mintStatus: 'COMPLETED',
        mintedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    })
  ]);

  res.json({
    totalNFTs,
    totalEvents,
    totalUsers,
    recentNFTs,
    lastUpdated: new Date().toISOString()
  });
}));

/**
 * GET /api/nfts/verify/:contractNftId
 * Verify NFT on blockchain (public endpoint)
 */
router.get('/verify/:contractNftId', asyncHandler(async (req, res) => {
  const contractNftId = BigInt(req.params.contractNftId);
  
  const nft = await prisma.nFT.findFirst({
    where: {
      contractNftId,
      mintStatus: 'COMPLETED'
    },
    include: {
      event: {
        select: {
          name: true,
          startDate: true,
          location: true
        }
      }
    }
  });

  if (!nft) {
    return res.status(404).json({
      verified: false,
      error: 'NFT not found or not yet minted'
    });
  }

  res.json({
    verified: true,
    nft: {
      id: nft.id,
      contractNftId: nft.contractNftId.toString(),
      recipientAddress: nft.recipientAddress,
      transactionHash: nft.transactionHash,
      blockNumber: nft.blockNumber?.toString(),
      mintedAt: nft.mintedAt,
      metadata: JSON.parse(nft.metadata || '{}'),
      event: nft.event
    }
  });
}));

module.exports = router;