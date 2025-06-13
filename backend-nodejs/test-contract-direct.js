#!/usr/bin/env node

/**
 * Direct Contract Method Test
 * 
 * Test the contract methods directly to debug connection issues
 */

const { blockchainService } = require('./src/services/blockchainService');

async function testContractMethods() {
  console.log('🧪 Testing Contract Methods Directly');
  console.log('=' .repeat(50));

  try {
    // Initialize blockchain service
    await blockchainService.ensureInitialized();
    console.log('✅ Blockchain service initialized');
    console.log(`   Signer: ${blockchainService.signer.address}`);
    console.log(`   Contract: ${process.env.CONTRACT_ADDRESS}`);
    
    // Test if contract is initialized
    if (!blockchainService.contract) {
      console.log('❌ Contract not initialized');
      return;
    }
    
    console.log('✅ Contract object exists');
    
    // List available methods
    console.log('\n📋 Available contract methods:');
    if (blockchainService.contract.query) {
      const methods = Object.keys(blockchainService.contract.query);
      console.log('   Query methods:', methods);
    } else {
      console.log('   No query methods available');
    }
    
    if (blockchainService.contract.tx) {
      const txMethods = Object.keys(blockchainService.contract.tx);
      console.log('   Transaction methods:', txMethods);
    } else {
      console.log('   No transaction methods available');
    }
    
    // Test getNftCount method
    console.log('\n🔢 Testing getNftCount method...');
    try {
      const { output } = await blockchainService.contract.query.getNftCount(
        blockchainService.signer.address,
        { gasLimit: -1 }
      );
      
      console.log('✅ Method call succeeded');
      console.log('   Raw output:', output);
      console.log('   Output JSON:', output.toJSON());
      
      if (output && !output.isEmpty) {
        const result = output.toJSON();
        console.log('   Parsed result:', result);
        if (result.ok !== undefined) {
          console.log(`   NFT Count: ${result.ok}`);
        } else {
          console.log('   No .ok field in result');
        }
      } else {
        console.log('   Output is empty or null');
      }
    } catch (error) {
      console.error('❌ get_nft_count failed:', error.message);
      console.error('   Full error:', error);
    }
    
    // Test getEventCount method  
    console.log('\n📅 Testing getEventCount method...');
    try {
      const { output } = await blockchainService.contract.query.getEventCount(
        blockchainService.signer.address,
        { gasLimit: -1 }
      );
      
      console.log('✅ Method call succeeded');
      const result = output.toJSON();
      console.log('   Event Count result:', result);
    } catch (error) {
      console.error('❌ get_event_count failed:', error.message);
    }

    // Test gas estimation
    console.log('\n⛽ Testing gas estimation for mint_nft...');
    try {
      const { output } = await blockchainService.contract.query.mint_nft(
        blockchainService.signer.address,
        { gasLimit: -1 },
        "test-event-123", // event_id
        blockchainService.signer.address, // recipient
        '{"test": "metadata"}' // metadata
      );
      
      console.log('✅ Gas estimation succeeded');
      console.log('   Result:', output.toJSON());
    } catch (error) {
      console.error('❌ Gas estimation failed:', error.message);
    }

    console.log('\n🎉 Contract method testing completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testContractMethods().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { testContractMethods };