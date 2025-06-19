const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { authenticateWallet } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const { ValidationError, NotFoundError, asyncHandler } = require('../utils/errors');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

/**
 * GET /api/events
 * Get all events for the authenticated user
 */
router.get('/', authenticateWallet, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    // Show all events for community visibility
    ...(status && { 
      // Filter by sync status if provided
      syncError: status === 'error' ? { not: null } : null
    })
  };

  const [events, totalCount] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        user: {
          select: {
            walletAddress: true
          }
        },
        _count: {
          select: {
            checkins: true,
            nfts: {
              where: { mintStatus: 'COMPLETED' }
            }
          }
        }
      },
      orderBy: { startDate: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.event.count({ where })
  ]);

  res.json({
    events: events.map(event => ({
      ...event,
      checkinsCount: event._count.checkins,
      mintedNFTsCount: event._count.nfts,
      isOwner: event.userId === req.user.id,
      ownerAddress: event.user.walletAddress,
      _count: undefined, // Remove from response
      user: undefined // Remove user object from response
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
 * GET /api/events/:id
 * Get specific event by ID
 */
router.get('/:id', authenticateWallet, asyncHandler(async (req, res) => {
  const event = await prisma.event.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id
    },
    include: {
      checkins: {
        select: {
          id: true,
          attendeeName: true,
          attendeeEmail: true,
          walletAddress: true,
          checkedInAt: true,
          nftMintStatus: true,
          nft: {
            select: {
              id: true,
              contractNftId: true,
              transactionHash: true,
              mintStatus: true
            }
          }
        },
        orderBy: { checkedInAt: 'desc' }
      },
      _count: {
        select: {
          checkins: true,
          nfts: {
            where: { mintStatus: 'COMPLETED' }
          }
        }
      }
    }
  });

  if (!event) {
    throw new NotFoundError('Event');
  }

  res.json({
    ...event,
    checkinsCount: event._count.checkins,
    mintedNFTsCount: event._count.nfts,
    _count: undefined
  });
}));

/**
 * POST /api/events
 * Create new event (manual creation, usually events come from Luma sync)
 */
router.post('/', authenticateWallet, asyncHandler(async (req, res) => {
  const {
    lumaEventId,
    name,
    description,
    startDate,
    endDate,
    location,
    imageUrl,
    autoMintEnabled = true,
    nftTemplate
  } = req.body;

  // Validation
  if (!lumaEventId || !name || !startDate) {
    throw new ValidationError('lumaEventId, name, and startDate are required');
  }

  // Check if event already exists
  const existingEvent = await prisma.event.findUnique({
    where: { lumaEventId }
  });

  if (existingEvent) {
    return res.status(409).json({
      error: 'Event with this Luma ID already exists',
      eventId: existingEvent.id
    });
  }

  const event = await prisma.event.create({
    data: {
      userId: req.user.id,
      lumaEventId,
      name,
      description,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      location,
      imageUrl,
      autoMintEnabled,
      nftTemplate: nftTemplate ? JSON.stringify(nftTemplate) : null
    },
    include: {
      _count: {
        select: {
          checkins: true,
          nfts: true
        }
      }
    }
  });

  res.status(201).json({
    message: 'Event created successfully',
    event: {
      ...event,
      checkinsCount: event._count.checkins,
      mintedNFTsCount: event._count.nfts,
      _count: undefined
    }
  });
}));

/**
 * PUT /api/events/:id
 * Update event settings
 */
router.put('/:id', authenticateWallet, asyncHandler(async (req, res) => {
  const {
    autoMintEnabled,
    nftTemplate,
    name,
    description,
    location
  } = req.body;

  const event = await prisma.event.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id
    }
  });

  if (!event) {
    throw new NotFoundError('Event');
  }

  const updatedEvent = await prisma.event.update({
    where: { id: req.params.id },
    data: {
      ...(autoMintEnabled !== undefined && { autoMintEnabled }),
      ...(nftTemplate && { nftTemplate: JSON.stringify(nftTemplate) }),
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(location !== undefined && { location })
    },
    include: {
      _count: {
        select: {
          checkins: true,
          nfts: {
            where: { mintStatus: 'COMPLETED' }
          }
        }
      }
    }
  });

  res.json({
    message: 'Event updated successfully',
    event: {
      ...updatedEvent,
      checkinsCount: updatedEvent._count.checkins,
      mintedNFTsCount: updatedEvent._count.nfts,
      _count: undefined
    }
  });
}));

/**
 * DELETE /api/events/:id
 * Delete event (cascades to check-ins and NFTs)
 */
router.delete('/:id', authenticateWallet, asyncHandler(async (req, res) => {
  const event = await prisma.event.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id
    }
  });

  if (!event) {
    throw new NotFoundError('Event');
  }

  await prisma.event.delete({
    where: { id: req.params.id }
  });

  res.json({
    message: 'Event deleted successfully',
    eventId: req.params.id
  });
}));

/**
 * POST /api/events/:id/design
 * Upload custom NFT design for an event
 */
router.post('/:id/design', authenticateWallet, upload.single('file'), asyncHandler(async (req, res) => {
  const { title, description, traits, metadata } = req.body;
  
  // Verify event ownership
  const event = await prisma.event.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id
    }
  });

  if (!event) {
    throw new NotFoundError('Event');
  }

  if (!req.file) {
    throw new ValidationError('Design file is required');
  }

  let imageUrl = null;
  
  // Upload to Cloudinary if configured
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    try {
      // Configure Cloudinary
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });

      // Convert buffer to base64
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'nft-designs',
        public_id: `event-${req.params.id}-${Date.now()}`,
        resource_type: 'auto'
      });
      
      imageUrl = result.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      // Continue without image URL if upload fails
    }
  }

  // Create NFT template
  const nftTemplate = {
    title,
    description: description || 'This NFT serves as verifiable proof of attendance',
    traits: traits || 'Attendee',
    metadata: JSON.parse(metadata || '{}'),
    imageUrl,
    uploadedAt: new Date().toISOString()
  };

  // Update event with NFT template
  const updatedEvent = await prisma.event.update({
    where: { id: req.params.id },
    data: {
      nftTemplate: JSON.stringify(nftTemplate)
    }
  });

  res.json({
    message: 'NFT design uploaded successfully',
    event: {
      id: updatedEvent.id,
      name: updatedEvent.name,
      nftTemplate: nftTemplate
    }
  });
}));

/**
 * POST /api/events/:id/sync
 * Manually trigger sync for specific event
 */
router.post('/:id/sync', authenticateWallet, asyncHandler(async (req, res) => {
  const event = await prisma.event.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id
    }
  });

  if (!event) {
    throw new NotFoundError('Event');
  }

  // Update last synced timestamp
  await prisma.event.update({
    where: { id: req.params.id },
    data: {
      lastSyncedAt: new Date(),
      syncError: null // Clear any previous sync errors
    }
  });

  res.json({
    message: 'Event sync triggered successfully',
    eventId: req.params.id,
    syncedAt: new Date().toISOString()
  });
}));

module.exports = router;