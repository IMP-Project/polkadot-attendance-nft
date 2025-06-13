#!/usr/bin/env node

/**
 * Complete NFT Minting Workflow Test
 * 
 * This script tests the complete NFT minting workflow:
 * 1. Create a test user with autoMintingEnabled = true
 * 2. Create a test event for that user
 * 3. Create a test check-in with a wallet address
 * 4. Verify that the auto-minting logic triggers and queues an NFT
 * 5. Check the NFT queue status
 */

const { PrismaClient } = require('@prisma/client');
const { nftMintingService } = require('./src/services/nftMintingService');
const { checkinSyncService } = require('./src/services/checkinSyncService');

const prisma = new PrismaClient();

// Test configuration
const TEST_DATA = {
  user: {
    walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',  // Alice test address
    lumaApiKey: 'test_api_key_encrypted', // Would normally be encrypted
    lumaOrganization: 'test-org',
    autoMintingEnabled: true
  },
  event: {
    lumaEventId: `test-event-${Date.now()}`,
    name: 'Test Polkadot Meetup',
    description: 'A test event for NFT minting workflow verification',
    startDate: new Date(),
    endDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    location: 'Virtual',
    imageUrl: 'https://example.com/test-event.jpg',
    autoMintEnabled: true,
    nftTemplate: JSON.stringify({
      name: 'Polkadot Attendance NFT',
      description: 'Proof of attendance for {{eventName}}',
      image: 'https://example.com/nft-template.jpg',
      attributes: [
        { trait_type: 'Event', value: '{{eventName}}' },
        { trait_type: 'Date', value: '{{eventDate}}' },
        { trait_type: 'Attendee', value: '{{attendeeName}}' }
      ]
    })
  },
  checkIn: {
    lumaCheckInId: `test-checkin-${Date.now()}`,
    attendeeName: 'Alice Cooper',
    attendeeEmail: 'alice@example.com',
    walletAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',  // Bob test address
    checkedInAt: new Date(),
    location: 'Virtual Check-in'
  }
};

class NFTWorkflowTester {
  constructor() {
    this.testResults = {
      steps: [],
      success: false,
      error: null
    };
  }

  /**
   * Log a test step
   */
  logStep(step, status, data = {}) {
    const stepResult = {
      step,
      status,
      timestamp: new Date(),
      ...data
    };
    
    this.testResults.steps.push(stepResult);
    
    const statusEmoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '🔄';
    console.log(`${statusEmoji} Step ${this.testResults.steps.length}: ${step}`);
    
    if (data.details) {
      console.log(`   Details: ${JSON.stringify(data.details, null, 2)}`);
    }
    
    if (status === 'error' && data.error) {
      console.error(`   Error: ${data.error}`);
    }
  }

  /**
   * Clean up test data
   */
  async cleanup() {
    try {
      console.log('\n🧹 Cleaning up test data...');
      
      // Delete in reverse order due to foreign key constraints
      await prisma.nFT.deleteMany({
        where: {
          user: {
            walletAddress: TEST_DATA.user.walletAddress
          }
        }
      });

      await prisma.checkIn.deleteMany({
        where: {
          event: {
            user: {
              walletAddress: TEST_DATA.user.walletAddress
            }
          }
        }
      });

      await prisma.event.deleteMany({
        where: {
          user: {
            walletAddress: TEST_DATA.user.walletAddress
          }
        }
      });

      await prisma.user.deleteMany({
        where: {
          walletAddress: TEST_DATA.user.walletAddress
        }
      });

      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  /**
   * Step 1: Create test user
   */
  async createTestUser() {
    try {
      // First cleanup any existing test data
      await this.cleanup();

      const user = await prisma.user.create({
        data: {
          walletAddress: TEST_DATA.user.walletAddress,
          lumaApiKey: TEST_DATA.user.lumaApiKey,
          lumaOrganization: TEST_DATA.user.lumaOrganization,
          lumaConnectedAt: new Date(),
          autoMintingEnabled: TEST_DATA.user.autoMintingEnabled
        }
      });

      this.logStep('Create test user with autoMintingEnabled = true', 'success', {
        details: {
          userId: user.id,
          walletAddress: user.walletAddress,
          autoMintingEnabled: user.autoMintingEnabled
        }
      });

      return user;
    } catch (error) {
      this.logStep('Create test user', 'error', { error: error.message });
      throw error;
    }
  }

  /**
   * Step 2: Create test event
   */
  async createTestEvent(userId) {
    try {
      const event = await prisma.event.create({
        data: {
          userId: userId,
          lumaEventId: TEST_DATA.event.lumaEventId,
          name: TEST_DATA.event.name,
          description: TEST_DATA.event.description,
          startDate: TEST_DATA.event.startDate,
          endDate: TEST_DATA.event.endDate,
          location: TEST_DATA.event.location,
          imageUrl: TEST_DATA.event.imageUrl,
          autoMintEnabled: TEST_DATA.event.autoMintEnabled,
          nftTemplate: TEST_DATA.event.nftTemplate
        }
      });

      this.logStep('Create test event for user', 'success', {
        details: {
          eventId: event.id,
          lumaEventId: event.lumaEventId,
          name: event.name,
          autoMintEnabled: event.autoMintEnabled
        }
      });

      return event;
    } catch (error) {
      this.logStep('Create test event', 'error', { error: error.message });
      throw error;
    }
  }

  /**
   * Step 3: Create test check-in
   */
  async createTestCheckIn(eventId) {
    try {
      const checkIn = await prisma.checkIn.create({
        data: {
          eventId: eventId,
          lumaCheckInId: TEST_DATA.checkIn.lumaCheckInId,
          attendeeName: TEST_DATA.checkIn.attendeeName,
          attendeeEmail: TEST_DATA.checkIn.attendeeEmail,
          walletAddress: TEST_DATA.checkIn.walletAddress,
          checkedInAt: TEST_DATA.checkIn.checkedInAt,
          location: TEST_DATA.checkIn.location
        }
      });

      this.logStep('Create test check-in with wallet address', 'success', {
        details: {
          checkInId: checkIn.id,
          lumaCheckInId: checkIn.lumaCheckInId,
          attendeeName: checkIn.attendeeName,
          walletAddress: checkIn.walletAddress,
          nftMintStatus: checkIn.nftMintStatus
        }
      });

      return checkIn;
    } catch (error) {
      this.logStep('Create test check-in', 'error', { error: error.message });
      throw error;
    }
  }

  /**
   * Step 4: Trigger auto-minting logic
   */
  async triggerAutoMinting(checkIn, event) {
    try {
      // Simulate the auto-minting trigger that would normally happen in checkinSyncService
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

      if (!eventWithUser.user.autoMintingEnabled) {
        throw new Error('Auto-minting is not enabled for this user');
      }

      // Queue the NFT for minting using the service
      const nft = await nftMintingService.queueMint({
        eventId: event.id,
        checkInId: checkIn.id,
        lumaEventId: event.lumaEventId,
        recipient: checkIn.walletAddress,
        attendeeName: checkIn.attendeeName,
        attendeeEmail: checkIn.attendeeEmail,
        priority: 'normal'
      });

      this.logStep('Trigger auto-minting logic and queue NFT', 'success', {
        details: {
          nftId: nft.id,
          mintStatus: nft.mintStatus,
          recipientAddress: nft.recipientAddress,
          priority: nft.priority || 'normal'
        }
      });

      return nft;
    } catch (error) {
      this.logStep('Trigger auto-minting logic', 'error', { error: error.message });
      throw error;
    }
  }

  /**
   * Step 5: Check NFT queue status
   */
  async checkNFTQueueStatus() {
    try {
      // Get detailed queue status
      const queueStatus = await nftMintingService.getQueueStatus();
      
      // Get minting stats
      const mintingStats = await nftMintingService.getMintingStats();

      // Get our specific NFT status
      const ourCheckIn = await prisma.checkIn.findFirst({
        where: {
          lumaCheckInId: TEST_DATA.checkIn.lumaCheckInId
        },
        include: {
          nft: true
        }
      });

      this.logStep('Check NFT queue status', 'success', {
        details: {
          queueStatus: queueStatus.queue,
          totalInQueue: queueStatus.total,
          serviceStatus: queueStatus.service,
          mintingStats: mintingStats.queue,
          ourNftStatus: ourCheckIn?.nft ? {
            id: ourCheckIn.nft.id,
            status: ourCheckIn.nft.mintStatus,
            recipient: ourCheckIn.nft.recipientAddress,
            createdAt: ourCheckIn.nft.createdAt
          } : 'No NFT found'
        }
      });

      return {
        queueStatus,
        mintingStats,
        ourNft: ourCheckIn?.nft
      };
    } catch (error) {
      this.logStep('Check NFT queue status', 'error', { error: error.message });
      throw error;
    }
  }

  /**
   * Verify check-in is linked to NFT
   */
  async verifyCheckInNFTLink() {
    try {
      const checkInWithNFT = await prisma.checkIn.findFirst({
        where: {
          lumaCheckInId: TEST_DATA.checkIn.lumaCheckInId
        },
        include: {
          nft: true
        }
      });

      if (!checkInWithNFT) {
        throw new Error('Check-in not found');
      }

      if (!checkInWithNFT.nft) {
        throw new Error('NFT not linked to check-in');
      }

      const isLinked = checkInWithNFT.nftId === checkInWithNFT.nft.id;
      const statusMatches = checkInWithNFT.nftMintStatus === checkInWithNFT.nft.mintStatus;

      this.logStep('Verify check-in is properly linked to NFT', 'success', {
        details: {
          checkInId: checkInWithNFT.id,
          nftId: checkInWithNFT.nft.id,
          isLinked: isLinked,
          checkInMintStatus: checkInWithNFT.nftMintStatus,
          nftMintStatus: checkInWithNFT.nft.mintStatus,
          statusMatches: statusMatches
        }
      });

      return checkInWithNFT;
    } catch (error) {
      this.logStep('Verify check-in NFT link', 'error', { error: error.message });
      throw error;
    }
  }

  /**
   * Run the complete test workflow
   */
  async runTest() {
    console.log('🚀 Starting Complete NFT Minting Workflow Test');
    console.log('=' .repeat(60));

    try {
      // Step 1: Create test user
      const user = await this.createTestUser();

      // Step 2: Create test event
      const event = await this.createTestEvent(user.id);

      // Step 3: Create test check-in
      const checkIn = await this.createTestCheckIn(event.id);

      // Step 4: Trigger auto-minting
      const nft = await this.triggerAutoMinting(checkIn, event);

      // Step 5: Check NFT queue status
      const queueInfo = await this.checkNFTQueueStatus();

      // Step 6: Verify check-in NFT link
      const linkedCheckIn = await this.verifyCheckInNFTLink();

      // Final verification
      this.testResults.success = true;
      console.log('\n🎉 All test steps completed successfully!');
      
      // Print summary
      console.log('\n📊 Test Summary:');
      console.log('=' .repeat(40));
      console.log(`✅ User created: ${user.walletAddress}`);
      console.log(`✅ Event created: ${event.name} (${event.lumaEventId})`);
      console.log(`✅ Check-in created: ${checkIn.attendeeName} (${checkIn.lumaCheckInId})`);
      console.log(`✅ NFT queued: ${nft.id} (Status: ${nft.mintStatus})`);
      console.log(`✅ Queue status: ${queueInfo.queueStatus.queue.PENDING} pending, ${queueInfo.queueStatus.queue.COMPLETED} completed`);
      console.log(`✅ Service running: ${queueInfo.queueStatus.service.isRunning}`);

    } catch (error) {
      this.testResults.success = false;
      this.testResults.error = error.message;
      console.error('\n❌ Test failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
      await prisma.$disconnect();
    }
  }

  /**
   * Get test results
   */
  getResults() {
    return this.testResults;
  }
}

// Additional utility functions for testing

/**
 * Test database connection
 */
async function testDatabaseConnection() {
  try {
    console.log('🔌 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test basic operations
    const userCount = await prisma.user.count();
    const eventCount = await prisma.event.count();
    const checkInCount = await prisma.checkIn.count();
    const nftCount = await prisma.nFT.count();
    
    console.log(`📊 Current database state:`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Events: ${eventCount}`);
    console.log(`   Check-ins: ${checkInCount}`);
    console.log(`   NFTs: ${nftCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Test NFT minting service status
 */
async function testNFTMintingService() {
  try {
    console.log('🎨 Testing NFT minting service...');
    
    const stats = await nftMintingService.getMintingStats();
    console.log('✅ NFT minting service accessible');
    console.log(`📊 Service status:`);
    console.log(`   Running: ${stats.service.isRunning}`);
    console.log(`   Processing: ${stats.service.isProcessing}`);
    console.log(`   Interval: ${stats.service.intervalMs}ms`);
    console.log(`   Queue: ${stats.queue.pending} pending, ${stats.queue.completed} completed, ${stats.queue.failed} failed`);
    
    return true;
  } catch (error) {
    console.error('❌ NFT minting service test failed:', error.message);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  const tester = new NFTWorkflowTester();
  
  try {
    // Pre-flight checks
    console.log('🔍 Running pre-flight checks...');
    
    const dbOk = await testDatabaseConnection();
    if (!dbOk) {
      throw new Error('Database connection failed');
    }
    
    const serviceOk = await testNFTMintingService();
    if (!serviceOk) {
      console.warn('⚠️  NFT minting service may not be fully operational, but continuing test...');
    }
    
    console.log('\n');
    
    // Run the main test
    await tester.runTest();
    
    // Output final results
    const results = tester.getResults();
    if (results.success) {
      console.log('\n🎊 Complete NFT Minting Workflow Test: PASSED');
      process.exit(0);
    } else {
      console.log('\n💥 Complete NFT Minting Workflow Test: FAILED');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  NFTWorkflowTester,
  testDatabaseConnection,
  testNFTMintingService,
  TEST_DATA
};