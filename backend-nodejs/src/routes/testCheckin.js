const express = require('express');
const { authenticateWallet } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/test/checkin
 * Manually create a test check-in (for testing NFT minting flow)
 */
router.post('/checkin', authenticateWallet, async (req, res) => {
  try {
    const { eventId, attendeeName, attendeeEmail } = req.body;
    
    if (!eventId || !attendeeName) {
      return res.status(400).json({
        error: 'eventId and attendeeName are required'
      });
    }

    // Find the event
    const event = await prisma.event.findFirst({
      where: {
        OR: [
          { id: eventId },
          { lumaEventId: eventId },
          { name: { contains: eventId, mode: 'insensitive' } }
        ],
        userId: req.user.id
      }
    });

    if (!event) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }

    // Create test check-in
    const lumaCheckInId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const checkIn = await prisma.checkIn.create({
      data: {
        eventId: event.id,
        lumaCheckInId,
        attendeeName,
        attendeeEmail: attendeeEmail || '',
        walletAddress: req.user.walletAddress, // Use current user's wallet for testing
        checkedInAt: new Date(),
        location: event.location
      }
    });

    console.log(`✅ Manual test check-in created: ${attendeeName} for ${event.name}`);
    
    res.json({
      message: 'Test check-in created successfully',
      checkIn: {
        id: checkIn.id,
        attendeeName: checkIn.attendeeName,
        event: event.name,
        checkedInAt: checkIn.checkedInAt
      }
    });
    
  } catch (error) {
    console.error('Test check-in creation error:', error);
    res.status(500).json({
      error: 'Failed to create test check-in'
    });
  }
});

/**
 * GET /api/test/checkins
 * Get all check-ins for testing
 */
router.get('/checkins', authenticateWallet, async (req, res) => {
  try {
    const checkIns = await prisma.checkIn.findMany({
      where: {
        event: {
          userId: req.user.id
        }
      },
      include: {
        event: {
          select: {
            name: true,
            id: true
          }
        }
      },
      orderBy: { checkedInAt: 'desc' }
    });

    res.json({
      checkIns: checkIns.map(ci => ({
        id: ci.id,
        attendeeName: ci.attendeeName,
        attendeeEmail: ci.attendeeEmail,
        walletAddress: ci.walletAddress,
        checkedInAt: ci.checkedInAt,
        event: ci.event.name,
        nftMintStatus: ci.nftMintStatus
      }))
    });
    
  } catch (error) {
    console.error('Get check-ins error:', error);
    res.status(500).json({
      error: 'Failed to get check-ins'
    });
  }
});

module.exports = router;