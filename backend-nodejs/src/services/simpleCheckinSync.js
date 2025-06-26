const { PrismaClient } = require('@prisma/client');
const { LumaClient } = require('./lumaClient');
const { nftMintingService } = require('./nftMintingService');

const prisma = new PrismaClient();

class SimpleCheckinSync {
  constructor() {
    this.isRunning = false;
    this.syncInterval = null;
    this.intervalMs = 5000; // 5 seconds for faster check-in detection
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
          const checkIn = await this.upsertCheckIn(event, guest);
          if (checkIn) {
            newCheckIns++;
            // Automatically queue NFT minting if wallet address is available
            if (checkIn.walletAddress) {
              console.log(`🔍 Debug NFT queueing for ${checkIn.attendeeName}:`, {
              checkInId: checkIn.id,
              walletAddress: checkIn.walletAddress,
              eventId: event.id,
              hasWallet: !!checkIn.walletAddress
});
              try {
                await nftMintingService.queueMint({
                  eventId: event.id,
                  checkInId: checkIn.id,
                  lumaEventId: event.lumaEventId,
                  recipient: checkIn.walletAddress,
                  owner: checkIn.walletAddress, 
                  attendeeName: checkIn.attendeeName,
                  attendeeEmail: checkIn.attendeeEmail,
                  priority: 'normal'
                });
                console.log(`🎨 NFT queued for ${checkIn.attendeeName} (${checkIn.walletAddress})`);
              } catch (mintError) {
                console.error(`❌ Failed to queue NFT for ${checkIn.attendeeName}:`, mintError);
              }
            }
          }
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

      // Debug logging - add this temporarily
console.log(`🔍 Processing check-in:`, {
  lumaCheckInId: lumaCheckInId,
  attendeeName: guest.name || guest.user?.name || 'Unknown',
  guestApiId: guest.api_id,
  hasCheckedInAt: !!guest.checked_in_at
});
      
      const existingCheckIn = await prisma.checkIn.findUnique({
        where: { lumaCheckInId }
      });

      // Add this debug line:
console.log(`🔍 Existing check-in found:`, !!existingCheckIn, existingCheckIn ? `(ID: ${existingCheckIn.id})` : '');

      // ADD THIS DEBUG CODE HERE:
    console.log(`🔍 Debug: Guest registration data for ${guest.name}:`, {
    hasRegistrationAnswers: !!guest.registration_answers,
    registrationAnswersLength: guest.registration_answers ? guest.registration_answers.length : 0,
    registrationAnswers: guest.registration_answers
  });

      if (existingCheckIn) {
        // Extract wallet address from current guest data (in case it was updated)
        let walletAddress = null;
        if (guest.registration_answers && Array.isArray(guest.registration_answers)) {
          const walletAnswer = guest.registration_answers.find(answer => 
            answer.label && (
              answer.label.toLowerCase().includes('polkadot') ||
              answer.label.toLowerCase().includes('wallet') ||
              answer.label.toLowerCase().includes('address')
            )
          );
          
          if (walletAnswer && walletAnswer.answer) {
            walletAddress = walletAnswer.answer.trim();
            console.log(`🔍 Found wallet address for ${guest.name}: ${walletAddress}`);
          }
        }

        // If we found a wallet address and the existing check-in doesn't have one
        // If we found a wallet address (always update if different or missing)
        if (walletAddress && (!existingCheckIn.walletAddress || existingCheckIn.walletAddress !== walletAddress)) {
          // Update the existing check-in with wallet address
          const updatedCheckIn = await prisma.checkIn.update({
            where: { id: existingCheckIn.id },
            data: {
              walletAddress: walletAddress,
              nftMintStatus: 'PENDING'
            }
          });
          
          console.log(`🔄 Updated existing check-in with wallet: ${existingCheckIn.attendeeName} (${walletAddress})`);
          return updatedCheckIn; // This will trigger NFT queueing
        }
        
        // Check if existing check-in needs NFT but doesn't have one yet
        if (existingCheckIn.walletAddress && existingCheckIn.nftMintStatus === 'PENDING') {
          const existingNft = await prisma.nFT.findFirst({
            where: { checkInId: existingCheckIn.id }
          });
          
          if (!existingNft) {
            console.log(`🔄 Existing check-in needs NFT: ${existingCheckIn.attendeeName}`);
            return existingCheckIn;
          }
        }
        
        return false; // Already processed
      }

      // Extract wallet address from registration answers
      let walletAddress = null;
      if (guest.registration_answers && Array.isArray(guest.registration_answers)) {
        const walletAnswer = guest.registration_answers.find(answer => 
          answer.label && (
            answer.label.toLowerCase().includes('polkadot') ||
            answer.label.toLowerCase().includes('wallet') ||
            answer.label.toLowerCase().includes('address')
          )
        );
        
        if (walletAnswer && walletAnswer.answer) {
          walletAddress = walletAnswer.answer.trim();
          console.log(`🔍 Found wallet address for ${guest.name}: ${walletAddress}`);
        }
      }

      const checkInData = {
        eventId: event.id,
        lumaCheckInId,
        attendeeName: guest.name || guest.user?.name || 'Unknown',
        attendeeEmail: guest.email || guest.user?.email || '',
        walletAddress: walletAddress,
        checkedInAt: new Date(guest.checked_in_at || new Date()),
        location: event.location,
        nftMintStatus: walletAddress ? 'PENDING' : 'SKIPPED'
      };

      const checkIn = await prisma.checkIn.create({
        data: checkInData
      });

      const walletInfo = walletAddress ? `(wallet: ${walletAddress})` : '(no wallet)';
      console.log(`✅ New check-in: ${guest.name} for ${event.name} ${walletInfo}`);
      return checkIn;
    } catch (error) {
      console.error(`Failed to create check-in for ${guest.name}:`, error);
      return false;
    }
  }
}

const simpleCheckinSync = new SimpleCheckinSync();
module.exports = { simpleCheckinSync };