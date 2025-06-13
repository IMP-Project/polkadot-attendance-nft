const express = require('express');
const { generateToken, isValidSS58Address } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/wallet-login
 * Authenticate with wallet address (simplified login)
 */
router.post('/wallet-login', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        error: 'Wallet address is required'
      });
    }
    
    if (!isValidSS58Address(walletAddress)) {
      return res.status(400).json({
        error: 'Invalid wallet address format. Please provide a valid SS58 address.'
      });
    }
    
    // Generate JWT token
    const token = generateToken(walletAddress);
    
    res.json({
      message: 'Authentication successful',
      token,
      walletAddress,
      expiresIn: '7 days'
    });
    
  } catch (error) {
    console.error('Wallet login error:', error);
    res.status(500).json({
      error: 'Authentication service error'
    });
  }
});

/**
 * POST /api/auth/verify
 * Verify JWT token validity
 */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        error: 'Token is required'
      });
    }
    
    const { verifyToken } = require('../middleware/auth');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid or expired token'
      });
    }
    
    res.json({
      valid: true,
      walletAddress: decoded.walletAddress,
      expiresAt: new Date(decoded.exp * 1000).toISOString()
    });
    
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      error: 'Token verification service error'
    });
  }
});

module.exports = router;