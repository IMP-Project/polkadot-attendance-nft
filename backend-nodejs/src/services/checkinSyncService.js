const { PrismaClient } = require('@prisma/client');
const { createLumaClientForUser, transformLumaCheckIn } = require('./lumaClient');
const { nftMintingService } = require('./nftMintingService');

const prisma = new PrismaClient();

class CheckInSyncService {
  constructor() {
    this.isRunning = false;
    this.syncInterval = null;
    this.intervalMs = parseInt(process.env.CHECKIN_POLL_INTERVAL) || 5000; // 5 seconds default
  }

  /**
   * Start the check-in polling service
   */
  start() {
    if (this.isRunning) {
      console.log('Check-in sync service is already running');
      return;
    }

    console.log(`🔄 Starting check-in sync service (${this.intervalMs}ms intervals)`);
    this.isRunning = true;

    // Run initial sync
    this.syncAllUsersCheckIns().catch(error => {
      console.error('Initial check-in sync failed:', error);
    });

    // Set up recurring sync
    this.syncInterval = setInterval(() => {
      this.syncAllUsersCheckIns().catch(error => {
        console.error('Scheduled check-in sync failed:', error);
      });
    }, this.intervalMs);
  }

  /**
   * Stop the check-in polling service
   */
  stop() {
    if (!this.isRunning) {
      console.log('Check-in sync service is not running');
      return;
    }

    console.log('🛑 Stopping check-in sync service');
    this.isRunning = false;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Sync check-ins for all users who have Luma integration
   */
  async syncAllUsersCheckIns() {
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

      console.log(`🔄 Syncing check-ins for ${usersWithLuma.length} users`);

      // Process users in parallel but limit concurrency to avoid rate limits
      const batchSize = 2;
      for (let i = 0; i < usersWithLuma.length; i += batchSize) {
        const batch = usersWithLuma.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(user => this.syncUserCheckIns(user.id))
        );

        // Small delay between batches
        if (i + batchSize < usersWithLuma.length) {
          await this.delay(500);
        }
      }

    } catch (error) {
      console.error('Error in syncAllUsersCheckIns:', error);
    }
  }

  /**
   * Sync check-ins for a specific user
   * @param {string} userId - Database user ID
   */
  async syncUserCheckIns(userId) {
    try {
      console.log(`🔄 Syncing check-ins for user: ${userId}`);

      const lumaClient = await createLumaClientForUser(userId);
      
      // Get user's events to sync check-ins for
     // NEW CODE (FIXED)
const userEvents = await prisma.event.findMany({
  where: { 
    lumaEventId: { not: null } // Find all events that came from Luma
  },
  select: {
    id: true,
    lumaEventId: true,
    name: true,
    lastCheckInSyncAt: true
  }
});

      if (userEvents.length === 0) {
        console.log(`No events found for user ${userId}`);
        return { success: true, message: 'No events to sync' };
      }

      let totalNewCheckIns = 0;
      let totalUpdatedCheckIns = 0;
      let totalErrors = 0;

      // Sync check-ins for each event
      for (const event of userEvents) {
        try {
          const result = await this.syncEventCheckIns(lumaClient, event);
          totalNewCheckIns += result.newCheckIns;
          totalUpdatedCheckIns += result.updatedCheckIns;
          totalErrors += result.errors;

        } catch (eventError) {
          console.error(`Error syncing check-ins for event ${event.lumaEventId}:`, eventError);
          
          // Update event sync error
          await prisma.event.update({
            where: { id: event.id },
            data: {
              lastCheckInSyncAt: new Date(),
              syncError: eventError.message
            }
          });
          
          totalErrors++;
        }
      }

      // Update user's last check-in sync timestamp
      await prisma.user.update({
        where: { id: userId },
        data: { lastCheckInSyncAt: new Date() }
      });

      console.log(`✅ Check-in sync completed for user ${userId}: ${totalNewCheckIns} new, ${totalUpdatedCheckIns} updated, ${totalErrors} errors`);

      return {
        success: true,
        newCheckIns: totalNewCheckIns,
        updatedCheckIns: totalUpdatedCheckIns,
        errors: totalErrors,
        eventsProcessed: userEvents.length
      };

    } catch (error) {
      console.error(`❌ Check-in sync failed for user ${userId}:`, error);
      
      // Update user sync error
      await prisma.user.update({
        where: { id: userId },
        data: { 
          lastCheckInSyncAt: new Date(),
          checkInSyncError: error.message 
        }
      }).catch(dbError => {
        console.error('Failed to update user check-in sync error:', dbError);
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync check-ins for a specific event
   * @param {LumaClient} lumaClient - Configured Luma client
   * @param {Object} event - Event object from database
   */
  async syncEventCheckIns(lumaClient, event) {
    console.log(`📥 Fetching check-ins for event: ${event.name} (${event.lumaEventId})`);

    let allCheckIns = [];
    let hasMore = true;
    let cursor = null;

    // Fetch all check-ins for this event (paginated)
    while (hasMore) {
      const result = await lumaClient.getEventCheckIns(event.lumaEventId, {
        limit: 50,
        after: cursor
      });

      if (!result.success) {
        throw new Error(`Luma API error for event ${event.lumaEventId}: ${result.error}`);
      }

      allCheckIns = allCheckIns.concat(result.checkins);
      hasMore = result.pagination.has_more;
      cursor = result.pagination.next_cursor;

      // Break if we've fetched enough
      if (allCheckIns.length >= 500) {
        break;
      }
    }

    console.log(`📥 Fetched ${allCheckIns.length} check-ins for event ${event.lumaEventId}`);

    let newCheckIns = 0;
    let updatedCheckIns = 0;
    let errors = 0;

    // Process each check-in
    for (const lumaCheckIn of allCheckIns) {
      try {
        const checkInData = transformLumaCheckIn(lumaCheckIn, event.id);
        
        // Check if check-in already exists
        const existingCheckIn = await prisma.checkIn.findUnique({
          where: { lumaCheckInId: lumaCheckIn.checkin_id }
        });

        if (existingCheckIn) {
          // Update existing check-in if data has changed
          const hasChanges = 
            existingCheckIn.attendeeName !== checkInData.attendeeName ||
            existingCheckIn.attendeeEmail !== checkInData.attendeeEmail ||
            existingCheckIn.checkedInAt.getTime() !== checkInData.checkedInAt.getTime() ||
            existingCheckIn.location !== checkInData.location;

          if (hasChanges) {
            await prisma.checkIn.update({
              where: { id: existingCheckIn.id },
              data: {
                attendeeName: checkInData.attendeeName,
                attendeeEmail: checkInData.attendeeEmail,
                checkedInAt: checkInData.checkedInAt,
                location: checkInData.location
              }
            });
            updatedCheckIns++;
          }
        } else {
          // Create new check-in
          const newCheckIn = await prisma.checkIn.create({
            data: checkInData
          });
          newCheckIns++;

          // Trigger auto-minting for new check-in
          await this.triggerAutoMint(newCheckIn, event);
        }

      } catch (checkInError) {
        console.error(`Error processing check-in ${lumaCheckIn.checkin_id}:`, checkInError);
        errors++;
      }
    }

    // Update event's last check-in sync timestamp
    await prisma.event.update({
      where: { id: event.id },
      data: {
        lastCheckInSyncAt: new Date(),
        syncError: null // Clear any previous sync errors
      }
    });

    console.log(`✅ Check-in sync completed for event ${event.lumaEventId}: ${newCheckIns} new, ${updatedCheckIns} updated, ${errors} errors`);

    return {
      newCheckIns,
      updatedCheckIns,
      errors,
      totalProcessed: allCheckIns.length
    };
  }

  /**
   * Manually trigger check-in sync for a specific user
   * @param {string} userId - Database user ID
   */
  async triggerUserSync(userId) {
    console.log(`🚀 Manual check-in sync triggered for user: ${userId}`);
    return await this.syncUserCheckIns(userId);
  }

  /**
   * Manually trigger check-in sync for a specific event
   * @param {string} eventId - Database event ID
   */
  async triggerEventSync(eventId) {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          user: {
            select: {
              id: true,
              lumaApiKey: true,
              lumaOrganization: true,
              lumaConnectedAt: true
            }
          }
        }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      if (!event.user.lumaApiKey || !event.user.lumaConnectedAt) {
        throw new Error('User does not have Luma integration configured');
      }

      console.log(`🚀 Manual check-in sync triggered for event: ${event.name}`);

      const lumaClient = await createLumaClientForUser(event.user.id);
      return await this.syncEventCheckIns(lumaClient, event);

    } catch (error) {
      console.error(`Failed to trigger event sync for ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Get sync status for check-ins
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
        lastCheckInSyncAt: true,
        checkInSyncError: true,
        _count: {
          select: {
            events: true
          }
        }
      }
    });

    const totalCheckIns = await prisma.checkIn.count();

    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
      totalUsers: users.length,
      totalCheckIns,
      users: users.map(user => ({
        userId: user.id,
        walletAddress: user.walletAddress,
        lastSyncAt: user.lastCheckInSyncAt,
        syncError: user.checkInSyncError,
        eventCount: user._count.events,
        status: user.checkInSyncError ? 'error' : (user.lastCheckInSyncAt ? 'synced' : 'pending')
      }))
    };
  }

  /**
   * Trigger auto-minting for a new check-in
   * @param {Object} checkIn - Check-in object from database
   * @param {Object} event - Event object from database
   */
  async triggerAutoMint(checkIn, event) {
    try {
      // Check if auto-minting is enabled for this event
      const eventWithUser = await prisma.event.findUnique({
        where: { id: event.id },
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
              autoMintingEnabled: true
            }
          }
        }
      });

      if (!eventWithUser || !eventWithUser.user.autoMintingEnabled) {
        console.log(`Auto-minting disabled for event ${event.lumaEventId}`);
        return;
      }

      // Check if attendee has a valid wallet address
      if (!checkIn.walletAddress) {
        console.log(`No wallet address for attendee ${checkIn.attendeeName} in event ${event.lumaEventId}`);
        return;
      }

      // Check if NFT already exists for this check-in
      const existingNft = await prisma.nFT.findFirst({
        where: {
          eventId: event.id,
          checkInId: checkIn.id
        }
      });

      if (existingNft) {
        console.log(`NFT already exists for check-in ${checkIn.id}`);
        return;
      }

      console.log(`🎨 Triggering auto-mint for ${checkIn.attendeeName} at ${event.name}`);

      // Queue the NFT for minting
      await nftMintingService.queueMint({
        eventId: event.id,
        checkInId: checkIn.id,
        lumaEventId: event.lumaEventId,
        recipient: checkIn.walletAddress,
        attendeeName: checkIn.attendeeName,
        attendeeEmail: checkIn.attendeeEmail,
        priority: 'normal'
      });

      console.log(`✅ Auto-mint queued for ${checkIn.attendeeName}`);

    } catch (error) {
      console.error(`❌ Failed to trigger auto-mint for check-in ${checkIn.id}:`, error);
    }
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
const checkinSyncService = new CheckInSyncService();

module.exports = {
  CheckInSyncService,
  checkinSyncService
};