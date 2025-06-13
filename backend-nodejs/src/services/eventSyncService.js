const { PrismaClient } = require('@prisma/client');
const { createLumaClientForUser, transformLumaEvent } = require('./lumaClient');

const prisma = new PrismaClient();

class EventSyncService {
  constructor() {
    this.isRunning = false;
    this.syncInterval = null;
    this.intervalMs = parseInt(process.env.EVENT_POLL_INTERVAL) || 10000; // 10 seconds default
  }

  /**
   * Start the event polling service
   */
  start() {
    if (this.isRunning) {
      console.log('Event sync service is already running');
      return;
    }

    console.log(`🔄 Starting event sync service (${this.intervalMs}ms intervals)`);
    this.isRunning = true;

    // Run initial sync
    this.syncAllUsersEvents().catch(error => {
      console.error('Initial event sync failed:', error);
    });

    // Set up recurring sync
    this.syncInterval = setInterval(() => {
      this.syncAllUsersEvents().catch(error => {
        console.error('Scheduled event sync failed:', error);
      });
    }, this.intervalMs);
  }

  /**
   * Stop the event polling service
   */
  stop() {
    if (!this.isRunning) {
      console.log('Event sync service is not running');
      return;
    }

    console.log('🛑 Stopping event sync service');
    this.isRunning = false;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Sync events for all users who have Luma integration
   */
  async syncAllUsersEvents() {
    try {
      const usersWithLuma = await prisma.user.findMany({
        where: {
          lumaApiKey: { not: null },
          lumaConnectedAt: { not: null }
        },
        select: {
          id: true,
          walletAddress: true,
          lumaOrganization: true
        }
      });

      if (usersWithLuma.length === 0) {
        return;
      }

      console.log(`🔄 Syncing events for ${usersWithLuma.length} users`);

      // Process users in parallel but limit concurrency
      const batchSize = 3;
      for (let i = 0; i < usersWithLuma.length; i += batchSize) {
        const batch = usersWithLuma.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(user => this.syncUserEvents(user.id))
        );

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < usersWithLuma.length) {
          await this.delay(1000);
        }
      }

    } catch (error) {
      console.error('Error in syncAllUsersEvents:', error);
    }
  }

  /**
   * Sync events for a specific user
   * @param {string} userId - Database user ID
   */
  async syncUserEvents(userId) {
    try {
      console.log(`🔄 Syncing events for user: ${userId}`);

      const lumaClient = await createLumaClientForUser(userId);
      
      // Get user's last sync time to only fetch recent events
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          lastEventSyncAt: true,
          walletAddress: true 
        }
      });

      let allEvents = [];
      let hasMore = true;
      let cursor = null;

      // Fetch all events (paginated)
      while (hasMore) {
        const result = await lumaClient.getEvents({
          limit: 50,
          after: cursor,
          status: 'published' // Only get published events
        });

        if (!result.success) {
          throw new Error(`Luma API error: ${result.error}`);
        }

        allEvents = allEvents.concat(result.events);
        hasMore = result.pagination.has_more;
        cursor = result.pagination.next_cursor;

        // Break if we've fetched enough or hit API limits
        if (allEvents.length >= 200) {
          break;
        }
      }

      console.log(`📥 Fetched ${allEvents.length} events from Luma for user ${userId}`);

      let newEvents = 0;
      let updatedEvents = 0;
      let errors = 0;

      // Process each event
      for (const lumaEvent of allEvents) {
        try {
          const eventData = transformLumaEvent(lumaEvent, userId);
          
          // Check if event already exists
          const existingEvent = await prisma.event.findUnique({
            where: { lumaEventId: lumaEvent.event_id }
          });

          if (existingEvent) {
            // Update existing event if data has changed
            const hasChanges = 
              existingEvent.name !== eventData.name ||
              existingEvent.description !== eventData.description ||
              existingEvent.startDate.getTime() !== eventData.startDate.getTime() ||
              existingEvent.location !== eventData.location ||
              existingEvent.imageUrl !== eventData.imageUrl;

            if (hasChanges) {
              await prisma.event.update({
                where: { id: existingEvent.id },
                data: {
                  name: eventData.name,
                  description: eventData.description,
                  startDate: eventData.startDate,
                  endDate: eventData.endDate,
                  location: eventData.location,
                  imageUrl: eventData.imageUrl,
                  lastSyncedAt: new Date(),
                  syncError: null
                }
              });
              updatedEvents++;
            }
          } else {
            // Create new event
            await prisma.event.create({
              data: {
                ...eventData,
                lastSyncedAt: new Date()
              }
            });
            newEvents++;
          }

        } catch (eventError) {
          console.error(`Error processing event ${lumaEvent.event_id}:`, eventError);
          
          // Log sync error for this event
          await prisma.event.upsert({
            where: { lumaEventId: lumaEvent.event_id },
            create: {
              ...transformLumaEvent(lumaEvent, userId),
              syncError: eventError.message,
              lastSyncedAt: new Date()
            },
            update: {
              syncError: eventError.message,
              lastSyncedAt: new Date()
            }
          });
          
          errors++;
        }
      }

      // Update user's last sync timestamp
      await prisma.user.update({
        where: { id: userId },
        data: { lastEventSyncAt: new Date() }
      });

      console.log(`✅ Event sync completed for user ${userId}: ${newEvents} new, ${updatedEvents} updated, ${errors} errors`);

      return {
        success: true,
        newEvents,
        updatedEvents,
        errors,
        totalProcessed: allEvents.length
      };

    } catch (error) {
      console.error(`❌ Event sync failed for user ${userId}:`, error);
      
      // Update user sync error
      await prisma.user.update({
        where: { id: userId },
        data: { 
          lastEventSyncAt: new Date(),
          syncError: error.message 
        }
      }).catch(dbError => {
        console.error('Failed to update user sync error:', dbError);
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Manually trigger sync for a specific user
   * @param {string} userId - Database user ID
   */
  async triggerUserSync(userId) {
    console.log(`🚀 Manual event sync triggered for user: ${userId}`);
    return await this.syncUserEvents(userId);
  }

  /**
   * Get sync status for all users
   */
  async getSyncStatus() {
    const users = await prisma.user.findMany({
      where: {
        lumaApiKey: { not: null },
        lumaConnectedAt: { not: null }
      },
      select: {
        id: true,
        walletAddress: true,
        lastEventSyncAt: true,
        syncError: true,
        _count: {
          select: {
            events: true
          }
        }
      }
    });

    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
      totalUsers: users.length,
      users: users.map(user => ({
        userId: user.id,
        walletAddress: user.walletAddress,
        lastSyncAt: user.lastEventSyncAt,
        syncError: user.syncError,
        eventCount: user._count.events,
        status: user.syncError ? 'error' : (user.lastEventSyncAt ? 'synced' : 'pending')
      }))
    };
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
const eventSyncService = new EventSyncService();

module.exports = {
  EventSyncService,
  eventSyncService
};