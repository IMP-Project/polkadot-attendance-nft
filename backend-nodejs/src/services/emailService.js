const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.isEnabled = process.env.EMAIL_ENABLED === 'true';
    this.initialized = false;
  }

  /**
   * Initialize email service with configuration
   */
  async initialize() {
    if (!this.isEnabled) {
      console.log('📧 Email service disabled in environment variables');
      return;
    }

    try {
      // Create transporter based on configuration
      if (process.env.EMAIL_SERVICE === 'gmail') {
        this.transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD // Use app password for Gmail
          }
        });
      } else if (process.env.EMAIL_SERVICE === 'smtp') {
        this.transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          }
        });
      } else {
        // Development mode - use ethereal for testing
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransporter({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        console.log('📧 Using Ethereal test account for development');
      }

      // Verify connection
      await this.transporter.verify();
      this.initialized = true;
      console.log('✅ Email service initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
      this.isEnabled = false;
    }
  }

  /**
   * Send NFT minted notification to attendee
   */
  async sendNFTMintedNotification({
    recipientEmail,
    recipientName,
    eventName,
    nftId,
    transactionHash,
    organizerName = 'Event Organizer'
  }) {
    if (!this.isEnabled || !this.initialized) {
      console.log('📧 Email service not available - skipping notification');
      return { success: false, reason: 'Email service not enabled' };
    }

    try {
      const explorerUrl = `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fws.test.azero.dev#/explorer/query/${transactionHash}`;

      
      const mailOptions = {
        from: `"${organizerName}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: `🎉 Your NFT from ${eventName} has been minted!`,
        html: this.generateNFTMintedTemplate({
          recipientName,
          eventName,
          nftId,
          transactionHash,
          explorerUrl,
          organizerName
        })
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      // Log preview URL for development
      if (process.env.EMAIL_SERVICE !== 'gmail' && process.env.EMAIL_SERVICE !== 'smtp') {
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(result));
      }

      console.log(`✅ NFT minted notification sent to ${recipientEmail}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Failed to send NFT minted notification:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send event organizer summary
   */
  async sendOrganizerSummary({
    organizerEmail,
    organizerName,
    eventName,
    totalAttendees,
    mintedNFTs,
    pendingNFTs,
    failedNFTs,
    eventDate
  }) {
    if (!this.isEnabled || !this.initialized) {
      console.log('📧 Email service not available - skipping organizer summary');
      return { success: false, reason: 'Email service not enabled' };
    }

    try {
      const mailOptions = {
        from: `"Polkadot NFT Platform" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: organizerEmail,
        subject: `📊 Event Summary: ${eventName}`,
        html: this.generateOrganizerSummaryTemplate({
          organizerName,
          eventName,
          totalAttendees,
          mintedNFTs,
          pendingNFTs,
          failedNFTs,
          eventDate
        })
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ Organizer summary sent to ${organizerEmail}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Failed to send organizer summary:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send minting status update
   */
  async sendMintingStatusUpdate({
    recipientEmail,
    recipientName,
    eventName,
    status, // 'retry', 'failed', 'completed'
    attempt,
    maxAttempts,
    errorMessage
  }) {
    if (!this.isEnabled || !this.initialized) {
      return { success: false, reason: 'Email service not enabled' };
    }

    try {
      let subject, template;
      
      switch (status) {
        case 'retry':
          subject = `🔄 NFT Minting Retry - ${eventName}`;
          template = this.generateRetryTemplate({
            recipientName,
            eventName,
            attempt,
            maxAttempts
          });
          break;
        case 'failed':
          subject = `❌ NFT Minting Failed - ${eventName}`;
          template = this.generateFailedTemplate({
            recipientName,
            eventName,
            errorMessage
          });
          break;
        default:
          return { success: false, reason: 'Invalid status' };
      }

      const mailOptions = {
        from: `"Polkadot NFT Platform" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject,
        html: template
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ Minting status update (${status}) sent to ${recipientEmail}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Failed to send minting status update:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate NFT minted email template
   */
  generateNFTMintedTemplate({
    recipientName,
    eventName,
    nftId,
    transactionHash,
    explorerUrl,
    organizerName
  }) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your NFT has been minted!</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #E6007A, #FF2670); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e1e5e9; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e1e5e9; border-top: none; }
        .button { display: inline-block; background: #E6007A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 10px 0; }
        .nft-info { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #E6007A; }
        .hash { font-family: monospace; background: #f1f3f4; padding: 8px; border-radius: 4px; word-break: break-all; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Your NFT is Ready!</h1>
          <p>Your attendance at ${eventName} has been verified and your NFT has been minted on the blockchain!</p>
        </div>
        
        <div class="content">
          <p>Hello ${recipientName},</p>
          
          <p>Congratulations! Your attendance NFT for <strong>${eventName}</strong> has been successfully minted on the Aleph Zero blockchain.</p>
          
          <div class="nft-info">
            <h3>NFT Details</h3>
            <p><strong>NFT ID:</strong> #${nftId}</p>
            <p><strong>Event:</strong> ${eventName}</p>
            <p><strong>Transaction Hash:</strong></p>
            <div class="hash">${transactionHash}</div>
          </div>
          
          <p>You can view your NFT on the blockchain explorer:</p>
          
          <p style="text-align: center;">
            <a href="${explorerUrl}" class="button">View on Blockchain Explorer</a>
          </p>
          
          <p>This NFT serves as proof of your attendance and is permanently stored on the blockchain. You can use it to showcase your participation in ${eventName}.</p>
          
          <p>Thank you for attending ${eventName}!</p>
          
          <p>Best regards,<br>${organizerName}</p>
        </div>
        
        <div class="footer">
          <p><small>This email was sent because you attended an event that uses Polkadot NFT attendance tracking. Your NFT is stored on the Aleph Zero blockchain.</small></p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate organizer summary template
   */
  generateOrganizerSummaryTemplate({
    organizerName,
    eventName,
    totalAttendees,
    mintedNFTs,
    pendingNFTs,
    failedNFTs,
    eventDate
  }) {
    const successRate = totalAttendees > 0 ? Math.round((mintedNFTs / totalAttendees) * 100) : 0;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Summary - ${eventName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #E6007A, #FF2670); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e1e5e9; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e1e5e9; border-top: none; }
        .stats { display: flex; flex-wrap: wrap; gap: 20px; margin: 20px 0; }
        .stat-card { flex: 1; min-width: 120px; background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; border-left: 4px solid #E6007A; }
        .stat-number { font-size: 2em; font-weight: bold; color: #E6007A; }
        .stat-label { font-size: 0.9em; color: #666; margin-top: 5px; }
        .success-rate { background: #d4edda; border-left-color: #28a745; }
        .success-rate .stat-number { color: #28a745; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Event Summary</h1>
          <p>${eventName}</p>
          <p><small>${new Date(eventDate).toLocaleDateString()}</small></p>
        </div>
        
        <div class="content">
          <p>Hello ${organizerName},</p>
          
          <p>Here's a summary of the NFT minting activity for your event <strong>${eventName}</strong>:</p>
          
          <div class="stats">
            <div class="stat-card">
              <div class="stat-number">${totalAttendees}</div>
              <div class="stat-label">Total Attendees</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${mintedNFTs}</div>
              <div class="stat-label">NFTs Minted</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${pendingNFTs}</div>
              <div class="stat-label">Pending</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${failedNFTs}</div>
              <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card success-rate">
              <div class="stat-number">${successRate}%</div>
              <div class="stat-label">Success Rate</div>
            </div>
          </div>
          
          ${pendingNFTs > 0 ? `<p><strong>Note:</strong> ${pendingNFTs} NFTs are still being processed and will be minted shortly.</p>` : ''}
          ${failedNFTs > 0 ? `<p><strong>Attention:</strong> ${failedNFTs} NFTs failed to mint. You may want to check these manually in your dashboard.</p>` : ''}
          
          <p>All successfully minted NFTs have been sent to their respective attendees. Each attendee received an email notification with their NFT details and blockchain verification link.</p>
          
          <p>Thank you for using Polkadot NFT attendance tracking for your event!</p>
          
          <p>Best regards,<br>Polkadot NFT Platform Team</p>
        </div>
        
        <div class="footer">
          <p><small>This is an automated summary for event organizers using Polkadot NFT attendance tracking.</small></p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate retry notification template
   */
  generateRetryTemplate({ recipientName, eventName, attempt, maxAttempts }) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>NFT Minting Retry</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff; border: 1px solid #e1e5e9; border-radius: 8px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #e1e5e9; }
        .content { padding: 20px 0; }
        .footer { text-align: center; padding: 20px 0; border-top: 1px solid #e1e5e9; font-size: 0.9em; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🔄 NFT Minting in Progress</h2>
        </div>
        
        <div class="content">
          <p>Hello ${recipientName},</p>
          
          <p>We're currently processing your attendance NFT for <strong>${eventName}</strong>. We encountered a temporary issue during minting, but we're retrying the process.</p>
          
          <p><strong>Retry Attempt:</strong> ${attempt} of ${maxAttempts}</p>
          
          <p>We'll notify you once your NFT has been successfully minted. No action is required on your part.</p>
          
          <p>Thank you for your patience!</p>
        </div>
        
        <div class="footer">
          <p>Polkadot NFT Platform</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate failed notification template
   */
  generateFailedTemplate({ recipientName, eventName, errorMessage }) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>NFT Minting Issue</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff; border: 1px solid #e1e5e9; border-radius: 8px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #e1e5e9; }
        .content { padding: 20px 0; }
        .footer { text-align: center; padding: 20px 0; border-top: 1px solid #e1e5e9; font-size: 0.9em; color: #666; }
        .error-box { background: #fee; border: 1px solid #fcc; border-radius: 4px; padding: 15px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>❌ NFT Minting Issue</h2>
        </div>
        
        <div class="content">
          <p>Hello ${recipientName},</p>
          
          <p>We apologize, but we encountered an issue while minting your attendance NFT for <strong>${eventName}</strong>.</p>
          
          <div class="error-box">
            <p><strong>Technical Details:</strong> ${errorMessage}</p>
          </div>
          
          <p>We've notified the event organizer, and they will work to resolve this issue. You may receive your NFT at a later time once the issue is resolved.</p>
          
          <p>If you have any questions, please contact the event organizer directly.</p>
          
          <p>We apologize for the inconvenience.</p>
        </div>
        
        <div class="footer">
          <p>Polkadot NFT Platform</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = {
  EmailService,
  emailService
};