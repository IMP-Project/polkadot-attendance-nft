#!/bin/bash

# Set all required environment variables
export DATABASE_URL="postgresql://attendance_nft_db_user:jakMxfqctlrET5cnO0wxLroHdmM57yx8@dpg-d0lq7u8dl3ps73bn64ng-a.frankfurt-postgres.render.com/attendance_nft_db?sslmode=require"
export POLKADOT_RPC_URL="wss://ws.test.azero.dev"
export CONTRACT_ADDRESS="0x0e7a07b3ce7176f4a41ed0ab7697802f6ea603185ee446c0db664008e63532cf"
export SIGNER_MNEMONIC="denial clip diesel pool peasant garment price sick person cabin fabric million"
export LUMA_API_KEY="secret-fOp0jjjitrQFXoYg15j8gEAHf"
export LUMA_WEBHOOK_KEY="your-webhook-key"
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="admin123"
export JWT_SECRET="test-jwt-secret"

echo "Starting Polkadot Attendance NFT server..."
echo "Contract (hex): $CONTRACT_ADDRESS"
echo "RPC URL: $POLKADOT_RPC_URL"
echo ""

# Run the server
go run cmd/server/main.go