# 🔑 Luma API Testing Guide

## ✅ System Status
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **Database**: PostgreSQL running on port 5432
- **All services**: Running via Docker Compose

## 🎯 Testing Workflow

### Step 1: Connect Your Wallet
1. Open http://localhost:3000
2. Click "Connect Wallet"
3. Enter your wallet address: `14Ddt2zkptrVVFGCx69MofrWKVRsRLJPCsqUKAbDCswoTqzq`

### Step 2: Configure Luma Integration
1. Go to **Settings** page
2. Find **Luma Integration** section
3. Enter your:
   - **Luma API Key**: [Your API key here]
   - **Organization**: [Your Luma organization slug]
4. Click **"Connect to Luma"**
5. Verify success message appears

### Step 3: Create Test Event in Luma
1. Go to your Luma dashboard
2. Create a new event
3. Add test attendees with wallet addresses (format: `14Ddt...`)

### Step 4: Watch Real-time Sync
1. Return to dapp **Events** page
2. Your Luma event should appear within 10 seconds
3. Look for green sync indicator: "Showing X synced events from your Luma organization"

### Step 5: Test Check-in → NFT Flow
1. In Luma: Check in an attendee
2. In dapp: Watch NFT Gallery for new NFT (5-10 seconds)
3. Click **"View on Chain"** to verify on blockchain explorer

## 🔍 Monitoring & Debugging

### Backend Logs
```bash
cd /Users/samuel/Desktop/polka-att/polkadot-attendance-nft
docker-compose logs backend -f
```

### Frontend Logs
```bash
docker-compose logs frontend -f
```

### Test Backend API
```bash
curl http://localhost:3001/health
curl -H "Authorization: Bearer YOUR_JWT" http://localhost:3001/api/events
```

## 📋 Expected Flow
1. ✅ Luma API connection successful
2. ✅ Events sync from Luma → dapp (10s intervals)
3. ✅ Check-ins sync from Luma → dapp (5s intervals)  
4. ✅ Auto-mint NFTs for new check-ins
5. ✅ NFTs visible in Gallery with blockchain links

## 🚨 Troubleshooting

### Luma Connection Issues
- Check API key validity
- Verify organization slug spelling
- Check backend logs for errors

### Sync Issues
- Events not appearing: Check backend logs for Luma API errors
- NFTs not minting: Check contract connection and gas balance

### Blockchain Issues
- Check Aleph Zero testnet status
- Verify contract address: `5HcpLmXpWtP7jJ9mmLvubJTzg2a1JM4EPM5Em6ZDb6U6ADGw`
- Confirm wallet has tAZERO for gas

## 📊 Success Criteria
- [x] Real Luma API connection
- [x] Event creation → appears in dapp
- [x] Attendee check-in → NFT minted
- [x] NFT viewable on blockchain explorer
- [x] No manual intervention required