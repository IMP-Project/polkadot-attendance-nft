const express = require('express');
const { authenticateWallet } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const { LumaClient } = require('../services/lumaClient');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/users/profile
 * Get current user's profile
 */
router.get('/profile', authenticateWallet, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        walletAddress: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            events: true,
            nfts: true
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    res.json({
      user: user
    });
    
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch user profile'
    });
  }
});

/**
 * GET /api/users/stats
 * Get user statistics
 */
router.get('/stats', authenticateWallet, async (req, res) => {
  try {
    const stats = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        _count: {
          select: {
            events: true,
            nfts: {
              where: {
                mintStatus: 'COMPLETED'
              }
            }
          }
        }
      }
    });
    
    const totalCheckins = await prisma.checkIn.count({
      where: {
        event: {
          userId: req.user.id
        }
      }
    });
    
    const pendingMints = await prisma.nft.count({
      where: {
        userId: req.user.id,
        mintStatus: {
          in: ['PENDING', 'PROCESSING']
        }
      }
    });
    
    res.json({
      totalEvents: stats?._count?.events || 0,
      totalNFTs: stats?._count?.nfts || 0,
      totalCheckins,
      pendingMints
    });
    
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch user statistics'
    });
  }
});

/**
 * POST /api/users/luma/connect
 * Connect to Luma API
 */
router.post('/luma/connect', authenticateWallet, async (req, res) => {
  try {
    const { lumaApiKey } = req.body;
    
    if (!lumaApiKey) {
      return res.status(400).json({
        error: 'Luma API key is required'
      });
    }

    // Test the connection first
    const lumaClient = new LumaClient(lumaApiKey);
    const testResult = await lumaClient.testConnection();
    
    if (!testResult.success) {
      return res.status(400).json({
        error: 'Invalid Luma API key: ' + testResult.error
      });
    }
    
    // Store the API key if connection successful
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        lumaApiKey,
        lumaConnectedAt: new Date()
      }
    });
    
    res.json({
      message: 'Successfully connected to Luma',
      connected: true,
      user: testResult.user
    });
    
  } catch (error) {
    console.error('Luma connection error:', error);
    res.status(500).json({
      error: 'Failed to connect to Luma'
    });
  }
});

/**
 * GET /api/users/luma/status
 * Get Luma integration status
 */
router.get('/luma/status', authenticateWallet, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        lumaConnectedAt: true
      }
    });

    const connected = !!user?.lumaConnectedAt;
    
    res.json({
      connected,
      connectedAt: user?.lumaConnectedAt || null
    });
    
  } catch (error) {
    console.error('Luma status error:', error);
    res.status(500).json({
      error: 'Failed to get Luma status'
    });
  }
});

/**
 * POST /api/users/luma/disconnect
 * Disconnect from Luma API
 */
router.post('/luma/disconnect', authenticateWallet, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        lumaApiKey: null,
        lumaConnectedAt: null
      }
    });
    
    res.json({
      message: 'Successfully disconnected from Luma',
      connected: false
    });
    
  } catch (error) {
    console.error('Luma disconnect error:', error);
    res.status(500).json({
      error: 'Failed to disconnect from Luma'
    });
  }
});

/**
 * GET /api/users/luma/events
 * Get events from Luma
 */
router.get('/luma/events', authenticateWallet, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        lumaApiKey: true,
        lumaConnectedAt: true
      }
    });

    if (!user?.lumaApiKey || !user?.lumaConnectedAt) {
      return res.status(400).json({
        error: 'Luma integration not configured'
      });
    }

    const lumaClient = new LumaClient(user.lumaApiKey);
    const result = await lumaClient.getEvents();
    
    res.json(result);
    
  } catch (error) {
    console.error('Luma events fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch Luma events'
    });
  }
});

module.exports = router;