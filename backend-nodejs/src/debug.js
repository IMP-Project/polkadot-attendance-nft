const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  console.log('=== USERS ===');
  const users = await prisma.user.findMany({
    select: { id: true, walletAddress: true, lumaConnectedAt: true }
  });
  users.forEach(u => console.log('User:', u.id, 'Wallet:', u.walletAddress, 'Luma:', !!u.lumaConnectedAt));
  
  console.log('\n=== EVENTS ===');
  const events = await prisma.event.findMany({
    select: { id: true, name: true, userId: true, lumaEventId: true }
  });
  events.forEach(e => console.log('Event:', e.name, 'User:', e.userId, 'Luma ID:', e.lumaEventId));
  
  await prisma.$disconnect();
}
checkData();