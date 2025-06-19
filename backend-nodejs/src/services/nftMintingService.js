const { PrismaClient } = require('@prisma/client');
const { contractService } = require('./contractService');
const { blockchainService } = require('./blockchainService');
const { emailService } = require('./emailService');

const prisma = new PrismaClient();

class NFTMintingService {
  constructor() {
    this.isProcessing = false;
    this.mintInterval = null;
    this.mintIntervalMs = 3000; // 3 seconds between mints
    this.maxRetries = 3;
    this.retryDelays = [5000, 15000, 30000]; // 5s, 15s, 30s
  }

  /**
   * Start the NFT minting service
   */
  async start() {
    if (this.mintInterval !== null) {
      console.log('NFT minting service is already running');
      return;
    }

    console.log('🎨 Starting NFT minting service...');
    
    // Initialize contract service
    console.log('🎨 Minting Step 1: Initializing contract service...');
    await contractService.initialize();
    console.log('✅ Minting Step 1: Contract service initialized');
    
    // Start processing pending mints
    console.log('🎨 Minting Step 2: Starting mint processing...');
    // Don't set isProcessing here - let processPendingMints handle it
    this.processPendingMints();
    console.log('✅ Minting Step 2: Mint processing started');
    
    // Set up interval for continuous processing
    console.log('🎨 Minting Step 3: Setting up processing interval...');
    this.mintInterval = setInterval(() => {
      if (!this.isProcessing) {
        this.processPendingMints();
      }
    }, this.mintIntervalMs);
    console.log('✅ Minting Step 3: Processing interval set');

    console.log('✅ NFT minting service started');
  }

  /**
   * Stop the NFT minting service
   */
  stop() {
    console.log('🛑 Stopping NFT minting service...');
    
    if (this.mintInterval) {
      clearInterval(this.mintInterval);
      this.mintInterval = null;
    }
    
    this.isProcessing = false;
    console.log('✅ NFT minting service stopped');
  }

  /**
   * Process pending NFT mints
   */
  async processPendingMints() {
    if (this.isProcessing) {
      console.log('🔄 processPendingMints: Already processing, skipping');
      return;
    }

    console.log('🔄 processPendingMints: Starting...');
    this.isProcessing = true;

    try {
      // Get pending NFTs to mint
      console.log('🔄 processPendingMints: Querying database for pending NFTs...');
      const pendingNfts = await prisma.nFT.findMany({
        where: {
          mintStatus: 'PENDING'
        },
        include: {
          event: true,
          checkin: true,
          user: true
        },
        orderBy: { createdAt: 'asc' },
        take: 10 // Process up to 10 at a time
      });

      console.log(`🔄 processPendingMints: Found ${pendingNfts.length} pending NFTs`);

      if (pendingNfts.length === 0) {
        console.log('🔄 processPendingMints: No pending NFTs, finishing');
        this.isProcessing = false;
        return;
      }

      console.log(`🔄 Processing ${pendingNfts.length} pending NFT mints...`);

      for (const nft of pendingNfts) {
        try {
          console.log(`🔄 processPendingMints: Processing NFT ${nft.id}...`);
          await this.mintNft(nft);
          
          // Add delay between mints to avoid overloading
          await this.delay(1000);
          
        } catch (error) {
          console.error(`❌ Error minting NFT ${nft.id}:`, error);
        }
      }

      console.log('🔄 processPendingMints: Completed processing all NFTs');

    } catch (error) {
      console.error('❌ Error processing pending mints:', error);
    } finally {
      this.isProcessing = false;
      console.log('🔄 processPendingMints: Finished');
    }
  }

  /**
   * Mint a single NFT
   * @param {Object} nft - NFT record from database
   */
  async mintNft(nft) {
    console.log(`🎨 Minting NFT ${nft.id} for event ${nft.event.name}...`);

    try {
      // Update status to processing
      await prisma.nFT.update({
        where: { id: nft.id },
        data: { 
          mintStatus: 'PROCESSING',
          updatedAt: new Date()
        }
      });

      // Check if can mint
      const canMintResult = await contractService.canMintNft(
        nft.event.lumaEventId,
        nft.recipientAddress
      );

      if (!canMintResult.canMint) {
        console.warn(`⚠️ Cannot mint NFT ${nft.id}: ${canMintResult.reason}`);
        
        await prisma.nFT.update({
          where: { id: nft.id },
          data: {
            mintStatus: 'FAILED',
            mintError: canMintResult.reason,
            updatedAt: new Date()
          }
        });
        
        return;
      }

      // Prepare metadata
      const metadata = contractService.prepareMetadata(
        nft.event,
        nft.checkin || { 
          attendeeName: 'Unknown',
          checkedInAt: nft.createdAt
        },
        nft.event.nftTemplate
      );

      // Store prepared metadata
      await prisma.nFT.update({
        where: { id: nft.id },
        data: {
          metadata: JSON.stringify(metadata),
          imageUrl: metadata.image
        }
      });

      // Estimate gas with fallback to fixed values
      console.log(`⛽ Estimating gas for NFT ${nft.id}...`);
      let gasEstimate;
      try {
        gasEstimate = await blockchainService.estimateGas('mintNft', [
          nft.event.lumaEventId,
          nft.recipientAddress,
          JSON.stringify(metadata)
        ]);
        console.log(`💰 Estimated fee: ${gasEstimate.estimatedFee.formatted}`);
      } catch (gasError) {
        console.log(`⚠️ Gas estimation failed, using fixed gas values: ${gasError.message}`);
        // Use fixed gas values by creating an API weight object like the UI
        const api = blockchainService.api;
        gasEstimate = {
          gasLimit: api.registry.createType('WeightV2', {
            refTime: 3_000_000_000, // 3B gas units
            proofSize: 200_000       // 200KB proof size
          }),
          estimatedFee: { formatted: '~0.003 AZERO (fixed)' }
        };
        console.log(`💰 Using fixed gas estimate: ${gasEstimate.estimatedFee.formatted}`);
      }

      // Execute mint transaction
      console.log(`📤 Submitting mint transaction for NFT ${nft.id}...`);
      const result = await contractService.executeMintTransaction(
        nft.event.lumaEventId,
        nft.recipientAddress,
        JSON.stringify(metadata),
        gasEstimate
      );

      console.log(`✅ NFT ${nft.id} minted successfully!`);
      console.log(`   Transaction: ${result.transactionHash}`);
      console.log(`   Contract NFT ID: ${result.nftId}`);
      console.log(`   Block: ${result.blockNumber}`);

      // Update NFT record with success
      await prisma.nFT.update({
        where: { id: nft.id },
        data: {
          mintStatus: 'COMPLETED',
          contractNftId: BigInt(result.nftId),
          transactionHash: result.transactionHash,
          blockNumber: BigInt(result.blockNumber),
          mintedAt: new Date(),
          mintError: null,
          updatedAt: new Date()
        }
      });

      // Update check-in if linked
      if (nft.checkin) {
        await prisma.checkIn.update({
          where: { id: nft.checkin.id },
          data: {
            nftMintStatus: 'COMPLETED',
            lastMintAttempt: new Date()
          }
        });
      }

      // Send success notification
      await this.sendMintNotification('success', {
        nft: nft,
        result: result,
        recipient: nft.recipientAddress,
        eventName: nft.event.name
      });

      // Send email notification if recipient email is available
      await this.sendEmailNotification('minted', {
        nft: nft,
        result: result,
        eventName: nft.event.name
      });

    } catch (error) {
      console.error(`❌ Failed to mint NFT ${nft.id}:`, error);
      
      // Increment attempts
      const attempts = (nft.mintAttempts || 0) + 1;
      
      // Determine if should retry
      const shouldRetry = attempts < this.maxRetries && this.isRetryableError(error);
      
      // Update NFT record with failure
      await prisma.nFT.update({
        where: { id: nft.id },
        data: {
          mintStatus: shouldRetry ? 'PENDING' : 'FAILED',
          mintError: error.message,
          mintAttempts: attempts,
          updatedAt: new Date()
        }
      });

      // Update check-in if linked
      if (nft.checkin) {
        await prisma.checkIn.update({
          where: { id: nft.checkin.id },
          data: {
            nftMintStatus: shouldRetry ? 'PENDING' : 'FAILED',
            mintError: error.message,
            mintAttempts: attempts,
            lastMintAttempt: new Date()
          }
        });
      }

      if (shouldRetry) {
        console.log(`🔄 Will retry NFT ${nft.id} (attempt ${attempts}/${this.maxRetries})`);
        // Send retry email notification
        await this.sendEmailNotification('retry', {
          nft: nft,
          error: error,
          attempts: attempts,
          eventName: nft.event.name
        });
      } else {
        console.error(`💥 NFT ${nft.id} permanently failed after ${attempts} attempts`);
        // Send permanent failure notification
        await this.sendMintNotification('permanent_failure', {
          nft: nft,
          error: error,
          attempts: attempts,
          eventName: nft.event.name
        });
        // Send failure email notification
        await this.sendEmailNotification('failed', {
          nft: nft,
          error: error,
          attempts: attempts,
          eventName: nft.event.name
        });
      }
    }
  }

  /**
   * Queue an NFT for minting
   * @param {Object} mintRequest - Mint request object
   */
  async queueMint(mintRequest) {
    try {
      const { 
        eventId, 
        checkInId, 
        lumaEventId, 
        recipient, 
        attendeeName, 
        attendeeEmail, 
        priority = 'normal' 
      } = mintRequest;

      // Validate input
      if (!eventId || !recipient || !lumaEventId) {
        throw new Error('Missing required fields for minting queue');
      }

      // Get event to extract userId
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { userId: true }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Validate recipient address
      if (!blockchainService.isValidAddress(recipient)) {
        throw new Error('Invalid recipient wallet address');
      }

      // Check for duplicate NFTs (multiple prevention strategies)
      const duplicateChecks = await Promise.all([
        // Check by event and check-in combination
        checkInId ? prisma.nFT.findFirst({
          where: {
            eventId: eventId,
            checkInId: checkInId
          }
        }) : null,
        
        // Check by event and recipient combination
        prisma.nFT.findFirst({
          where: {
            eventId: eventId,
            recipientAddress: recipient,
            mintStatus: { in: ['PENDING', 'PROCESSING', 'COMPLETED'] }
          }
        }),
        
        // Check by Luma event ID and recipient (cross-user protection)
        prisma.nFT.findFirst({
          where: {
            event: { lumaEventId: lumaEventId },
            recipientAddress: recipient,
            mintStatus: { in: ['PENDING', 'PROCESSING', 'COMPLETED'] }
          },
          include: { event: true }
        })
      ]);

      const [checkInDuplicate, recipientDuplicate, lumaEventDuplicate] = duplicateChecks;

      if (checkInDuplicate) {
        console.log(`NFT already exists for check-in ${checkInId}: ${checkInDuplicate.id}`);
        return checkInDuplicate;
      }

      if (recipientDuplicate) {
        console.log(`NFT already exists for recipient ${recipient} in event ${eventId}: ${recipientDuplicate.id}`);
        return recipientDuplicate;
      }

      if (lumaEventDuplicate) {
        console.log(`NFT already exists for recipient ${recipient} in Luma event ${lumaEventId}: ${lumaEventDuplicate.id}`);
        return lumaEventDuplicate;
      }

      // Create NFT record in PENDING status
      // Create NFT record in PENDING status
const nft = await prisma.nFT.create({
  data: {
    userId: event.userId,
    eventId: eventId,
    checkInId: checkInId,
    owner: recipient,  // ← ADD THIS LINE
    recipientAddress: recipient,
    contractNftId: BigInt(0), // Placeholder, will be updated when minted
    mintStatus: 'PENDING',
    metadata: JSON.stringify({
      lumaEventId,
      attendeeName,
      attendeeEmail,
      queuedAt: new Date().toISOString()
    })
  }
});

      // Update check-in status if provided
      if (checkInId) {
        await prisma.checkIn.update({
          where: { id: checkInId },
          data: {
            nftMintStatus: 'PENDING',
            nftId: nft.id
          }
        });
      }

      console.log(`✅ NFT queued for minting: ${nft.id} (${attendeeName} -> ${recipient})`);

      // Trigger immediate processing if service is idle
      if (!this.isProcessing) {
        setImmediate(() => this.processPendingMints());
      }

      return nft;

    } catch (error) {
      console.error('Failed to queue NFT for minting:', error);
      throw error;
    }
  }

  /**
   * Create NFT record for check-in
   * @param {Object} checkin - Check-in record with event
   */
  async createNftForCheckIn(checkin) {
    try {
      // Validate wallet address
      if (!checkin.walletAddress || !blockchainService.isValidAddress(checkin.walletAddress)) {
        console.warn(`⚠️ Invalid wallet address for check-in ${checkin.id}`);
        
        await prisma.checkIn.update({
          where: { id: checkin.id },
          data: {
            nftMintStatus: 'SKIPPED',
            mintError: 'Invalid or missing wallet address'
          }
        });
        
        return null;
      }

      // Check if NFT already exists
      const existingNft = await prisma.nFT.findFirst({
        where: {
          checkInId: checkin.id
        }
      });

      if (existingNft) {
        console.log(`NFT already exists for check-in ${checkin.id}`);
        return existingNft;
      }

      // Create NFT record
      const nft = await prisma.nFT.create({
        data: {
          userId: checkin.event.userId,
          eventId: checkin.eventId,
          checkInId: checkin.id,
          recipientAddress: checkin.walletAddress,
          contractNftId: BigInt(0), // Placeholder, will be updated when minted
          mintStatus: 'PENDING',
          metadata: JSON.stringify({
            checkinId: checkin.lumaCheckInId,
            attendeeName: checkin.attendeeName
          })
        }
      });

      // Update check-in
      await prisma.checkIn.update({
        where: { id: checkin.id },
        data: {
          nftMintStatus: 'PENDING',
          nftId: nft.id
        }
      });

      console.log(`📝 Created NFT record ${nft.id} for check-in ${checkin.id}`);
      return nft;

    } catch (error) {
      console.error(`Error creating NFT for check-in ${checkin.id}:`, error);
      
      await prisma.checkIn.update({
        where: { id: checkin.id },
        data: {
          nftMintStatus: 'FAILED',
          mintError: error.message
        }
      });
      
      throw error;
    }
  }

  /**
   * Retry failed NFT mint
   * @param {string} nftId - NFT ID to retry
   */
  async retryMint(nftId) {
    const nft = await prisma.nFT.findUnique({
      where: { id: nftId },
      include: {
        event: true,
        checkin: true
      }
    });

    if (!nft) {
      throw new Error('NFT not found');
    }

    if (nft.mintStatus !== 'FAILED') {
      throw new Error(`Cannot retry NFT in status: ${nft.mintStatus}`);
    }

    // Reset to pending
    await prisma.nFT.update({
      where: { id: nftId },
      data: {
        mintStatus: 'PENDING',
        mintError: null,
        mintAttempts: 0
      }
    });

    console.log(`🔄 NFT ${nftId} queued for retry`);
    
    // Process immediately if not already processing
    if (!this.isProcessing) {
      this.processPendingMints();
    }
  }

  /**
   * Get detailed minting status for a specific NFT
   * @param {string} nftId - NFT ID to check status
   */
  async getMintingStatus(nftId) {
    const nft = await prisma.nFT.findUnique({
      where: { id: nftId },
      include: {
        event: {
          select: {
            name: true,
            lumaEventId: true
          }
        },
        checkin: {
          select: {
            attendeeName: true,
            attendeeEmail: true,
            checkedInAt: true
          }
        }
      }
    });

    if (!nft) {
      return { found: false };
    }

    return {
      found: true,
      nft: {
        id: nft.id,
        status: nft.mintStatus,
        recipient: nft.recipientAddress,
        contractNftId: nft.contractNftId?.toString(),
        transactionHash: nft.transactionHash,
        blockNumber: nft.blockNumber?.toString(),
        attempts: nft.mintAttempts || 0,
        error: nft.mintError,
        createdAt: nft.createdAt,
        mintedAt: nft.mintedAt,
        event: nft.event,
        checkin: nft.checkin
      }
    };
  }

  /**
   * Get minting queue status
   */
  async getQueueStatus() {
    const [queueStats, recentNfts] = await Promise.all([
      prisma.nFT.groupBy({
        by: ['mintStatus'],
        _count: true
      }),
      prisma.nFT.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          event: {
            select: { name: true, lumaEventId: true }
          },
          checkin: {
            select: { attendeeName: true }
          }
        }
      })
    ]);

    const statusCounts = {
      PENDING: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      FAILED: 0
    };

    queueStats.forEach(stat => {
      statusCounts[stat.mintStatus] = stat._count;
    });

    return {
      queue: statusCounts,
      total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      recentNfts: recentNfts.map(nft => ({
        id: nft.id,
        status: nft.mintStatus,
        eventName: nft.event?.name,
        attendeeName: nft.checkin?.attendeeName,
        createdAt: nft.createdAt,
        mintedAt: nft.mintedAt
      })),
      service: {
        isRunning: this.mintInterval !== null,
        isProcessing: this.isProcessing,
        intervalMs: this.mintIntervalMs
      }
    };
  }

  /**
   * Get minting statistics
   */
  async getMintingStats() {
    try {
      // Check if NFT model exists in database
      let pending = 0, processing = 0, completed = 0, failed = 0;
      let contractStatus = { isConnected: false, error: 'Contract service unavailable' };

      try {
        // Test if NFT table exists by doing a simple count
        await prisma.nFT.findFirst();
        
        // If we reach here, table exists, get the counts
        [pending, processing, completed, failed] = await Promise.all([
          prisma.nFT.count({ where: { mintStatus: 'PENDING' } }),
          prisma.nFT.count({ where: { mintStatus: 'PROCESSING' } }),
          prisma.nFT.count({ where: { mintStatus: 'COMPLETED' } }),
          prisma.nFT.count({ where: { mintStatus: 'FAILED' } })
        ]);
      } catch (dbError) {
        console.log('NFT table not accessible, using default values:', dbError.message);
        // Use default values already set above
      }

      try {
        contractStatus = await contractService.getContractStatus();
      } catch (contractError) {
        console.log('Contract status unavailable:', contractError.message);
        contractStatus = { isConnected: false, error: contractError.message };
      }

      return {
        queue: {
          pending,
          processing,
          completed,
          failed,
          total: pending + processing + completed + failed
        },
        service: {
          isRunning: this.mintInterval !== null,
          isProcessing: this.isProcessing,
          intervalMs: this.mintIntervalMs
        },
        contract: contractStatus
      };
    } catch (error) {
      console.error('Error getting minting stats:', error);
      return {
        queue: {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          total: 0
        },
        service: {
          isRunning: this.mintInterval !== null,
          isProcessing: this.isProcessing,
          intervalMs: this.mintIntervalMs
        },
        contract: {
          isConnected: false,
          error: error.message
        }
      };
    }

    return {
      queue: {
        pending,
        processing,
        completed,
        failed,
        total: pending + processing + completed + failed
      },
      service: {
        isRunning: this.mintInterval !== null,
        isProcessing: this.isProcessing,
        intervalMs: this.mintIntervalMs
      },
      contract: contractStatus
    };
  }

  /**
   * Batch queue multiple NFTs for minting
   * @param {Array} mintRequests - Array of mint request objects
   */
  async batchQueueMints(mintRequests) {
    const results = {
      queued: [],
      duplicates: [],
      errors: []
    };

    console.log(`🔄 Batch queueing ${mintRequests.length} NFTs for minting...`);

    // Process requests in parallel but with limited concurrency
    const batchSize = 5;
    for (let i = 0; i < mintRequests.length; i += batchSize) {
      const batch = mintRequests.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (request, index) => {
          try {
            const nft = await this.queueMint(request);
            return { 
              index: i + index, 
              request, 
              nft, 
              status: 'queued' 
            };
          } catch (error) {
            if (error.message.includes('already exists')) {
              return { 
                index: i + index, 
                request, 
                error: error.message, 
                status: 'duplicate' 
              };
            }
            return { 
              index: i + index, 
              request, 
              error: error.message, 
              status: 'error' 
            };
          }
        })
      );

      // Process batch results
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          const { status, ...data } = result.value;
          if (status === 'queued') {
            results.queued.push(data);
          } else if (status === 'duplicate') {
            results.duplicates.push(data);
          } else {
            results.errors.push(data);
          }
        } else {
          results.errors.push({
            index: -1,
            error: result.reason.message || 'Unknown error'
          });
        }
      });

      // Small delay between batches to avoid overwhelming the system
      if (i + batchSize < mintRequests.length) {
        await this.delay(100);
      }
    }

    console.log(`✅ Batch queue completed: ${results.queued.length} queued, ${results.duplicates.length} duplicates, ${results.errors.length} errors`);

    return {
      summary: {
        total: mintRequests.length,
        queued: results.queued.length,
        duplicates: results.duplicates.length,
        errors: results.errors.length
      },
      results
    };
  }

  /**
   * Bulk mint NFTs for an entire event's check-ins
   * @param {string} eventId - Event ID to bulk mint for
   */
  async bulkMintForEvent(eventId) {
    try {
      console.log(`🚀 Starting bulk mint for event ${eventId}...`);

      // Get event and all its check-ins with wallet addresses
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          checkins: {
            where: {
              walletAddress: { not: null },
              nftMintStatus: { not: 'COMPLETED' }
            }
          },
          user: {
            select: { 
              autoMintingEnabled: true,
              email: true,
              name: true
            }
          }
        }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      if (event.checkins.length === 0) {
        return {
          success: true,
          message: 'No eligible check-ins found for minting',
          summary: { total: 0, queued: 0, duplicates: 0, errors: 0 }
        };
      }

      // Prepare mint requests
      const mintRequests = event.checkins.map(checkin => ({
        eventId: event.id,
        checkInId: checkin.id,
        lumaEventId: event.lumaEventId,
        recipient: checkin.walletAddress,
        attendeeName: checkin.attendeeName,
        attendeeEmail: checkin.attendeeEmail,
        priority: 'bulk'
      }));

      // Execute batch queue
      const batchResult = await this.batchQueueMints(mintRequests);

      console.log(`✅ Bulk mint queued for event ${event.name}: ${batchResult.summary.queued} NFTs`);

      // Send organizer summary if there were any successful mints
      if (batchResult.summary.queued > 0) {
        await this.sendOrganizerSummaryEmail(event, {
          totalAttendees: event.checkins.length,
          mintedNFTs: batchResult.summary.queued,
          pendingNFTs: 0, // These are just queued, so pending
          failedNFTs: batchResult.summary.errors
        });
      }

      return {
        success: true,
        event: {
          id: event.id,
          name: event.name,
          lumaEventId: event.lumaEventId
        },
        summary: batchResult.summary,
        details: batchResult.results
      };

    } catch (error) {
      console.error(`❌ Bulk mint failed for event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   */
  isRetryableError(error) {
    const message = error.message.toLowerCase();
    
    // Network errors
    if (message.includes('network') || 
        message.includes('timeout') ||
        message.includes('connection')) {
      return true;
    }
    
    // Nonce errors (can retry with new nonce)
    if (message.includes('nonce') || 
        message.includes('priority is too low')) {
      return true;
    }
    
    // Temporary blockchain issues
    if (message.includes('temporarily unavailable') ||
        message.includes('busy')) {
      return true;
    }
    
    // Non-retryable errors
    if (message.includes('insufficient balance') ||
        message.includes('invalid address') ||
        message.includes('already minted')) {
      return false;
    }
    
    // Default to retry for unknown errors
    return true;
  }

  /**
   * Send organizer summary email
   * @param {Object} event - Event object with user data
   * @param {Object} stats - Minting statistics
   */
  async sendOrganizerSummaryEmail(event, stats) {
    try {
      // Get organizer email from event user
      const organizerEmail = event.user?.email;
      const organizerName = event.user?.name || 'Event Organizer';

      if (!organizerEmail) {
        console.log(`📧 No organizer email available for event ${event.id}, skipping summary`);
        return;
      }

      console.log(`📧 Sending organizer summary email to ${organizerEmail} for event ${event.name}`);

      const emailResult = await emailService.sendOrganizerSummary({
        organizerEmail,
        organizerName,
        eventName: event.name,
        totalAttendees: stats.totalAttendees,
        mintedNFTs: stats.mintedNFTs,
        pendingNFTs: stats.pendingNFTs,
        failedNFTs: stats.failedNFTs,
        eventDate: event.startDate || event.createdAt
      });

      if (emailResult.success) {
        console.log(`✅ Organizer summary email sent successfully for event ${event.name}`);
      } else {
        console.log(`⚠️ Organizer summary email failed for event ${event.name}: ${emailResult.reason || emailResult.error}`);
      }

    } catch (error) {
      console.error(`❌ Error sending organizer summary email for event ${event.id}:`, error);
    }
  }

  /**
   * Send email notification for minting events
   * @param {string} type - Email type ('minted', 'retry', 'failed')
   * @param {Object} data - Notification data
   */
  async sendEmailNotification(type, data) {
    try {
      const { nft, result, error, eventName, attempts } = data;

      // Get recipient email from check-in or metadata
      let recipientEmail = null;
      let recipientName = 'Attendee';

      if (nft.checkin?.attendeeEmail) {
        recipientEmail = nft.checkin.attendeeEmail;
        recipientName = nft.checkin.attendeeName || 'Attendee';
      } else if (nft.metadata) {
        try {
          const metadata = typeof nft.metadata === 'string' ? JSON.parse(nft.metadata) : nft.metadata;
          recipientEmail = metadata.attendeeEmail;
          recipientName = metadata.attendeeName || 'Attendee';
        } catch (e) {
          console.log('Could not parse NFT metadata for email');
        }
      }

      if (!recipientEmail) {
        console.log(`📧 No email available for NFT ${nft.id}, skipping email notification`);
        return;
      }

      console.log(`📧 Sending ${type} email notification to ${recipientEmail} for NFT ${nft.id}`);

      let emailResult;
      switch (type) {
        case 'minted':
          emailResult = await emailService.sendNFTMintedNotification({
            recipientEmail,
            recipientName,
            eventName,
            nftId: nft.id,
            transactionHash: result.transactionHash,
            organizerName: nft.event?.user?.name || 'Event Organizer'
          });
          break;

        case 'retry':
          emailResult = await emailService.sendMintingStatusUpdate({
            recipientEmail,
            recipientName,
            eventName,
            status: 'retry',
            attempt: attempts,
            maxAttempts: this.maxRetries
          });
          break;

        case 'failed':
          emailResult = await emailService.sendMintingStatusUpdate({
            recipientEmail,
            recipientName,
            eventName,
            status: 'failed',
            errorMessage: error.message
          });
          break;

        default:
          console.log(`📧 Unknown email type: ${type}`);
          return;
      }

      if (emailResult.success) {
        console.log(`✅ Email notification sent successfully for NFT ${nft.id}`);
      } else {
        console.log(`⚠️ Email notification failed for NFT ${nft.id}: ${emailResult.reason || emailResult.error}`);
      }

    } catch (error) {
      console.error(`❌ Error sending email notification for NFT ${nft.id}:`, error);
    }
  }

  /**
   * Send minting notification
   * @param {string} type - Notification type ('success', 'retry', 'permanent_failure')
   * @param {Object} data - Notification data
   */
  async sendMintNotification(type, data) {
    try {
      const { nft, result, error, recipient, eventName, attempts } = data;

      // Create notification record
      const notification = {
        type: `nft_mint_${type}`,
        recipientAddress: recipient,
        eventName: eventName,
        nftId: nft.id,
        timestamp: new Date(),
        data: {}
      };

      switch (type) {
        case 'success':
          notification.title = '🎉 NFT Minted Successfully!';
          notification.message = `Your attendance NFT for "${eventName}" has been minted successfully.`;
          notification.data = {
            transactionHash: result.transactionHash,
            contractNftId: result.nftId,
            blockNumber: result.blockNumber
          };
          break;

        case 'retry':
          notification.title = '🔄 NFT Minting Retry';
          notification.message = `Retrying to mint your NFT for "${eventName}" (attempt ${attempts}/${this.maxRetries}).`;
          notification.data = {
            error: error.message,
            attempts: attempts
          };
          break;

        case 'permanent_failure':
          notification.title = '❌ NFT Minting Failed';
          notification.message = `Failed to mint your NFT for "${eventName}" after ${attempts} attempts. Please contact support.`;
          notification.data = {
            error: error.message,
            attempts: attempts,
            finalError: true
          };
          break;
      }

      // Store notification in database (if notification table exists)
      try {
        await prisma.notification.create({
          data: {
            ...notification,
            data: JSON.stringify(notification.data)
          }
        });
      } catch (dbError) {
        // If notification table doesn't exist, just log
        console.log('📢 Notification (DB unavailable):', notification.title);
      }

      // Log notification for debugging
      console.log(`📢 ${notification.title} - ${notification.message}`);

      // TODO: Add webhook/email notifications here
      // TODO: Add real-time notifications (WebSocket/SSE)

    } catch (error) {
      console.error('Failed to send mint notification:', error);
    }
  }

  /**
   * Get error statistics and health metrics
   */
  async getErrorStats() {
    try {
      const [errorStats, recentErrors] = await Promise.all([
        prisma.nFT.groupBy({
          by: ['mintError'],
          where: {
            mintStatus: 'FAILED',
            mintError: { not: null }
          },
          _count: true,
          orderBy: {
            _count: {
              mintError: 'desc'
            }
          },
          take: 10
        }),
        prisma.nFT.findMany({
          where: {
            mintStatus: 'FAILED',
            updatedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          },
          select: {
            id: true,
            mintError: true,
            mintAttempts: true,
            updatedAt: true,
            event: {
              select: { name: true }
            }
          },
          orderBy: { updatedAt: 'desc' },
          take: 20
        })
      ]);

      return {
        commonErrors: errorStats.map(stat => ({
          error: stat.mintError,
          count: stat._count
        })),
        recentErrors: recentErrors.map(nft => ({
          nftId: nft.id,
          error: nft.mintError,
          attempts: nft.mintAttempts,
          eventName: nft.event?.name,
          timestamp: nft.updatedAt
        })),
        healthMetrics: {
          errorRate24h: recentErrors.length,
          isHealthy: recentErrors.length < 10 // Less than 10 errors in 24h is healthy
        }
      };

    } catch (error) {
      console.error('Error getting error stats:', error);
      return {
        commonErrors: [],
        recentErrors: [],
        healthMetrics: {
          errorRate24h: 0,
          isHealthy: false,
          error: error.message
        }
      };
    }
  }

  /**
   * Circuit breaker implementation for blockchain operations
   */
  async executeWithCircuitBreaker(operation, context = 'unknown') {
    const maxFailures = 5;
    const resetTimeout = 30000; // 30 seconds

    // Check circuit breaker state
    const now = Date.now();
    if (this.circuitBreaker && this.circuitBreaker.failures >= maxFailures) {
      if (now - this.circuitBreaker.lastFailure < resetTimeout) {
        throw new Error(`Circuit breaker open for ${context}. Try again later.`);
      } else {
        // Reset circuit breaker
        this.circuitBreaker = null;
      }
    }

    try {
      const result = await operation();
      
      // Reset on success
      if (this.circuitBreaker) {
        this.circuitBreaker = null;
      }
      
      return result;
    } catch (error) {
      // Track failure
      if (!this.circuitBreaker) {
        this.circuitBreaker = { failures: 0, lastFailure: 0 };
      }
      
      this.circuitBreaker.failures++;
      this.circuitBreaker.lastFailure = now;
      
      throw error;
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
const nftMintingService = new NFTMintingService();

module.exports = {
  NFTMintingService,
  nftMintingService
};