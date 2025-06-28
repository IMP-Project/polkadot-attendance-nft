const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.isEnabled = process.env.EMAIL_ENABLED === 'true';
    this.initialized = false;
    this.nftImageBase64 = null;
    this.loadNFTImage();
  }

  /**
   * Load NFT character image as base64 for email embedding
   */
  loadNFTImage() {
    try {
      // Try multiple possible paths for the NFT character image
      const possiblePaths = [
        path.join(__dirname, '../assets/nft-character.png'), // Local assets directory
        path.join(__dirname, '../../frontend/public/images/nft-character.png'),
        path.join(__dirname, '../../../frontend/public/images/nft-character.png'),
        '/app/frontend/public/images/nft-character.png', // Docker container path
        path.join(process.cwd(), 'frontend/public/images/nft-character.png')
      ];

      let imageLoaded = false;
      for (const imagePath of possiblePaths) {
        if (fs.existsSync(imagePath)) {
          const imageBuffer = fs.readFileSync(imagePath);
          this.nftImageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
          console.log(`✅ NFT character image loaded successfully from: ${imagePath}`);
          imageLoaded = true;
          break;
        }
      }

      if (!imageLoaded) {
        console.log('⚠️ NFT character image not found in any expected locations, using placeholder');
        // Create a beautiful CSS-based placeholder instead
        this.nftImageBase64 = null;
      }
    } catch (error) {
      console.log('⚠️ Failed to load NFT character image:', error.message);
      this.nftImageBase64 = null;
    }
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
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD // Use app password for Gmail
          }
        });
      } else if (process.env.EMAIL_SERVICE === 'smtp') {
        this.transporter = nodemailer.createTransport({
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
        this.transporter = nodemailer.createTransport({
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
    eventDate,
    nftId,
    nftImage,
    transactionHash,
    walletAddress,
    blockNumber,
    organizerName = 'Event Organizer'
  }) {
    if (!this.isEnabled || !this.initialized) {
      console.log('📧 Email service not available - skipping notification');
      return { success: false, reason: 'Email service not enabled' };
    }

    try {
      const explorerUrl = `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fws.test.azero.dev#/explorer/query/${transactionHash}`;

      // No PDF generation needed - everything is in the beautiful email template!
      console.log('📧 Creating rich HTML certificate email');

      const mailOptions = {
        from: `"${organizerName}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: `🎉 Your NFT Certificate from ${eventName} is Ready!`,
        html: this.generateNFTMintedTemplate({
          recipientName,
          eventName,
          eventDate: eventDate || new Date(),
          nftId,
          nftImage,
          transactionHash,
          explorerUrl,
          walletAddress,
          blockNumber,
          organizerName
        })
      };

      // No attachments needed - everything is beautifully displayed in the email!

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
   * Generate NFT minted email template - Complete Certificate Design
   */
  generateNFTMintedTemplate({
    recipientName,
    eventName,
    eventDate,
    nftId,
    nftImage,
    transactionHash,
    explorerUrl,
    walletAddress,
    blockNumber,
    organizerName
  }) {
    const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>🎉 Your NFT Certificate - ${eventName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          background: #f5f7fa;
        }
        .container { 
          max-width: 700px; 
          margin: 20px auto; 
          background: white; 
          border-radius: 20px; 
          overflow: hidden; 
          box-shadow: 0 20px 60px rgba(0,0,0,0.1); 
        }
        
        /* Certificate Header */
        .certificate-header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 40px 30px; 
          text-align: center; 
          position: relative;
        }
        .certificate-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(90deg, #FF2670, #667eea, #764ba2);
        }
        .logo { 
          width: 80px; 
          height: 80px; 
          background: linear-gradient(135deg, #FF2670, #667eea); 
          border-radius: 50%; 
          margin: 0 auto 20px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-weight: 700; 
          font-size: 28px; 
        }
        .certificate-title { 
          font-size: 32px; 
          font-weight: 700; 
          margin-bottom: 10px; 
          letter-spacing: -0.5px; 
        }
        .certificate-subtitle { 
          font-size: 16px; 
          opacity: 0.9; 
          font-weight: 300; 
        }
        
        /* Main Content */
        .content { 
          padding: 40px 30px; 
        }
        .achievement-text { 
          text-align: center; 
          font-size: 18px; 
          color: #4a5568; 
          margin-bottom: 25px; 
        }
        .attendee-name { 
          text-align: center; 
          font-size: 36px; 
          font-weight: 700; 
          color: #FF2670; 
          margin: 25px 0; 
          text-transform: uppercase; 
          letter-spacing: 1px; 
          text-shadow: 0 2px 4px rgba(255,38,112,0.1);
        }
        
        /* NFT Image Section */
        .nft-showcase { 
          text-align: center; 
          margin: 30px 0; 
          padding: 25px; 
          background: linear-gradient(145deg, #f8f9fa, #e9ecef); 
          border-radius: 15px; 
          border: 3px solid #e2e8f0;
        }
        .nft-image { 
          width: 200px; 
          height: 200px; 
          border-radius: 15px; 
          margin: 15px auto; 
          display: block; 
          object-fit: cover; 
          border: 4px solid #fff; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .nft-placeholder {
          width: 200px; 
          height: 200px; 
          border-radius: 15px; 
          margin: 15px auto; 
          display: flex;
          background: linear-gradient(135deg, #667eea, #764ba2);
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 16px;
          font-weight: 600;
          border: 4px solid #fff; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          text-align: center;
          flex-direction: column;
          gap: 8px;
        }
        
        /* Event Details */
        .event-details { 
          background: #f7fafc; 
          border-radius: 15px; 
          padding: 25px; 
          margin: 25px 0; 
          border-left: 6px solid #FF2670; 
        }
        .event-name { 
          font-size: 24px; 
          font-weight: 600; 
          color: #2d3748; 
          margin-bottom: 10px; 
        }
        .event-date { 
          font-size: 16px; 
          color: #718096; 
          margin-bottom: 15px; 
        }
        
        /* Blockchain Verification */
        .blockchain-proof { 
          background: linear-gradient(145deg, #edf2f7, #e2e8f0); 
          border-radius: 15px; 
          padding: 25px; 
          margin: 25px 0; 
          border: 2px solid #cbd5e0;
        }
        .proof-title { 
          font-size: 18px; 
          font-weight: 600; 
          color: #2d3748; 
          margin-bottom: 20px; 
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .proof-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 15px;
        }
        .proof-item { 
          background: white;
          padding: 15px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }
        .proof-label { 
          color: #718096; 
          font-weight: 600; 
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 5px;
        }
        .proof-value { 
          color: #4a5568; 
          font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace; 
          font-size: 13px; 
          word-break: break-all; 
          background: #f7fafc;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }
        
        /* Footer */
        .footer { 
          background: #f8f9fa; 
          padding: 25px 30px; 
          text-align: center; 
          border-top: 1px solid #e2e8f0;
        }
        .footer p { 
          font-size: 12px; 
          color: #718096; 
          line-height: 1.5;
        }
        
        /* Responsive */
        @media (max-width: 600px) {
          .container { margin: 10px; }
          .certificate-header { padding: 30px 20px; }
          .content { padding: 30px 20px; }
          .certificate-title { font-size: 24px; }
          .attendee-name { font-size: 28px; }
          .nft-image, .nft-placeholder { 
            width: 150px; 
            height: 150px; 
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Certificate Header -->
        <div class="certificate-header">
          <div class="logo">🎖️</div>
          <h1 class="certificate-title">Certificate of Attendance</h1>
          <p class="certificate-subtitle">Blockchain-Verified Event Participation</p>
        </div>
        
        <!-- Main Content -->
        <div class="content">
          <p class="achievement-text">This certifies that</p>
          <h2 class="attendee-name">${recipientName}</h2>
          <p class="achievement-text">successfully attended and participated in</p>
          
          <!-- Event Details -->
          <div class="event-details">
            <h3 class="event-name">${eventName}</h3>
            <p class="event-date">📅 ${formattedDate}</p>
          </div>
          
                     <!-- NFT Showcase -->
           <div class="nft-showcase">
             <h4 style="margin-bottom: 15px; color: #4a5568;">🎨 Your Exclusive NFT</h4>
             
             ${nftImage ? 
               // Custom uploaded NFT design
               `<div style="width: 350px; height: 350px; margin: 20px auto; border-radius: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); box-shadow: 0 20px 40px rgba(0,0,0,0.1); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; position: relative; overflow: hidden; font-family: Arial, sans-serif;">
                 
                 <!-- Background subtle glow -->
                 <div style="position: absolute; top: -50%; right: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%); pointer-events: none;"></div>
                 
                 <!-- NFT Number Badge -->
                 <div style="position: absolute; top: 15px; right: 15px; background: rgba(255,255,255,0.3); padding: 8px 20px; border-radius: 20px; color: white; font-size: 14px; font-weight: 600; z-index: 2;">#${nftId}</div>
                 
                 <!-- Custom NFT Image -->
                 <div style="width: 280px; height: 280px; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 30px rgba(0,0,0,0.2); z-index: 2;">
                   <img src="${nftImage}" alt="Your Custom NFT" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
                 </div>
                 
                 <!-- Sparkles for custom design -->
                 <div style="position: absolute; top: 50px; left: 25px; font-size: 16px; opacity: 0.6; color: white;">✨</div>
                 <div style="position: absolute; top: 60px; right: 60px; font-size: 16px; opacity: 0.6; color: white;">⭐</div>
                 <div style="position: absolute; bottom: 60px; left: 30px; font-size: 16px; opacity: 0.6; color: white;">💫</div>
               </div>`
               :
               // Default Polka Buddy character
               `<div style="width: 350px; height: 350px; margin: 20px auto; border-radius: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); box-shadow: 0 20px 40px rgba(0,0,0,0.1); display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 20px; position: relative; overflow: hidden; font-family: Arial, sans-serif;">
                 
                 <!-- Background subtle glow -->
                 <div style="position: absolute; top: -50%; right: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%); pointer-events: none;"></div>
                 
                 <!-- NFT Number Badge -->
                 <div style="background: rgba(255,255,255,0.3); padding: 8px 20px; border-radius: 20px; color: white; font-size: 14px; font-weight: 600; margin-top: 10px; z-index: 2;">#${nftId}</div>
                 
                 <!-- Character Container -->
                 <div style="width: 220px; height: 220px; position: relative; display: flex; align-items: center; justify-content: center; margin: 10px 0; z-index: 2;">
                   
                   <!-- Face -->
                   <div style="width: 160px; height: 160px; background: #FFE5B4; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); box-shadow: 0 8px 16px rgba(0,0,0,0.1);">
                     
                     <!-- Hair -->
                     <div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); width: 140px; height: 70px; background: #8B4513; border-radius: 70px 70px 20px 20px; z-index: -1;"></div>
                     
                     <!-- Hair Strands -->
                     <div style="position: absolute; width: 25px; height: 35px; background: #8B4513; border-radius: 0 0 12px 12px; top: 58px; left: 8px; transform: rotate(-15deg);"></div>
                     <div style="position: absolute; width: 25px; height: 35px; background: #8B4513; border-radius: 0 0 12px 12px; top: 58px; right: 8px; transform: rotate(15deg);"></div>
                     
                     <!-- Eyebrows -->
                     <div style="position: absolute; width: 38px; height: 6px; background: #6B4423; border-radius: 3px; top: 42px; left: 38px; transform: rotate(-5deg);"></div>
                     <div style="position: absolute; width: 38px; height: 6px; background: #6B4423; border-radius: 3px; top: 42px; right: 38px; transform: rotate(5deg);"></div>
                     
                     <!-- Eyes -->
                     <div style="position: absolute; width: 35px; height: 35px; background: white; border-radius: 50%; top: 55px; left: 40px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
                       <div style="position: absolute; width: 18px; height: 18px; background: #4A4A4A; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%);">
                         <div style="position: absolute; width: 5px; height: 5px; background: white; border-radius: 50%; top: 3px; right: 3px;"></div>
                       </div>
                     </div>
                     <div style="position: absolute; width: 35px; height: 35px; background: white; border-radius: 50%; top: 55px; right: 40px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
                       <div style="position: absolute; width: 18px; height: 18px; background: #4A4A4A; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%);">
                         <div style="position: absolute; width: 5px; height: 5px; background: white; border-radius: 50%; top: 3px; right: 3px;"></div>
                       </div>
                     </div>
                     
                     <!-- Nose -->
                     <div style="position: absolute; width: 18px; height: 22px; background: #E6A876; border-radius: 50%; top: 80px; left: 50%; transform: translateX(-50%);"></div>
                     
                     <!-- Mouth -->
                     <div style="position: absolute; width: 50px; height: 25px; border: 3px solid #E74C3C; border-top: none; border-radius: 0 0 25px 25px; top: 100px; left: 50%; transform: translateX(-50%); background: #DB4A39;"></div>
                     
                     <!-- Cheeks -->
                     <div style="position: absolute; width: 25px; height: 25px; background: rgba(255,182,193,0.6); border-radius: 50%; top: 75px; left: 18px;"></div>
                     <div style="position: absolute; width: 25px; height: 25px; background: rgba(255,182,193,0.6); border-radius: 50%; top: 75px; right: 18px;"></div>
                   </div>
                 </div>
                 
                 <!-- Title -->
                 <div style="text-align: center; color: white; margin-bottom: 10px; z-index: 2;">
                   <h2 style="font-size: 20px; font-weight: 700; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.2); letter-spacing: 1px;">POLKA BUDDY</h2>
                 </div>
                 
                 <!-- Sparkles -->
                 <div style="position: absolute; top: 50px; left: 25px; font-size: 16px; opacity: 0.6;">✨</div>
                 <div style="position: absolute; top: 60px; right: 30px; font-size: 16px; opacity: 0.6;">⭐</div>
                 <div style="position: absolute; bottom: 60px; left: 30px; font-size: 16px; opacity: 0.6;">💫</div>
               </div>`
             }
            
            <p style="margin-top: 15px; color: #718096; font-size: 14px;">
              NFT ID: <strong>#${nftId}</strong>
            </p>
          </div>
          
          <!-- Blockchain Verification -->
          <div class="blockchain-proof">
            <h4 class="proof-title">
              🔗 Blockchain Verification
            </h4>
            <div class="proof-grid">
              <div class="proof-item">
                <div class="proof-label">Network</div>
                <div class="proof-value">Aleph Zero Testnet</div>
              </div>
              <div class="proof-item">
                <div class="proof-label">Your Wallet Address</div>
                <div class="proof-value">${walletAddress}</div>
              </div>
              <div class="proof-item">
                <div class="proof-label">Transaction Hash</div>
                <div class="proof-value">${transactionHash}</div>
              </div>
              <div class="proof-item">
                <div class="proof-label">Block Number</div>
                <div class="proof-value">#${blockNumber}</div>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f0fff4; border-radius: 10px; border-left: 4px solid #38a169;">
            <p style="margin: 0; color: #2f855a; font-weight: 600;">
              🎉 Congratulations! This NFT serves as permanent, cryptographic proof of your attendance at ${eventName}. 
              It's stored on the Aleph Zero blockchain and can never be altered or deleted.
            </p>
          </div>
          
          <p style="text-align: center; margin-top: 30px; color: #4a5568;">
            Thank you for attending <strong>${eventName}</strong>!<br>
            <br>
            Best regards,<br>
            <strong>${organizerName}</strong>
          </p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p>This email was sent because you attended an event using Polkadot NFT attendance tracking.<br>
          Your NFT certificate is permanently stored on the Aleph Zero blockchain.<br>
          <br>
          Generated on ${new Date().toLocaleString()}</p>
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