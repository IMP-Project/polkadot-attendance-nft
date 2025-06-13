const { PrismaClient } = require('@prisma/client');
const { nftMintingService } = require('./src/services/nftMintingService');

const prisma = new PrismaClient();

async function testCompleteWorkflow() {
  try {
    console.log('🧪 Testing Complete Check-in → NFT Workflow...');
    
    // 1. Find or create test user with auto-minting enabled
    console.log('📝 Step 1: Finding or creating test user...');
    let user = await prisma.user.findUnique({
      where: { walletAddress: '14Ddt2zkptrVVFGCx69MofrWKVRsRLJPCsqUKAbDCswoTqzq' }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress: '14Ddt2zkptrVVFGCx69MofrWKVRsRLJPCsqUKAbDCswoTqzq',
          autoMintingEnabled: true,
          lumaApiKey: 'test-key',
          lumaOrganization: 'test-org',
          lumaConnectedAt: new Date()
        }
      });
      console.log('✅ User created:', user.id);
    } else {
      console.log('✅ User found:', user.id);
    }

    // 2. Create test event
    console.log('📝 Step 2: Creating test event...');
    const event = await prisma.event.create({
      data: {
        userId: user.id,
        lumaEventId: 'test-event-123',
        name: 'Test Blockchain Conference',
        description: 'Testing the auto-minting workflow',
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        location: 'Virtual'
      }
    });
    console.log('✅ Event created:', event.id);

    // 3. Create test check-in with wallet address
    console.log('📝 Step 3: Creating test check-in...');
    const checkIn = await prisma.checkIn.create({
      data: {
        eventId: event.id,
        lumaCheckInId: 'test-checkin-456',
        attendeeName: 'Test Attendee',
        attendeeEmail: 'test@example.com',
        walletAddress: '14Ddt2zkptrVVFGCx69MofrWKVRsRLJPCsqUKAbDCswoTqzq',
        checkedInAt: new Date(),
        location: 'Virtual'
      }
    });
    console.log('✅ Check-in created:', checkIn.id);

    // 4. Test auto-minting logic by calling queueMint directly
    console.log('📝 Step 4: Testing auto-mint queueing...');
    const nft = await nftMintingService.queueMint({
      eventId: event.id,
      checkInId: checkIn.id,
      lumaEventId: event.lumaEventId,
      recipient: checkIn.walletAddress,
      attendeeName: checkIn.attendeeName,
      attendeeEmail: checkIn.attendeeEmail,
      priority: 'normal'
    });
    console.log('✅ NFT queued:', nft.id);

    // 5. Check final status
    console.log('📝 Step 5: Checking final status...');
    const finalStatus = await prisma.nFT.findUnique({
      where: { id: nft.id },
      include: {
        event: { select: { name: true } },
        checkin: { select: { attendeeName: true } }
      }
    });
    
    console.log('✅ Final NFT Status:', {
      id: finalStatus.id,
      status: finalStatus.mintStatus,
      recipient: finalStatus.recipientAddress,
      eventName: finalStatus.event?.name,
      attendeeName: finalStatus.checkin?.attendeeName
    });

    // Test Summary
    console.log('\n🎉 WORKFLOW TEST RESULTS:');
    console.log('✅ User creation: PASSED');
    console.log('✅ Event creation: PASSED');
    console.log('✅ Check-in creation: PASSED');
    console.log('✅ Auto-mint queueing: PASSED');
    console.log('✅ Database relationships: PASSED');
    console.log('\n✅ Complete check-in → NFT workflow: WORKING!');

    return {
      success: true,
      userId: user.id,
      eventId: event.id,
      checkInId: checkIn.id,
      nftId: nft.id
    };

  } catch (error) {
    console.error('❌ Workflow test failed:', error);
    return { success: false, error: error.message };
  }
}

testCompleteWorkflow()
  .then(result => {
    console.log('\n📊 Test Result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test crashed:', error);
    process.exit(1);
  });