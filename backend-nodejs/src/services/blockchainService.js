const { ApiPromise, WsProvider } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const { Keyring } = require('@polkadot/keyring');
const { cryptoWaitReady } = require('@polkadot/util-crypto');
const contractABI = require('../../config/contract-abi.json');
require('dotenv').config();

class BlockchainService {
  constructor() {
    this.api = null;
    this.contract = null;
    this.signer = null;
    this.keyring = null;
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Initialize blockchain connection and contract
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization();
    await this.initializationPromise;
  }

  async _performInitialization() {
    try {
      console.log('🔗 Initializing blockchain service...');

      // Ensure crypto is ready
      console.log('🔐 Step 1: Waiting for crypto...');
      await cryptoWaitReady();
      console.log('✅ Step 1: Crypto ready');

      // Connect to Aleph Zero testnet
      console.log('🌐 Step 2: Connecting to RPC...');
      const wsProvider = new WsProvider(process.env.POLKADOT_RPC_URL || 'wss://ws.test.azero.dev');
      console.log('🌐 Step 2a: WsProvider created');
      
      this.api = await ApiPromise.create({ 
        provider: wsProvider,
        types: {
          // Add any custom types if needed
        }
      });
      console.log('✅ Step 2: RPC connected');

      console.log(`🌐 Connected to ${this.api.runtimeChain} (${this.api.runtimeVersion})`);

      // Set up WebSocket reconnection handling
      this.setupWebSocketReconnection();

      // Initialize keyring with Polkadot SS58 format (prefix 0)
      console.log('🔑 Step 3: Creating keyring...');
      this.keyring = new Keyring({ type: 'sr25519', ss58Format: 0 });
      console.log('✅ Step 3: Keyring created');

      // Load signer account
      console.log('🔑 Step 4: Loading signer...');
      if (!process.env.SIGNER_MNEMONIC) {
        throw new Error('SIGNER_MNEMONIC not configured in environment');
      }

      this.signer = this.keyring.addFromMnemonic(process.env.SIGNER_MNEMONIC);
      console.log(`🔑 Signer address: ${this.signer.address}`);
      console.log('✅ Step 4: Signer loaded');

      // Check signer balance
      console.log('💰 Step 5: Checking balance...');
      console.log('💰 Step 5a: Calling api.query.system.account directly...');
      const { data: balance } = await this.api.query.system.account(this.signer.address);
      console.log('💰 Step 5b: Got balance data, formatting...');
      console.log(`💰 Signer balance: ${this.formatBalance(balance)}`);
      console.log('✅ Step 5: Balance checked');

      if (balance.free.isZero()) {
        console.warn('⚠️ WARNING: Signer account has zero balance!');
      }

      // Initialize contract
      console.log('📄 Step 6: Initializing contract...');
      if (!process.env.CONTRACT_ADDRESS) {
        throw new Error('CONTRACT_ADDRESS not configured in environment');
      }

      console.log(`📄 Step 6a: Contract address: ${process.env.CONTRACT_ADDRESS}`);
      this.contract = new ContractPromise(
        this.api,
        contractABI,
        process.env.CONTRACT_ADDRESS
      );
      console.log('✅ Step 6: Contract object created');

      console.log(`📄 Contract initialized at: ${process.env.CONTRACT_ADDRESS}`);

      this.isInitialized = true;
      console.log('✅ Blockchain service initialized successfully');

      // Try to verify contract owner (non-blocking)
      console.log('👤 Step 7: Starting contract owner verification (async)...');
      this.getContractOwner()
        .then(contractOwner => {
          if (contractOwner) {
            console.log(`👤 Contract owner: ${contractOwner}`);
            if (contractOwner !== this.signer.address) {
              console.warn(`⚠️ WARNING: Signer (${this.signer.address}) is not the contract owner!`);
            }
          } else {
            console.warn(`⚠️ WARNING: Could not determine contract owner (contract may not exist)`);
          }
        })
        .catch(error => {
          console.warn(`⚠️ WARNING: Contract owner verification failed: ${error.message}`);
        });

    } catch (error) {
      console.error('❌ Failed to initialize blockchain service:', error);
      this.isInitialized = false;
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Ensure service is initialized before use
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Get account balance
   * @param {string} address - Account address
   */
  async getBalance(address) {
    console.log(`💰 getBalance: Starting balance query for ${address}...`);
    await this.ensureInitialized();
    console.log(`💰 getBalance: Ensured initialized, calling api.query.system.account...`);
    const { data: balance } = await this.api.query.system.account(address);
    console.log(`💰 getBalance: Got balance data:`, balance.toHuman());
    return balance;
  }

  /**
   * Format balance for display
   * @param {Object} balance - Balance object from chain
   */
  formatBalance(balance) {
    try {
      const decimals = this.api.registry.chainDecimals[0] || 12;
      const unit = this.api.registry.chainTokens[0] || 'AZERO';
      
      // Convert to string and parse as number for simplicity
      const freeBalance = balance.free.toString();
      const divisor = Math.pow(10, decimals);
      const value = parseFloat(freeBalance) / divisor;
      
      return `${value.toFixed(4)} ${unit}`;
    } catch (error) {
      console.error('Error formatting balance:', error);
      return `${balance.free.toString()} (raw)`;
    }
  }

  /**
   * Get contract owner
   */
  async getContractOwner() {
    await this.ensureInitialized();
    
    try {
      const { output } = await this.contract.query.getOwner(
        this.signer.address,
        { gasLimit: -1 }
      );

      if (output && !output.isEmpty) {
        return output.toHuman();
      }
      return null;
    } catch (error) {
      console.error('Error getting contract owner:', error);
      return null;
    }
  }

  /**
   * Estimate gas for a transaction
   * @param {string} method - Contract method name
   * @param {Array} args - Method arguments
   */
  async estimateGas(method, args = []) {
    await this.ensureInitialized();

    try {
      const { gasRequired, result } = await this.contract.query[method](
        this.signer.address,
        { gasLimit: -1 },
        ...args
      );

      if (result.isErr) {
        throw new Error(`Gas estimation failed: ${result.asErr.toString()}`);
      }

      // Add 20% buffer to gas estimate
      const gasBuffer = gasRequired.refTime.toBn().muln(120).divn(100);
      
      return {
        gasLimit: {
          refTime: gasBuffer,
          proofSize: gasRequired.proofSize
        },
        gasRequired,
        estimatedFee: await this.estimateFee(gasRequired)
      };
    } catch (error) {
      console.error('Gas estimation error:', error);
      throw error;
    }
  }

  /**
   * Estimate transaction fee
   * @param {Object} gasRequired - Gas requirement object
   */
  async estimateFee(gasRequired) {
    // Aleph Zero fee calculation (simplified)
    // Actual fee calculation is complex and depends on weight
    const baseFee = 1_000_000_000; // 0.001 AZERO base
    const weightFee = gasRequired.refTime.toBn().muln(1000).divn(1_000_000_000);
    const totalFee = baseFee + weightFee.toNumber();
    
    return {
      estimated: totalFee,
      formatted: this.formatBalance({ free: totalFee })
    };
  }

  /**
   * Get current block number
   */
  async getCurrentBlock() {
    await this.ensureInitialized();
    const block = await this.api.rpc.chain.getBlock();
    return block.block.header.number.toNumber();
  }

  /**
   * Get transaction by hash
   * @param {string} txHash - Transaction hash
   */
  async getTransaction(txHash) {
    await this.ensureInitialized();
    
    try {
      // Get block hash where tx was included
      const blockHash = await this.api.rpc.chain.getBlockHash(txHash);
      if (!blockHash) {
        return null;
      }

      // Get block with extrinsics
      const signedBlock = await this.api.rpc.chain.getBlock(blockHash);
      
      // Find our transaction
      const tx = signedBlock.block.extrinsics.find(
        ex => ex.hash.toHex() === txHash
      );

      return tx ? {
        hash: txHash,
        blockNumber: signedBlock.block.header.number.toNumber(),
        blockHash: blockHash.toHex()
      } : null;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  }

  /**
   * Subscribe to new blocks
   * @param {Function} callback - Callback for new blocks
   */
  async subscribeToBlocks(callback) {
    await this.ensureInitialized();
    
    return await this.api.rpc.chain.subscribeNewHeads((header) => {
      callback({
        number: header.number.toNumber(),
        hash: header.hash.toHex(),
        parentHash: header.parentHash.toHex()
      });
    });
  }

  /**
   * Subscribe to contract events
   * @param {Function} callback - Callback for events
   */
  async subscribeToContractEvents(callback) {
    await this.ensureInitialized();

    return await this.api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;
        
        // Check if this is a contract event
        if (event.section === 'contracts' && event.method === 'ContractEmitted') {
          const [contractAddress, eventData] = event.data;
          
          // Check if it's from our contract
          if (contractAddress.toString() === process.env.CONTRACT_ADDRESS) {
            try {
              // Decode event data
              const decoded = this.contract.abi.decodeEvent(eventData);
              callback({
                name: decoded.event.identifier,
                args: decoded.args,
                raw: eventData.toHex()
              });
            } catch (error) {
              console.error('Error decoding contract event:', error);
            }
          }
        }
      });
    });
  }

  /**
   * Check if address is valid SS58
   * @param {string} address - Address to validate
   */
  isValidAddress(address) {
    try {
      const keyring = new Keyring({ type: 'sr25519', ss58Format: 0 });
      keyring.encodeAddress(
        keyring.decodeAddress(address)
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.api?.isConnected || false,
      isInitialized: this.isInitialized,
      chain: this.api?.runtimeChain?.toString() || null,
      version: this.api?.runtimeVersion?.toString() || null,
      signerAddress: this.signer?.address || null,
      contractAddress: process.env.CONTRACT_ADDRESS || null
    };
  }

  /**
   * Set up WebSocket reconnection handling
   */
  setupWebSocketReconnection() {
    if (!this.api || !this.api.rpc || !this.api.rpc.provider) return;

    this.api.rpc.provider.on('disconnected', () => {
      console.log('⚠️ WebSocket disconnected from blockchain');
      
      // Attempt to reconnect after a delay
      setTimeout(async () => {
        try {
          console.log('🔄 Attempting to reconnect to blockchain...');
          await this.api.rpc.provider.connect();
          console.log('✅ Reconnected to blockchain');
        } catch (error) {
          console.error('❌ Failed to reconnect to blockchain:', error.message);
          // Will try again on next disconnect event
        }
      }, 5000); // 5 second delay
    });

    this.api.rpc.provider.on('connected', () => {
      console.log('✅ WebSocket connected to blockchain');
    });

    this.api.rpc.provider.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
    });
  }

  /**
   * Disconnect from blockchain
   */
  async disconnect() {
    if (this.api) {
      await this.api.disconnect();
      this.api = null;
      this.contract = null;
      this.signer = null;
      this.isInitialized = false;
      console.log('🔌 Disconnected from blockchain');
    }
  }
}

// Create singleton instance
const blockchainService = new BlockchainService();

module.exports = {
  BlockchainService,
  blockchainService
};