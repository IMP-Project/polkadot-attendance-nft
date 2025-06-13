const { PrismaClient } = require('@prisma/client');
const { LumaClient } = require('./lumaClient');

const prisma = new PrismaClient();

class SimpleEventSync {
  constructor() {
    this.isRunning = false;
    this.syncInterval = null;
    this.intervalMs = 30000; // 30 seconds to avoid rate limits
  }

  start() {
    if (this.isRunning) {
      console.log('Simple event sync already running');
      return;
    }

    console.log('🔄 Starting simple event sync service...');
    this.isRunning = true;

    // Run initial sync
    this.syncEvents().catch(error => {
      console.error('Initial event sync failed:', error);
    });

    // Set up recurring sync
    this.syncInterval = setInterval(() => {
      this.syncEvents().catch(error => {
        console.error('Event sync failed:', error);
      });
    }, this.intervalMs);
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Simple event sync stopped');
  }

  async syncEvents() {
    try {
      console.log('🔄 Syncing events from Luma...');
      
      // Get all users with Luma API keys
      const users = await prisma.user.findMany({
        where: {
          lumaApiKey: { not: null },
          lumaConnectedAt: { not: null }
        },
        select: {
          id: true,
          walletAddress: true,
          lumaApiKey: true
        }
      });

      if (users.length === 0) {
        console.log('No users with Luma integration found');
        return;
      }

      for (const user of users) {
        await this.syncUserEvents(user);
      }

      console.log(`✅ Event sync completed for ${users.length} users`);
    } catch (error) {
      console.error('Event sync error:', error);
    }
  }

  async syncUserEvents(user) {
    try {
      const lumaClient = new LumaClient(user.lumaApiKey);
      const result = await lumaClient.getEvents();

      if (!result.success) {
        console.error(`Failed to get events for user ${user.walletAddress}:`, result.error);
        return;
      }

      for (const eventWrapper of result.events) {
        const event = eventWrapper.event;
        await this.upsertEvent(user.id, event);
      }

      // Update last sync time
      await prisma.user.update({
        where: { id: user.id },
        data: { lastEventSyncAt: new Date() }
      });

    } catch (error) {
      console.error(`Error syncing events for user ${user.walletAddress}:`, error);
    }
  }

  async upsertEvent(userId, lumaEvent) {
    try {
      const eventData = {
        userId,
        lumaEventId: lumaEvent.api_id,
        name: lumaEvent.name || 'Untitled Event',
        description: lumaEvent.description || null,
        startDate: new Date(lumaEvent.start_at),
        endDate: lumaEvent.end_at ? new Date(lumaEvent.end_at) : null,
        location: lumaEvent.geo_address_json?.full_address || lumaEvent.timezone || null,
        imageUrl: lumaEvent.cover_url || null,
        lastSyncedAt: new Date()
      };

      await prisma.event.upsert({
        where: { lumaEventId: lumaEvent.api_id },
        update: {
          ...eventData,
          updatedAt: new Date()
        },
        create: eventData
      });

      console.log(`✅ Synced event: ${lumaEvent.name}`);
    } catch (error) {
      console.error(`Failed to upsert event ${lumaEvent.name}:`, error);
    }
  }
}

const simpleEventSync = new SimpleEventSync();
module.exports = { simpleEventSync };