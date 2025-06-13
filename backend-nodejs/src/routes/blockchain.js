const express = require('express');
const { authenticateWallet } = require('../middleware/auth');
const { blockchainService } = require('../services/blockchainService');
const { contractService } = require('../services/contractService');
const { nftMintingService } = require('../services/nftMintingService');
const { ValidationError, NotFoundError, asyncHandler } = require('../utils/errors');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/blockchain/status
 * Get blockchain connection and contract status
 */
router.get('/status', asyncHandler(async (req, res) => {
  // Start with blockchain status first
  const blockchainStatus = blockchainService.getStatus();
  
  // Get minting stats (should work now with fresh DB)
  let mintingStats;
  try {
    mintingStats = await nftMintingService.getMintingStats();
  } catch (error) {
    console.error('Minting stats error:', error);
    mintingStats = { 
      queue: { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 },
      service: { isRunning: false, isProcessing: false, intervalMs: 3000 },
      error: error.message 
    };
  }

  // Get contract status with timeout
  let contractStatus;
  try {
    contractStatus = await Promise.race([
      contractService.getContractStatus(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Contract status timeout')), 3000))
    ]);
  } catch (error) {
    console.error('Contract status error:', error);
    contractStatus = { isConnected: false, error: error.message };
  }

  res.json({
    blockchain: blockchainStatus,
    contract: contractStatus,
    minting: mintingStats
  });
}));

/**
 * GET /api/blockchain/gas-price
 * Get current gas price estimates
 */
router.get('/gas-price', asyncHandler(async (req, res) => {
  const gasPrices = await contractService.getGasPrice();
  
  res.json({
    prices: gasPrices,
    currency: 'AZERO',
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/blockchain/validate-address
 * Validate a wallet address
 */
router.post('/validate-address', asyncHandler(async (req, res) => {
  const { address } = req.body;

  if (!address) {
    throw new ValidationError('Address is required');
  }

  const isValid = blockchainService.isValidAddress(address);

  res.json({
    address,
    isValid,
    format: isValid ? 'SS58' : null
  });
}));

/**
 * GET /api/blockchain/nft/:contractNftId
 * Get NFT details from blockchain
 */
router.get('/nft/:contractNftId', asyncHandler(async (req, res) => {
  const { contractNftId } = req.params;
  
  const nftId = parseInt(contractNftId);
  if (isNaN(nftId)) {
    throw new ValidationError('Invalid NFT ID');
  }

  const nft = await contractService.getNftById(nftId);
  
  if (!nft) {
    throw new NotFoundError('NFT not found on blockchain');
  }

  res.json({
    contractNftId: nftId,
    ...nft
  });
}));

/**
 * GET /api/blockchain/nfts/:address
 * Get NFTs owned by address
 */
router.get('/nfts/:address', asyncHandler(async (req, res) => {
  const { address } = req.params;

  if (!blockchainService.isValidAddress(address)) {
    throw new ValidationError('Invalid wallet address');
  }

  const nfts = await contractService.getNftsByOwner(address);

  res.json({
    address,
    nfts,
    count: nfts.length
  });
}));

/**
 * GET /api/blockchain/transaction/:hash
 * Get transaction details
 */
router.get('/transaction/:hash', asyncHandler(async (req, res) => {
  const { hash } = req.params;

  const transaction = await blockchainService.getTransaction(hash);
  
  if (!transaction) {
    throw new NotFoundError('Transaction not found');
  }

  res.json(transaction);
}));

/**
 * POST /api/blockchain/mint/test
 * Test NFT minting (authenticated users only)
 */
router.post('/mint/test', authenticateWallet, asyncHandler(async (req, res) => {
  const { eventId, recipientAddress, metadata } = req.body;

  // Validation
  if (!eventId || !recipientAddress) {
    throw new ValidationError('eventId and recipientAddress are required');
  }

  if (!blockchainService.isValidAddress(recipientAddress)) {
    throw new ValidationError('Invalid recipient address');
  }

  // Get event
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      userId: req.user.id
    }
  });

  if (!event) {
    throw new NotFoundError('Event');
  }

  // Check if can mint
  const canMintResult = await contractService.canMintNft(
    event.lumaEventId,
    recipientAddress
  );

  if (!canMintResult.canMint) {
    return res.status(400).json({
      error: 'Cannot mint NFT',
      reason: canMintResult.reason,
      details: canMintResult
    });
  }

  // Create test NFT record
  const nft = await prisma.nft.create({
    data: {
      userId: req.user.id,
      eventId: event.id,
      recipientAddress,
      mintStatus: 'PENDING',
      metadata: metadata || JSON.stringify({
        name: `Test NFT for ${event.name}`,
        description: 'This is a test NFT mint',
        test: true
      })
    }
  });

  res.json({
    message: 'Test NFT queued for minting',
    nftId: nft.id,
    recipientAddress,
    event: {
      id: event.id,
      name: event.name,
      lumaEventId: event.lumaEventId
    }
  });
}));

/**
 * POST /api/blockchain/mint/retry/:nftId
 * Retry failed NFT mint
 */
router.post('/mint/retry/:nftId', authenticateWallet, asyncHandler(async (req, res) => {
  const { nftId } = req.params;

  // Verify NFT belongs to user
  const nft = await prisma.nft.findFirst({
    where: {
      id: nftId,
      userId: req.user.id
    },
    include: {
      event: {
        select: {
          name: true
        }
      }
    }
  });

  if (!nft) {
    throw new NotFoundError('NFT');
  }

  if (nft.mintStatus !== 'FAILED') {
    return res.status(400).json({
      error: 'Can only retry failed NFTs',
      currentStatus: nft.mintStatus
    });
  }

  await nftMintingService.retryMint(nftId);

  res.json({
    message: 'NFT queued for retry',
    nftId,
    eventName: nft.event.name
  });
}));

/**
 * GET /api/blockchain/mint/queue
 * Get minting queue status
 */
router.get('/mint/queue', authenticateWallet, asyncHandler(async (req, res) => {
  const { status } = req.query;

  let where = { userId: req.user.id };
  if (status) {
    where.mintStatus = status;
  }

  const nfts = await prisma.nft.findMany({
    where,
    include: {
      event: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  const stats = await nftMintingService.getMintingStats();

  res.json({
    queue: nfts.map(nft => ({
      id: nft.id,
      eventId: nft.event.id,
      eventName: nft.event.name,
      recipientAddress: nft.recipientAddress,
      mintStatus: nft.mintStatus,
      mintError: nft.mintError,
      transactionHash: nft.transactionHash,
      contractNftId: nft.contractNftId?.toString(),
      createdAt: nft.createdAt,
      mintedAt: nft.mintedAt
    })),
    stats: stats.queue
  });
}));

/**
 * POST /api/blockchain/mint/start
 * Start minting service (admin only for now)
 */
router.post('/mint/start', asyncHandler(async (req, res) => {
  await nftMintingService.start();
  
  res.json({
    message: 'NFT minting service started',
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/blockchain/mint/stop
 * Stop minting service (admin only for now)
 */
router.post('/mint/stop', asyncHandler(async (req, res) => {
  nftMintingService.stop();
  
  res.json({
    message: 'NFT minting service stopped',
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/blockchain/explorer/:type/:value
 * Get explorer link for transaction/address/nft
 */
router.get('/explorer/:type/:value', asyncHandler(async (req, res) => {
  const { type, value } = req.params;
  
  const baseUrl = 'https://test.azero.dev';
  let url = '';

  switch (type) {
    case 'tx':
    case 'transaction':
      url = `${baseUrl}/tx/${value}`;
      break;
    case 'address':
    case 'account':
      url = `${baseUrl}/account/${value}`;
      break;
    case 'contract':
      url = `${baseUrl}/contract/${value}`;
      break;
    case 'block':
      url = `${baseUrl}/block/${value}`;
      break;
    default:
      throw new ValidationError('Invalid explorer type. Use: tx, address, contract, or block');
  }

  res.json({
    type,
    value,
    url,
    network: 'Aleph Zero Testnet'
  });
}));

module.exports = router;