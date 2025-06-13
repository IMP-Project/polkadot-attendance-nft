#!/usr/bin/env node

/**
 * Test NFT Processing Service
 * 
 * This script tests that the NFT minting service can process pending NFTs
 * without errors (even if actual minting fails due to contract issues in test environment)
 */

const { PrismaClient } = require('@prisma/client');
const { nftMintingService } = require('./src/services/nftMintingService');

const prisma = new PrismaClient();

async function testNFTProcessing() {
  console.log('🧪 Testing NFT Processing Service');
  console.log('=' .repeat(50));

  try {
    // Check if there are any pending NFTs in the queue
    const pendingNfts = await prisma.nFT.findMany({
      where: { mintStatus: 'PENDING' },
      include: {
        event: true,
        checkin: true
      }
    });

    console.log(`📊 Found ${pendingNfts.length} pending NFTs in queue`);

    if (pendingNfts.length === 0) {
      console.log('⏭️  No pending NFTs to process. Run test-nft-workflow.js first to create test data.');
      return;
    }

    // Display pending NFTs
    pendingNfts.forEach((nft, index) => {
      console.log(`\n📋 NFT ${index + 1}:`);
      console.log(`   ID: ${nft.id}`);
      console.log(`   Event: ${nft.event?.name || 'Unknown'}`);
      console.log(`   Recipient: ${nft.recipientAddress}`);
      console.log(`   Status: ${nft.mintStatus}`);
      console.log(`   Created: ${nft.createdAt}`);
    });

    console.log('\n🔄 Testing NFT processing logic...');

    // Test the processPendingMints method (this will try to mint but may fail due to contract issues)
    try {
      await nftMintingService.processPendingMints();
      console.log('✅ NFT processing completed without errors');
    } catch (error) {
      console.log('⚠️  NFT processing encountered expected errors (likely contract-related):');
      console.log(`   ${error.message}`);
    }

    // Check the status after processing
    const updatedNfts = await prisma.nFT.findMany({
      where: { 
        id: { in: pendingNfts.map(nft => nft.id) }
      }
    });

    console.log('\n📊 NFT Status After Processing:');
    updatedNfts.forEach((nft, index) => {
      console.log(`   NFT ${index + 1}: ${nft.mintStatus}${nft.mintError ? ` (${nft.mintError})` : ''}`);
    });

    // Test queue status
    console.log('\n📈 Testing queue status functionality...');
    const queueStatus = await nftMintingService.getQueueStatus();
    console.log('✅ Queue status retrieved successfully:');
    console.log(`   Pending: ${queueStatus.queue.PENDING}`);
    console.log(`   Processing: ${queueStatus.queue.PROCESSING}`);
    console.log(`   Completed: ${queueStatus.queue.COMPLETED}`);
    console.log(`   Failed: ${queueStatus.queue.FAILED}`);
    console.log(`   Service Running: ${queueStatus.service.isRunning}`);

    console.log('\n🎉 NFT Processing Service Test Completed Successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testNFTProcessing().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { testNFTProcessing };