const { eventSyncService } = require('./eventSyncService');
const { checkinSyncService } = require('./checkinSyncService');
const { syncErrorHandler } = require('./syncErrorHandler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class SyncOrchestrator {
  constructor() {
    this.isRunning = false;
    this.services = {
      events: eventSyncService,
      checkins: checkinSyncService
    };
    this.gracefulShutdown = false;
  }

  /**
   * Start all sync services
   */
  async start() {
    if (this.isRunning) {
      console.log('Sync orchestrator is already running');
      return;
    }

    console.log('🚀 Starting sync orchestrator...');
    this.isRunning = true;
    this.gracefulShutdown = false;

    try {
      // Start individual services
      console.log('📅 Starting event sync service...');
      this.services.events.start();

      // Small delay between starting services
      await this.delay(2000);

      console.log('✅ Starting check-in sync service...');
      this.services.checkins.start();

      console.log('🎉 All sync services started successfully');

      // Set up graceful shutdown handlers
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('❌ Failed to start sync orchestrator:', error);
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop all sync services
   */
  async stop() {
    if (!this.isRunning) {
      console.log('Sync orchestrator is not running');
      return;
    }

    console.log('🛑 Stopping sync orchestrator...');
    this.gracefulShutdown = true;

    try {
      // Stop services in reverse order
      console.log('🛑 Stopping check-in sync service...');
      this.services.checkins.stop();

      console.log('🛑 Stopping event sync service...');
      this.services.events.stop();

      this.isRunning = false;
      console.log('✅ Sync orchestrator stopped successfully');

    } catch (error) {
      console.error('❌ Error stopping sync orchestrator:', error);
      throw error;
    }
  }

  /**
   * Restart all sync services
   */
  async restart() {
    console.log('🔄 Restarting sync orchestrator...');
    await this.stop();
    await this.delay(1000);
    await this.start();
  }

  /**
   * Get comprehensive sync status
   */
  async getStatus() {
    const [eventStatus, checkinStatus, errorStats] = await Promise.all([
      this.services.events.getSyncStatus(),
      this.services.checkins.getSyncStatus(),
      syncErrorHandler.getErrorStats()
    ]);

    // Get overall system stats
    const systemStats = await this.getSystemStats();

    return {
      orchestrator: {
        isRunning: this.isRunning,
        gracefulShutdown: this.gracefulShutdown,
        uptime: this.isRunning ? process.uptime() : 0
      },
      events: eventStatus,
      checkins: checkinStatus,
      errors: errorStats,
      system: systemStats
    };
  }

  /**
   * Get system-wide statistics
   */
  async getSystemStats() {
    try {
      const [
        totalUsers,
        usersWithLuma,
        totalEvents,
        totalCheckIns,
        totalNFTs,
        recentSyncActivity
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            lumaApiKey: { not: null },
            lumaConnectedAt: { not: null }
          }
        }),
        prisma.event.count(),
        prisma.checkIn.count(),
        prisma.nft.count(),
        this.getRecentSyncActivity()
      ]);

      return {
        totalUsers,
        usersWithLuma,
        totalEvents,
        totalCheckIns,
        totalNFTs,
        recentActivity: recentSyncActivity
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      return {
        error: error.message
      };
    }
  }

  /**
   * Get recent sync activity
   */
  async getRecentSyncActivity() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    try {
      const [recentEventSyncs, recentCheckInSyncs] = await Promise.all([
        prisma.user.count({
          where: {
            lastEventSyncAt: { gte: oneHourAgo }
          }
        }),
        prisma.user.count({
          where: {
            lastCheckInSyncAt: { gte: oneHourAgo }
          }
        })
      ]);

      return {
        eventSyncsLastHour: recentEventSyncs,
        checkinSyncsLastHour: recentCheckInSyncs
      };
    } catch (error) {
      console.error('Error getting recent sync activity:', error);
      return {
        error: error.message
      };
    }
  }

  /**
   * Manually trigger sync for a specific user
   * @param {string} userId - User ID to sync
   * @param {Object} options - Sync options
   * @param {boolean} options.events - Whether to sync events
   * @param {boolean} options.checkins - Whether to sync check-ins
   */
  async triggerUserSync(userId, options = { events: true, checkins: true }) {
    console.log(`🚀 Manual sync triggered for user ${userId}`, options);

    const results = {};

    try {
      if (options.events) {
        console.log(`📅 Triggering event sync for user ${userId}...`);
        results.events = await syncErrorHandler.handleSyncWithRetry(
          userId,
          'events',
          () => this.services.events.triggerUserSync(userId),
          { trigger: 'manual' }
        );
      }

      if (options.checkins) {
        console.log(`✅ Triggering check-in sync for user ${userId}...`);
        results.checkins = await syncErrorHandler.handleSyncWithRetry(
          userId,
          'checkins', 
          () => this.services.checkins.triggerUserSync(userId),
          { trigger: 'manual' }
        );
      }

      console.log(`✅ Manual sync completed for user ${userId}`);
      return {
        success: true,
        results
      };

    } catch (error) {
      console.error(`❌ Manual sync failed for user ${userId}:`, error);
      return {
        success: false,
        error: error.message,
        results
      };
    }
  }

  /**
   * Manually trigger sync for a specific event's check-ins
   * @param {string} eventId - Event ID to sync check-ins for
   */
  async triggerEventCheckInSync(eventId) {
    console.log(`🚀 Manual check-in sync triggered for event ${eventId}`);

    try {
      const result = await this.services.checkins.triggerEventSync(eventId);
      
      console.log(`✅ Manual event check-in sync completed for event ${eventId}`);
      return {
        success: true,
        result
      };

    } catch (error) {
      console.error(`❌ Manual event check-in sync failed for event ${eventId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Health check for all sync services
   */
  async healthCheck() {
    const checks = {
      orchestrator: this.isRunning,
      eventService: this.services.events.isRunning,
      checkinService: this.services.checkins.isRunning,
      database: false
    };

    // Test database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    const allHealthy = Object.values(checks).every(check => check === true);

    return {
      healthy: allHealthy,
      checks,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Set up graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdownHandler = async (signal) => {
      if (this.gracefulShutdown) {
        console.log('Shutdown already in progress, forcing exit...');
        process.exit(1);
      }

      console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
      
      try {
        await this.stop();
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGINT', () => shutdownHandler('SIGINT'));
  }

  /**
   * Update sync intervals dynamically
   * @param {Object} intervals - New intervals
   * @param {number} intervals.events - Event sync interval in ms
   * @param {number} intervals.checkins - Check-in sync interval in ms
   */
  async updateIntervals(intervals) {
    console.log('🔧 Updating sync intervals:', intervals);

    const wasRunning = this.isRunning;

    if (wasRunning) {
      await this.stop();
    }

    // Update intervals
    if (intervals.events) {
      this.services.events.intervalMs = intervals.events;
      process.env.EVENT_POLL_INTERVAL = intervals.events.toString();
    }

    if (intervals.checkins) {
      this.services.checkins.intervalMs = intervals.checkins;
      process.env.CHECKIN_POLL_INTERVAL = intervals.checkins.toString();
    }

    if (wasRunning) {
      await this.start();
    }

    console.log('✅ Sync intervals updated successfully');
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
const syncOrchestrator = new SyncOrchestrator();

module.exports = {
  SyncOrchestrator,
  syncOrchestrator
};