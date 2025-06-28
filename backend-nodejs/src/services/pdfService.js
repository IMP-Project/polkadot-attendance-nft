const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

class PDFService {
  constructor() {
    this.browser = null;
  }

  /**
   * Initialize PDF service with browser instance
   */
  async initialize() {
    if (!this.browser) {
      const launchOptions = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins',
          '--disable-site-isolation-trials',
          '--disable-extensions',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      };

      // Let puppeteer use its own bundled Chromium for cross-platform compatibility

      this.browser = await puppeteer.launch(launchOptions);
      console.log('📄 PDF service initialized');
    }
  }

  /**
   * Generate NFT certificate PDF
   */
  async generateNFTCertificate({
    eventName,
    eventDate,
    attendeeName,
    walletAddress,
    transactionHash,
    nftImage,
    blockNumber
  }) {
    try {
      await this.initialize();

      // Convert image URL to base64 if provided
      let base64Image = null;
      if (nftImage) {
        try {
          console.log('📸 Fetching NFT image from:', nftImage);
          const response = await axios.get(nftImage, {
            responseType: 'arraybuffer',
            timeout: 10000
          });
          const base64 = Buffer.from(response.data, 'binary').toString('base64');
          const mimeType = response.headers['content-type'] || 'image/png';
          base64Image = `data:${mimeType};base64,${base64}`;
          console.log('✅ NFT image converted to base64');
        } catch (error) {
          console.error('⚠️ Could not fetch NFT image:', error.message);
          // Try to use the default nft-character.png as fallback
          try {
            const defaultImageUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/images/nft-character.png`;
            console.log('📸 Using default NFT character image');
            const response = await axios.get(defaultImageUrl, {
              responseType: 'arraybuffer',
              timeout: 5000
            });
            const base64 = Buffer.from(response.data, 'binary').toString('base64');
            const mimeType = response.headers['content-type'] || 'image/png';
            base64Image = `data:${mimeType};base64,${base64}`;
          } catch (fallbackError) {
            // If even the fallback fails, use a simple SVG
            console.error('⚠️ Could not load default image either');
            base64Image = 'data:image/svg+xml;base64,' + Buffer.from(`
              <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                <rect width="200" height="200" fill="#f3f4f6" rx="10"/>
                <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
                      font-family="Arial, sans-serif" font-size="16" fill="#6b7280">
                  NFT Image
                </text>
              </svg>
            `).toString('base64');
          }
        }
      }

      const page = await this.browser.newPage();
      
      // Set page size to A4
      await page.setViewport({ width: 794, height: 1123 }); // A4 in pixels at 96 DPI

      const html = this.generateCertificateHTML({
        eventName,
        eventDate,
        attendeeName,
        walletAddress,
        transactionHash,
        nftImage: base64Image || nftImage, // Use base64 if available
        blockNumber
      });

      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });

      await page.close();

      console.log(`✅ PDF certificate generated for ${attendeeName}`);
      return pdfBuffer;

    } catch (error) {
      console.error('❌ PDF generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate certificate HTML template
   */
  generateCertificateHTML({
    eventName,
    eventDate,
    attendeeName,
    walletAddress,
    transactionHash,
    nftImage,
    blockNumber
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
      <meta charset="UTF-8">
      <title>NFT Certificate - ${eventName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px;
          min-height: 100vh;
        }
        
        .certificate {
          background: white;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.1);
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          overflow: hidden;
        }
        
        .certificate::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 8px;
          background: linear-gradient(90deg, #FF2670, #667eea, #764ba2);
        }
        
        .header {
          text-align: center;
          margin-bottom: 25px;
        }
        
        .logo {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #FF2670, #667eea);
          border-radius: 50%;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 24px;
        }
        
        .certificate-title {
          font-size: 28px;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }
        
        .subtitle {
          font-size: 14px;
          color: #718096;
          font-weight: 400;
        }
        
        .content {
          text-align: center;
          margin: 30px 0;
        }
        
        .achievement-text {
          font-size: 16px;
          color: #4a5568;
          margin-bottom: 20px;
          line-height: 1.4;
        }
        
        .attendee-name {
          font-size: 32px;
          font-weight: 700;
          color: #FF2670;
          margin: 20px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .event-details {
          background: #f7fafc;
          border-radius: 15px;
          padding: 20px;
          margin: 25px 0;
          border-left: 5px solid #FF2670;
        }
        
        .event-name {
          font-size: 22px;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 10px;
        }
        
        .event-date {
          font-size: 14px;
          color: #718096;
          margin-bottom: 15px;
        }
        
        .nft-image {
          width: 150px;
          height: 150px;
          border-radius: 15px;
          margin: 15px auto;
          display: block;
          object-fit: cover;
          border: 3px solid #e2e8f0;
        }
        
        .blockchain-proof {
          background: #edf2f7;
          border-radius: 10px;
          padding: 15px;
          margin-top: 20px;
          text-align: left;
        }
        
        .proof-title {
          font-size: 14px;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 12px;
          text-align: center;
        }
        
        .proof-item {
          margin-bottom: 10px;
          font-size: 10px;
        }
        
        .proof-label {
          color: #718096;
          font-weight: 600;
          display: block;
          margin-bottom: 2px;
        }
        
        .proof-value {
          color: #4a5568;
          font-family: 'Courier New', monospace;
          font-size: 9px;
          word-break: break-all;
          display: block;
        }
        
        .footer {
          text-align: center;
          margin-top: 25px;
          padding-top: 20px;
          border-top: 2px solid #e2e8f0;
        }
        
        .verification-text {
          font-size: 12px;
          color: #718096;
          line-height: 1.4;
        }
        
        .generated-date {
          font-size: 10px;
          color: #a0aec0;
          margin-top: 10px;
        }
        
        .decorative-border {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 100px;
          height: 100px;
          border: 3px solid #e2e8f0;
          border-radius: 50%;
          opacity: 0.3;
        }
      </style>
    </head>
    <body>
      <div class="certificate">
        <div class="decorative-border"></div>
        
        <div class="header">
          <div class="logo">NFT</div>
          <h1 class="certificate-title">Certificate of Attendance</h1>
          <p class="subtitle">Blockchain-Verified Event Participation</p>
        </div>
        
        <div class="content">
          <p class="achievement-text">
            This certifies that
          </p>
          
          <h2 class="attendee-name">${attendeeName}</h2>
          
          <p class="achievement-text">
            successfully attended and participated in
          </p>
          
          <div class="event-details">
            <h3 class="event-name">${eventName}</h3>
            <p class="event-date">${formattedDate}</p>
            ${nftImage ? `<img src="${nftImage}" alt="Event NFT" class="nft-image" />` : ''}
          </div>
          
          <div class="blockchain-proof">
            <h4 class="proof-title">🔗 Blockchain Verification</h4>
            <div class="proof-item">
              <span class="proof-label">Network:</span>
              <span class="proof-value">Aleph Zero Testnet</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Wallet Address:</span>
              <span class="proof-value">${walletAddress}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Transaction Hash:</span>
              <span class="proof-value">${transactionHash}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Block Number:</span>
              <span class="proof-value">${blockNumber}</span>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p class="verification-text">
            This certificate is permanently recorded on the Aleph Zero blockchain<br>
            and serves as immutable proof of attendance. It cannot be duplicated or forged.
          </p>
          <p class="generated-date">
            Generated on ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Close browser instance
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('📄 PDF service closed');
    }
  }
}

// Export singleton instance
const pdfService = new PDFService();
module.exports = { pdfService };