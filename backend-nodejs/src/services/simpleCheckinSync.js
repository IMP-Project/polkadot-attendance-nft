const { PrismaClient } = require('@prisma/client');
const { LumaClient } = require('./lumaClient');

const prisma = new PrismaClient();

class SimpleCheckinSync {
  constructor() {
    this.isRunning = false;
    this.syncInterval = null;
    this.intervalMs = 30000; // 30 seconds to avoid rate limits
  }

  start() {
    if (this.isRunning) {
      console.log('Simple check-in sync already running');
      return;
    }

    console.log('🔄 Starting simple check-in sync service...');
    this.isRunning = true;

    // Run initial sync
    this.syncCheckIns().catch(error => {
      console.error('Initial check-in sync failed:', error);
    });

    // Set up recurring sync
    this.syncInterval = setInterval(() => {
      this.syncCheckIns().catch(error => {
        console.error('Check-in sync failed:', error);
      });
    }, this.intervalMs);
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Simple check-in sync stopped');
  }

  async syncCheckIns() {
    try {
      console.log('🔄 Syncing check-ins from Luma...');
      
      // Get all events that need check-in sync
      const events = await prisma.event.findMany({
        where: {
          user: {
            lumaApiKey: { not: null },
            lumaConnectedAt: { not: null }
          }
        },
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
              lumaApiKey: true
            }
          }
        }
      });

      if (events.length === 0) {
        console.log('No events found for check-in sync');
        return;
      }

      for (const event of events) {
        await this.syncEventCheckIns(event);
        // Add delay between API calls to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }

      console.log(`✅ Check-in sync completed for ${events.length} events`);
    } catch (error) {
      console.error('Check-in sync error:', error);
    }
  }

  async syncEventCheckIns(event) {
    try {
      console.log(`🔍 Checking guests for event: ${event.name} (${event.lumaEventId})`);
      const lumaClient = new LumaClient(event.user.lumaApiKey);
      const result = await lumaClient.getEventGuests(event.lumaEventId);

      if (!result.success) {
        console.error(`❌ Failed to get guests for event ${event.name}:`, result.error);
        return;
      }

      console.log(`📋 Found ${result.guests.length} guests for ${event.name}`);
      
      let newCheckIns = 0;
      for (const guest of result.guests) {
        const isCheckedIn = guest.checked_in_at;
        const guestName = guest.name || guest.user?.name || 'Unknown';
        
        console.log(`👤 Guest: ${guestName} - Checked in: ${isCheckedIn ? 'YES' : 'NO'}`);
        if (isCheckedIn) {
          console.log(`🔍 Check-in time: ${isCheckedIn}`);
        }
        
        if (isCheckedIn) {
          const created = await this.upsertCheckIn(event, guest);
          if (created) newCheckIns++;
        }
      }

      if (newCheckIns > 0) {
        console.log(`✅ Found ${newCheckIns} new check-ins for ${event.name}`);
      } else {
        console.log(`ℹ️ No new check-ins for ${event.name}`);
      }

    } catch (error) {
      console.error(`Error syncing check-ins for event ${event.name}:`, error);
    }
  }

  async upsertCheckIn(event, guest) {
    try {
      // Create a unique ID for this check-in
      const lumaCheckInId = `${event.lumaEventId}-${guest.api_id}`;

      const existingCheckIn = await prisma.checkIn.findUnique({
        where: { lumaCheckInId }
      });

      if (existingCheckIn) {
        return false; // Already exists
      }

      const checkInData = {
        eventId: event.id,
        lumaCheckInId,
        attendeeName: guest.name || guest.user?.name || 'Unknown',
        attendeeEmail: guest.email || guest.user?.email || '',
        walletAddress: null, // We'll need to extract this from guest data if available
        checkedInAt: new Date(guest.checked_in_at || new Date()),
        location: event.location
      };

      await prisma.checkIn.create({
        data: checkInData
      });

      console.log(`✅ New check-in: ${guest.name} for ${event.name}`);
      return true;
    } catch (error) {
      console.error(`Failed to create check-in for ${guest.name}:`, error);
      return false;
    }
  }
}

const simpleCheckinSync = new SimpleCheckinSync();
module.exports = { simpleCheckinSync };