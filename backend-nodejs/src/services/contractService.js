const { blockchainService } = require('./blockchainService');
const { BN } = require('@polkadot/util');

class ContractService {
  constructor() {
    this.nftCounter = null;
    this.mintQueue = [];
    this.isMinting = false;
  }

  /**
   * Initialize contract service
   */
  async initialize() {
    console.log('📄 Initializing contract service...');
    
    // Initialize blockchain connection
    console.log('📄 Contract Step 1: Initializing blockchain service...');
    await blockchainService.initialize();
    console.log('✅ Contract Step 1: Blockchain service initialized');
    
    // Get current NFT count (non-blocking)
    console.log('📄 Contract Step 2: Starting NFT counter sync (async)...');
    this.syncNftCounter();
    console.log('✅ Contract Step 2: NFT counter sync started');
    
    console.log('✅ Contract service initialized');
  }

  /**
   * Sync NFT counter from blockchain
   */
  async syncNftCounter() {
    try {
      console.log('🔢 Syncing NFT counter: Starting getNftCount call...');
      const countPromise = this.getNftCount();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('NFT count query timeout')), 3000)
      );
      
      console.log('🔢 Syncing NFT counter: Racing promise with timeout...');
      const count = await Promise.race([countPromise, timeoutPromise]);
      this.nftCounter = count;
      console.log(`🔢 Current NFT count on-chain: ${count}`);
    } catch (error) {
      console.warn('Cannot sync NFT counter from contract:', error.message);
      // Initialize from 0 as fallback
      this.nftCounter = 0;
      console.log('🔢 NFT counter set to 0 as fallback');
    }
  }

  /**
   * Get total NFT count from contract
   */
  async getNftCount() {
    await blockchainService.ensureInitialized();
    
    const { output } = await blockchainService.contract.query.getNftCount(
      blockchainService.signer.address,
      { gasLimit: -1 }
    );

    if (output && !output.isEmpty) {
      const result = output.toJSON();
      if (result.ok !== undefined) {
        return Number(result.ok);
      }
    }
    
    throw new Error('Failed to get NFT count from contract');
  }

  /**
   * Get NFT by ID from contract
   * @param {number} nftId - NFT ID
   */
  async getNftById(nftId) {
    await blockchainService.ensureInitialized();
    
    const { output } = await blockchainService.contract.query.getNft(
      blockchainService.signer.address,
      { gasLimit: -1 },
      nftId
    );

    if (output && !output.isEmpty) {
      const result = output.toJSON();
      if (result.ok && result.ok.some) {
        const nft = result.ok.some;
        return {
          id: nft.id,
          lumaEventId: nft.lumaEventId,
          owner: nft.owner,
          recipient: nft.recipient,
          metadata: nft.metadata,
          createdAt: new Date(Number(nft.createdAt) * 1000)
        };
      }
    }
    
    return null;
  }

  /**
   * Get NFTs owned by address
   * @param {string} ownerAddress - Owner address
   */
  async getNftsByOwner(ownerAddress) {
    await blockchainService.ensureInitialized();
    
    const { output } = await blockchainService.contract.query.getOwnedNfts(
      blockchainService.signer.address,
      { gasLimit: -1 },
      ownerAddress
    );

    if (output && !output.isEmpty) {
      const result = output.toJSON();
      if (result.ok) {
        return result.ok.map(nft => ({
          id: nft.id,
          lumaEventId: nft.lumaEventId,
          owner: nft.owner,
          recipient: nft.recipient,
          metadata: nft.metadata,
          createdAt: new Date(Number(nft.createdAt) * 1000)
        }));
      }
    }
    
    return [];
  }

  /**
   * Check if NFT can be minted
   * @param {string} lumaEventId - Luma event ID
   * @param {string} recipient - Recipient address
   */
  async canMintNft(lumaEventId, recipient) {
    // Validate recipient address
    if (!blockchainService.isValidAddress(recipient)) {
      return {
        canMint: false,
        reason: 'Invalid recipient address format'
      };
    }

    // Check if NFT already exists for this event and recipient
    // Note: Database check moved to higher level service

    // Check signer balance
    if (!blockchainService.signer) {
      return {
        canMint: false,
        reason: 'Blockchain service not properly initialized'
      };
    }
    
    const balance = await blockchainService.getBalance(blockchainService.signer.address);
    const minBalance = new BN('1000000000000'); // 1 AZERO minimum
    
    if (balance.free.lt(minBalance)) {
      return {
        canMint: false,
        reason: 'Insufficient balance for gas fees',
        currentBalance: blockchainService.formatBalance(balance),
        required: '1 AZERO minimum'
      };
    }

    return {
      canMint: true
    };
  }

  /**
   * Prepare NFT metadata
   * @param {Object} event - Event object
   * @param {Object} checkin - Check-in object
   * @param {Object} nftTemplate - Optional NFT template
   */
  prepareMetadata(event, checkin, nftTemplate = null) {
    const baseMetadata = {
      name: `${event.name} - Attendance NFT`,
      description: `This NFT certifies attendance at ${event.name}`,
      image: event.imageUrl || 'https://placeholder.com/nft-image.png',
      attributes: [
        {
          trait_type: 'Event Name',
          value: event.name
        },
        {
          trait_type: 'Event Date',
          value: event.startDate.toISOString()
        },
        {
          trait_type: 'Attendee Name',
          value: checkin.attendeeName
        },
        {
          trait_type: 'Check-in Time',
          value: checkin.checkedInAt.toISOString()
        },
        {
          trait_type: 'Location',
          value: event.location || 'Virtual'
        }
      ],
      properties: {
        category: 'attendance',
        event_id: event.lumaEventId,
        checkin_id: checkin.lumaCheckInId
      }
    };

    // Apply template if provided
    if (nftTemplate) {
      try {
        const template = JSON.parse(nftTemplate);
        return {
          ...baseMetadata,
          ...template,
          attributes: [
            ...baseMetadata.attributes,
            ...(template.attributes || [])
          ]
        };
      } catch (error) {
        console.error('Error parsing NFT template:', error);
      }
    }

    return baseMetadata;
  }

  /**
   * Execute mint transaction
   * @param {string} lumaEventId - Luma event ID
   * @param {string} recipient - Recipient address
   * @param {string} metadata - JSON metadata string
   * @param {Object} gasEstimate - Gas estimate object
   */
  async executeMintTransaction(lumaEventId, recipient, metadata, gasEstimate) {
    await blockchainService.ensureInitialized();

    return new Promise((resolve, reject) => {
      let unsub = null;
      let txHash = null;
      let blockNumber = null;
      let events = [];

      // Execute transaction
      blockchainService.contract.tx
        .mintNft(
          { gasLimit: gasEstimate.gasLimit },
          lumaEventId,
          recipient,
          metadata
        )
        .signAndSend(
          blockchainService.signer,
          { nonce: -1 }, // Auto-manage nonce
          (result) => {
            console.log(`🔄 Mint transaction status: ${result.status.type}`);

            if (result.status.isInBlock) {
              console.log(`📦 Transaction included in block: ${result.status.asInBlock}`);
              txHash = result.txHash.toHex();
              blockNumber = result.blockNumber?.toNumber();
            }

            if (result.status.isFinalized) {
              console.log(`✅ Transaction finalized: ${result.status.asFinalized}`);
              
              // Process events
              result.events.forEach(({ event }) => {
                if (event.section === 'contracts' && event.method === 'ContractEmitted') {
                  events.push(event.toHuman());
                }
                
                // Check for system errors
                if (event.section === 'system' && event.method === 'ExtrinsicFailed') {
                  const [dispatchError] = event.data;
                  let errorMessage = 'Transaction failed';
                  
                  if (dispatchError.isModule) {
                    const decoded = blockchainService.api.registry.findMetaError(
                      dispatchError.asModule
                    );
                    errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
                  }
                  
                  reject(new Error(errorMessage));
                  return;
                }
              });

              // Clean up subscription
              if (unsub) unsub();

              // Get the minted NFT ID from events or counter
              const nftId = this.nftCounter + 1;
              this.nftCounter = nftId;

              resolve({
                success: true,
                transactionHash: txHash,
                blockNumber: blockNumber,
                nftId: nftId,
                events: events
              });
            }

            if (result.isError) {
              if (unsub) unsub();
              reject(new Error('Transaction failed to execute'));
            }
          }
        )
        .then((unsubscribe) => {
          unsub = unsubscribe;
        })
        .catch((error) => {
          console.error('❌ Mint transaction error:', error);
          reject(error);
        });
    });
  }

  /**
   * Get transaction status
   * @param {string} txHash - Transaction hash
   */
  async getTransactionStatus(txHash) {
    const tx = await blockchainService.getTransaction(txHash);
    
    if (!tx) {
      return {
        found: false,
        status: 'pending'
      };
    }

    return {
      found: true,
      status: 'finalized',
      blockNumber: tx.blockNumber,
      blockHash: tx.blockHash
    };
  }

  /**
   * Get gas price estimate
   */
  async getGasPrice() {
    // Aleph Zero has relatively stable gas prices
    // This is a simplified estimate
    return {
      normal: '0.001 AZERO',
      fast: '0.002 AZERO',
      instant: '0.003 AZERO'
    };
  }

  /**
   * Get contract status
   */
  async getContractStatus() {
    try {
      await blockchainService.ensureInitialized();
      
      const [nftCount, owner, balance] = await Promise.all([
        this.getNftCount(),
        blockchainService.getContractOwner(),
        blockchainService.getBalance(blockchainService.signer.address)
      ]);

      return {
        isConnected: true,
        contractAddress: process.env.CONTRACT_ADDRESS,
        owner: owner,
        signerAddress: blockchainService.signer.address,
        signerBalance: blockchainService.formatBalance(balance),
        nftCount: nftCount,
        chain: blockchainService.api.runtimeChain.toString(),
        isOwner: owner === blockchainService.signer.address
      };
    } catch (error) {
      console.error('Error getting contract status:', error);
      return {
        isConnected: false,
        error: error.message
      };
    }
  }

  /**
   * Subscribe to NFT minted events
   * @param {Function} callback - Callback for minted events
   */
  async subscribeToMintedEvents(callback) {
    return await blockchainService.subscribeToContractEvents((event) => {
      if (event.name === 'NFTMinted') {
        callback({
          nftId: event.args.nft_id,
          lumaEventId: event.args.luma_event_id,
          recipient: event.args.recipient,
          metadata: event.args.metadata
        });
      }
    });
  }
}

// Create singleton instance
const contractService = new ContractService();

module.exports = {
  ContractService,
  contractService
};