import { initPolkadot, getSigner } from './wallet';
import { BN } from '@polkadot/util';

/**
 * BlockchainService - Handles all blockchain interactions with the deployed attendance NFT contract
 */
class BlockchainService {
  constructor() {
    this.initialized = false;
    this.api = null;
    this.contract = null;
  }

  /**
   * Initialize the blockchain connection
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) return;
    
    try {
      const { api, contract } = await initPolkadot();
      this.api = api;
      this.contract = contract;
      this.initialized = true;
      
      console.log('Blockchain service initialized with contract:', contract.address.toString());
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  /**
   * Mint NFT for the current user
   * @param {string} lumaEventId - The Luma event ID
   * @param {object} metadata - NFT metadata object
   * @returns {Promise<boolean>} Success status
   */
  async mintNFT(lumaEventId, metadata) {
    await this.init();
    
    const walletAddress = localStorage.getItem('wallet_address');
    if (!walletAddress) {
      throw new Error('No wallet connected');
    }
    
    try {
      console.log('Minting NFT for event:', lumaEventId);
      
      // Get signer for the wallet
      const signer = await getSigner(walletAddress);
      
      // Prepare metadata as JSON string
      const metadataString = JSON.stringify(metadata);
      
      // Check if user already has NFT for this event
      const { result: hasResult, output: hasOutput } = await this.contract.query.hasAttendedEvent(
        walletAddress,
        { value: 0, gasLimit: -1 },
        lumaEventId,
        walletAddress
      );
      
      if (hasResult.isOk && hasOutput.unwrap()) {
        throw new Error('You already have an NFT for this event');
      }
      
      // Estimate gas for the transaction
      const { gasRequired } = await this.contract.query.mintNft(
        walletAddress,
        { value: 0, gasLimit: -1 },
        lumaEventId,
        metadataString
      );
      
      // Execute the mint transaction
      const result = await this.contract.tx.mintNft(
        { value: 0, gasLimit: gasRequired },
        lumaEventId,
        metadataString
      ).signAndSend(walletAddress, { signer });
      
      return new Promise((resolve, reject) => {
        let unsubscribe;
        
        result.then((unsub) => {
          unsubscribe = unsub;
        }).catch(reject);
        
        // Listen for transaction events
        const timeout = setTimeout(() => {
          if (unsubscribe) unsubscribe();
          reject(new Error('Transaction timeout'));
        }, 60000); // 60 second timeout
        
        result.then((unsub) => {
          unsub((result) => {
            console.log('Transaction status:', result.status.type);
            
            if (result.status.isInBlock) {
              console.log('Transaction included in block:', result.status.asInBlock.toString());
            }
            
            if (result.status.isFinalized) {
              console.log('Transaction finalized:', result.status.asFinalized.toString());
              clearTimeout(timeout);
              if (unsubscribe) unsubscribe();
              
              // Check for errors in events
              const errorEvent = result.events.find(({ event }) => 
                this.api.events.system.ExtrinsicFailed.is(event)
              );
              
              if (errorEvent) {
                reject(new Error('Transaction failed'));
              } else {
                resolve(true);
              }
            }
            
            if (result.isError) {
              clearTimeout(timeout);
              if (unsubscribe) unsubscribe();
              reject(new Error('Transaction failed'));
            }
          });
        }).catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
    } catch (error) {
      console.error('Error minting NFT:', error);
      throw error;
    }
  }

  /**
   * Get NFTs owned by the current user from blockchain
   * @returns {Promise<Array>} List of NFTs
   */
  async getNFTs() {
    await this.init();
    
    const walletAddress = localStorage.getItem('wallet_address');
    if (!walletAddress) {
      return [];
    }
    
    try {
      console.log('Fetching NFTs for wallet:', walletAddress);
      
      // Query owned NFT IDs using the correct method name
      const { result, output } = await this.contract.query.getOwnedNfts(
        walletAddress,
        { value: 0, gasLimit: -1 },
        walletAddress
      );
      
      if (result.isErr) {
        console.error('Failed to get NFT IDs:', result.asErr);
        return [];
      }
      
      const nftIds = output.unwrap();
      console.log('Found NFT IDs:', nftIds.length);
      
      if (nftIds.length === 0) {
        return [];
      }
      
      const nfts = [];
      
      // Fetch each NFT by ID
      for (const id of nftIds) {
        const nftId = id.toNumber();
        const { result: nftResult, output: nftOutput } = await this.contract.query.getNft(
          walletAddress,
          { value: 0, gasLimit: -1 },
          nftId
        );
        
        if (nftResult.isOk && nftOutput.unwrap().isSome) {
          const nft = nftOutput.unwrap().unwrap();
          let metadata = {};
          
          try {
            metadata = JSON.parse(nft.metadata.toString());
          } catch (e) {
            console.warn('Failed to parse NFT metadata:', e);
            metadata = {
              name: `Attendance NFT #${nftId}`,
              description: 'Event attendance proof',
              image: 'https://via.placeholder.com/300x300/7c3aed/ffffff?text=NFT'
            };
          }
          
          nfts.push({
            id: `nft-${nftId}`,
            nft_id: nftId,
            owner: nft.owner.toString(),
            luma_event_id: nft.lumaEventId.toString(),
            metadata,
            minted_at: nft.mintedAt.toNumber(),
            created_at: new Date(nft.mintedAt.toNumber()).toISOString()
          });
        }
      }
      
      console.log('Fetched NFTs:', nfts.length);
      return nfts;
    } catch (error) {
      console.error('Error fetching NFTs from blockchain:', error);
      return [];
    }
  }

  /**
   * Get total NFT count
   * @returns {Promise<number>} Total NFT count
   */
  async getNFTCount() {
    await this.init();
    
    try {
      const { result, output } = await this.contract.query.getNftCount(
        localStorage.getItem('wallet_address') || '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        { value: 0, gasLimit: -1 }
      );
      
      if (result.isOk) {
        return output.unwrap().toNumber();
      }
      return 0;
    } catch (error) {
      console.error('Error getting NFT count:', error);
      return 0;
    }
  }

  /**
   * Check if user has attended a specific event
   * @param {string} lumaEventId - The Luma event ID
   * @param {string} userAddress - User's wallet address
   * @returns {Promise<boolean>} Whether user has attended
   */
  async hasAttendedEvent(lumaEventId, userAddress = null) {
    await this.init();
    
    const walletAddress = userAddress || localStorage.getItem('wallet_address');
    if (!walletAddress) {
      return false;
    }
    
    try {
      const { result, output } = await this.contract.query.hasAttendedEvent(
        walletAddress,
        { value: 0, gasLimit: -1 },
        lumaEventId,
        walletAddress
      );
      
      if (result.isOk) {
        return output.unwrap();
      }
      return false;
    } catch (error) {
      console.error('Error checking event attendance:', error);
      return false;
    }
  }

}

export const blockchainService = new BlockchainService();
export default blockchainService; 