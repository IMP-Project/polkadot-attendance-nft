const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Validate SS58 address format (basic validation)
const isValidSS58Address = (address) => {
  if (!address || typeof address !== 'string') return false;
  
  // Basic SS58 validation - should start with 5 and be 47-48 characters
  const ss58Regex = /^[1-9A-HJ-NP-Za-km-z]{47,48}$/;
  return ss58Regex.test(address);
};

// Generate JWT token for wallet address
const generateToken = (walletAddress) => {
  const payload = {
    walletAddress,
    type: 'wallet_auth',
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d' // 7 days
  });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Authentication middleware
const authenticateWallet = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided. Please include Bearer token in Authorization header.'
      });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid or expired token'
      });
    }
    
    // Validate wallet address format
    if (!isValidSS58Address(decoded.walletAddress)) {
      return res.status(401).json({
        error: 'Invalid wallet address format'
      });
    }
    
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress: decoded.walletAddress }
    });
    
    if (!user) {
      // Auto-create user on first authentication
      user = await prisma.user.create({
        data: {
          walletAddress: decoded.walletAddress
        }
      });
    }
    
    // Add user info to request
    req.user = user;
    req.walletAddress = decoded.walletAddress;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication service error'
    });
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (decoded && isValidSS58Address(decoded.walletAddress)) {
      const user = await prisma.user.findUnique({
        where: { walletAddress: decoded.walletAddress }
      });
      
      if (user) {
        req.user = user;
        req.walletAddress = decoded.walletAddress;
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue even if optional auth fails
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateWallet,
  optionalAuth,
  isValidSS58Address
};