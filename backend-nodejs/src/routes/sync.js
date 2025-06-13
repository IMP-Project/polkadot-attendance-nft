const express = require('express');
const { authenticateWallet } = require('../middleware/auth');
const { syncOrchestrator } = require('../services/syncOrchestrator');
const { syncErrorHandler } = require('../services/syncErrorHandler');
const { ValidationError, NotFoundError, asyncHandler } = require('../utils/errors');

const router = express.Router();

/**
 * GET /api/sync/status
 * Get comprehensive sync status
 */
router.get('/status', asyncHandler(async (req, res) => {
  const status = await syncOrchestrator.getStatus();
  res.json(status);
}));

/**
 * GET /api/sync/health
 * Health check for sync services
 */
router.get('/health', asyncHandler(async (req, res) => {
  const health = await syncOrchestrator.healthCheck();
  
  if (!health.healthy) {
    return res.status(503).json(health);
  }
  
  res.json(health);
}));

/**
 * POST /api/sync/start
 * Start sync services (admin only for now)
 */
router.post('/start', asyncHandler(async (req, res) => {
  await syncOrchestrator.start();
  
  res.json({
    message: 'Sync services started successfully',
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/sync/stop
 * Stop sync services (admin only for now)
 */
router.post('/stop', asyncHandler(async (req, res) => {
  await syncOrchestrator.stop();
  
  res.json({
    message: 'Sync services stopped successfully',
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/sync/restart
 * Restart sync services (admin only for now)
 */
router.post('/restart', asyncHandler(async (req, res) => {
  await syncOrchestrator.restart();
  
  res.json({
    message: 'Sync services restarted successfully',
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/sync/user/me
 * Manually trigger sync for current authenticated user
 */
router.post('/user/me', authenticateWallet, asyncHandler(async (req, res) => {
  const { events = true, checkins = true } = req.body;
  const userId = req.user.id;

  // Check if user has Luma integration
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      lumaApiKey: true,
      lumaConnectedAt: true,
      walletAddress: true
    }
  });

  if (!user || !user.lumaApiKey || !user.lumaConnectedAt) {
    return res.status(400).json({
      error: 'Luma integration not configured. Please add your Luma API key in settings.'
    });
  }

  const result = await syncOrchestrator.triggerUserSync(userId, { events, checkins });
  
  if (!result.success) {
    return res.status(500).json({
      error: 'Sync failed',
      details: result.error,
      results: result.results
    });
  }

  res.json({
    message: 'Your sync completed successfully',
    userId,
    walletAddress: user.walletAddress,
    results: result.results
  });
}));

/**
 * POST /api/sync/user/:userId
 * Manually trigger sync for a specific user
 */
router.post('/user/:userId', authenticateWallet, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { events = true, checkins = true } = req.body;

  // Check if user is requesting sync for themselves or has admin permissions
  if (req.user.id !== userId) {
    // TODO: Add admin permission check here
    return res.status(403).json({
      error: 'Insufficient permissions to sync another user'
    });
  }

  const result = await syncOrchestrator.triggerUserSync(userId, { events, checkins });
  
  if (!result.success) {
    return res.status(500).json({
      error: 'Sync failed',
      details: result.error,
      results: result.results
    });
  }

  res.json({
    message: 'User sync completed successfully',
    userId,
    results: result.results
  });
}));

/**
 * POST /api/sync/event/:eventId/checkins
 * Manually trigger check-in sync for a specific event
 */
router.post('/event/:eventId/checkins', authenticateWallet, asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  // Verify that the event belongs to the authenticated user
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      userId: req.user.id
    },
    select: {
      id: true,
      name: true,
      lumaEventId: true
    }
  });

  if (!event) {
    throw new NotFoundError('Event');
  }

  const result = await syncOrchestrator.triggerEventCheckInSync(eventId);
  
  if (!result.success) {
    return res.status(500).json({
      error: 'Event check-in sync failed',
      details: result.error
    });
  }

  res.json({
    message: 'Event check-in sync completed successfully',
    eventId,
    eventName: event.name,
    result: result.result
  });
}));

/**
 * PUT /api/sync/intervals
 * Update sync intervals (admin only for now)
 */
router.put('/intervals', asyncHandler(async (req, res) => {
  const { events, checkins } = req.body;

  // Validation
  if (events && (typeof events !== 'number' || events < 1000 || events > 300000)) {
    throw new ValidationError('Event interval must be between 1000ms (1s) and 300000ms (5min)');
  }

  if (checkins && (typeof checkins !== 'number' || checkins < 1000 || checkins > 300000)) {
    throw new ValidationError('Check-in interval must be between 1000ms (1s) and 300000ms (5min)');
  }

  const intervals = {};
  if (events) intervals.events = events;
  if (checkins) intervals.checkins = checkins;

  await syncOrchestrator.updateIntervals(intervals);

  res.json({
    message: 'Sync intervals updated successfully',
    intervals: {
      events: intervals.events || parseInt(process.env.EVENT_POLL_INTERVAL) || 10000,
      checkins: intervals.checkins || parseInt(process.env.CHECKIN_POLL_INTERVAL) || 5000
    }
  });
}));

/**
 * GET /api/sync/errors
 * Get error statistics and circuit breaker status
 */
router.get('/errors', asyncHandler(async (req, res) => {
  const errorStats = await syncErrorHandler.getErrorStats();
  res.json(errorStats);
}));

/**
 * POST /api/sync/errors/reset
 * Reset circuit breakers (admin only for now)
 */
router.post('/errors/reset', asyncHandler(async (req, res) => {
  const { userId, syncType } = req.body;

  if (!userId || !syncType) {
    throw new ValidationError('userId and syncType are required');
  }

  if (!['events', 'checkins'].includes(syncType)) {
    throw new ValidationError('syncType must be "events" or "checkins"');
  }

  syncErrorHandler.resetCircuitBreaker(userId, syncType);

  res.json({
    message: 'Circuit breaker reset successfully',
    userId,
    syncType
  });
}));

module.exports = router;