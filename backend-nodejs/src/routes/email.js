const express = require('express');
const router = express.Router();
const { authenticateWallet } = require('../middleware/auth');
const { emailService } = require('../services/emailService');

/**
 * @route   GET /api/email/status
 * @desc    Get email service status
 * @access  Private
 */
router.get('/status', authenticateWallet, async (req, res) => {
  try {
    res.json({
      enabled: emailService.isEnabled,
      initialized: emailService.initialized,
      service: process.env.EMAIL_SERVICE || 'development'
    });
  } catch (error) {
    console.error('Error getting email status:', error);
    res.status(500).json({ error: 'Failed to get email status' });
  }
});

/**
 * @route   POST /api/email/test
 * @desc    Send test email
 * @access  Private
 */
router.post('/test', authenticateWallet, async (req, res) => {
  try {
    const { recipientEmail, recipientName } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    // Send a test NFT minted notification
    const result = await emailService.sendNFTMintedNotification({
      recipientEmail,
      recipientName: recipientName || 'Test User',
      eventName: 'Test Event',
      nftId: '123',
      transactionHash: '0x1234567890abcdef',
      organizerName: 'Test Organizer'
    });

    if (result.success) {
      res.json({ 
        message: 'Test email sent successfully',
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send test email',
        reason: result.reason || result.error 
      });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

/**
 * @route   POST /api/email/organizer-summary
 * @desc    Send organizer summary email
 * @access  Private
 */
router.post('/organizer-summary', authenticateWallet, async (req, res) => {
  try {
    const {
      organizerEmail,
      organizerName,
      eventName,
      totalAttendees,
      mintedNFTs,
      pendingNFTs,
      failedNFTs,
      eventDate
    } = req.body;

    if (!organizerEmail || !eventName) {
      return res.status(400).json({ 
        error: 'Organizer email and event name are required' 
      });
    }

    const result = await emailService.sendOrganizerSummary({
      organizerEmail,
      organizerName: organizerName || 'Event Organizer',
      eventName,
      totalAttendees: totalAttendees || 0,
      mintedNFTs: mintedNFTs || 0,
      pendingNFTs: pendingNFTs || 0,
      failedNFTs: failedNFTs || 0,
      eventDate: eventDate || new Date().toISOString()
    });

    if (result.success) {
      res.json({ 
        message: 'Organizer summary sent successfully',
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send organizer summary',
        reason: result.reason || result.error 
      });
    }
  } catch (error) {
    console.error('Error sending organizer summary:', error);
    res.status(500).json({ error: 'Failed to send organizer summary' });
  }
});

/**
 * @route   POST /api/email/status-update
 * @desc    Send minting status update email
 * @access  Private
 */
router.post('/status-update', authenticateWallet, async (req, res) => {
  try {
    const {
      recipientEmail,
      recipientName,
      eventName,
      status,
      attempt,
      maxAttempts,
      errorMessage
    } = req.body;

    if (!recipientEmail || !eventName || !status) {
      return res.status(400).json({ 
        error: 'Recipient email, event name, and status are required' 
      });
    }

    if (!['retry', 'failed'].includes(status)) {
      return res.status(400).json({ 
        error: 'Status must be either "retry" or "failed"' 
      });
    }

    const result = await emailService.sendMintingStatusUpdate({
      recipientEmail,
      recipientName: recipientName || 'User',
      eventName,
      status,
      attempt,
      maxAttempts,
      errorMessage
    });

    if (result.success) {
      res.json({ 
        message: 'Status update sent successfully',
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send status update',
        reason: result.reason || result.error 
      });
    }
  } catch (error) {
    console.error('Error sending status update:', error);
    res.status(500).json({ error: 'Failed to send status update' });
  }
});

module.exports = router;