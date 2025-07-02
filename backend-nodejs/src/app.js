const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000'];

// Public endpoints that need unrestricted CORS for wallet access
const publicEndpoints = [
  '/api/nfts/stats/global',
  '/api/nfts/verify/',
  '/health'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or wallets)
    if (!origin) return callback(null, true);
    
    // Check if this is a metadata endpoint request (wallets need access)
    const isMetadataEndpoint = callback.req && callback.req.path && callback.req.path.includes('/metadata');
    
    // Allow all origins for public endpoints and metadata endpoints
    if (isMetadataEndpoint || publicEndpoints.some(endpoint => 
      callback.req && callback.req.path && callback.req.path.startsWith(endpoint)
    )) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
if (process.env.RATE_LIMIT_ENABLED === 'true') {
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE) || 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
}

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const nftRoutes = require('./routes/nfts');
const checkinRoutes = require('./routes/checkins');
const syncRoutes = require('./routes/sync');
const blockchainRoutes = require('./routes/blockchain');
const emailRoutes = require('./routes/email');
const { errorHandler } = require('./utils/errors');

// Import services
const { simpleEventSync } = require('./services/simpleEventSync');
const { simpleCheckinSync } = require('./services/simpleCheckinSync');
const { nftMintingService } = require('./services/nftMintingService');
const { emailService } = require('./services/emailService');

// API routes
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'Polkadot Attendance NFT API v1.0',
    status: 'active',
    features: ['multi-user', 'luma-integration', 'auto-minting'],
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      events: '/api/events',
      nfts: '/api/nfts',
      checkins: '/api/checkins',
      sync: '/api/sync',
      blockchain: '/api/blockchain',
      email: '/api/email',
      health: '/health'
    }
  });
});

// Route handlers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/nfts', nftRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/email', emailRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  
  // Start services in development/production
  if (process.env.NODE_ENV !== 'test') {
    try {
      console.log('📧 Initializing email service...');
      await emailService.initialize();
      console.log('✅ Email service initialized successfully');
      
      console.log('🔄 Starting simple event sync...');
      simpleEventSync.start();
      console.log('✅ Simple event sync started successfully');
      
      console.log('🔄 Starting simple check-in sync...');
      simpleCheckinSync.start();
      console.log('✅ Simple check-in sync started successfully');
      
      console.log('🎨 Starting NFT minting service...');
      await nftMintingService.start();
      console.log('✅ NFT minting service started successfully');
    } catch (error) {
      console.error('❌ Failed to start services:', error);
    }
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;