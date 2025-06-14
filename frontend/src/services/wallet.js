import { web3Accounts, web3Enable, web3FromAddress } from '@polkadot/extension-dapp';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';

// Contract address from deployed contract on Aleph Zero
const CONTRACT_ADDRESS = '5E8w158E63XVHVRVg95LUFi3KD5i4LDHQUehsr6UQHzqZLDN';
// Polkadot RPC endpoint
const RPC_ENDPOINT = process.env.REACT_APP_POLKADOT_RPC || 'wss://ws.test.azero.dev';
const APP_NAME = 'Polkadot Attendance NFT';

// Contract ABI
let contractAbi = null;

// Initialize Polkadot API and extension
export const initPolkadot = async () => {
  try {
    // Load contract ABI
    if (!contractAbi) {
      const response = await fetch('/contract-abi.json');
      if (!response.ok) {
        throw new Error('Failed to load contract ABI');
      }
      contractAbi = await response.json();
    }

    // Enable the extension
    const extensions = await web3Enable(APP_NAME);

    if (extensions.length === 0) {
      throw new Error('No extension found. Please install the Polkadot.js extension.');
    }

    // Connect to Polkadot node
    const provider = new WsProvider(RPC_ENDPOINT);
    const api = await ApiPromise.create({ provider });
    
    // Initialize contract
    const contract = new ContractPromise(api, contractAbi, CONTRACT_ADDRESS);

    return { api, extensions, contract };
  } catch (error) {
    console.error('Failed to initialize Polkadot connection:', error);
    throw error;
  }
};

// Get accounts from extension
export const getAccounts = async () => {
  try {
    await web3Enable(APP_NAME);
    const accounts = await web3Accounts();

    return accounts.map(account => ({
      address: account.address,
      name: account.meta.name || '',
    }));
  } catch (error) {
    console.error('Failed to get accounts:', error);
    throw error;
  }
};

// Get signer for an account
export const getSigner = async (address) => {
  try {
    await web3Enable(APP_NAME);
    const injector = await web3FromAddress(address);
    return injector.signer;
  } catch (error) {
    console.error('Failed to get signer:', error);
    throw error;
  }
};

// Check if the Polkadot.js extension is installed
export const checkExtension = async () => {
  try {
    const extensions = await web3Enable(APP_NAME);
    return extensions.length > 0;
  } catch (error) {
    return false;
  }
};

// Format address for display
export const formatAddress = (address) => {
  if (!address) return '';

  if (address.length > 13) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  return address;
};