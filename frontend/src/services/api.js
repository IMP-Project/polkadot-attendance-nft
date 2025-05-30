import axios from 'axios';
import blockchainService from './blockchainService';

// Use environment variable if available, otherwise use the correct deployed backend URL
const BASE_URL = process.env.REACT_APP_API_URL || 'https://polkadot-attendance-nft-api-bpa5.onrender.com';

// Maximum number of retries for API calls
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Enable mock mode for development only
// In production with a real backend, set this to false
const USE_MOCK_BY_DEFAULT = false;
if (localStorage.getItem('use_mock_data') === null) {
  localStorage.setItem('use_mock_data', USE_MOCK_BY_DEFAULT.toString());
}

// Mock data for development/offline use
const MOCK_DATA = {
  events: [],
  nfts: [
    {
      id: 'nft-001',
      owner: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      metadata: {
        name: 'Polkadot Conference Attendance',
        description: 'Attended Polkadot Conference 2023',
        image: 'https://via.placeholder.com/300',
        event_id: 'event-001',
        attributes: [
          { trait_type: 'Event', value: 'Polkadot Conference 2023' },
          { trait_type: 'Date', value: '2023-11-15' }
        ]
      },
      created_at: '2023-11-15T15:30:00Z'
    },
    {
      id: 'nft-002',
      owner: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      metadata: {
        name: 'Blockchain Workshop Attendance',
        description: 'Attended Blockchain Workshop',
        image: 'https://via.placeholder.com/300',
        event_id: 'event-002',
        attributes: [
          { trait_type: 'Event', value: 'Blockchain Workshop' },
          { trait_type: 'Date', value: '2023-12-10' }
        ]
      },
      created_at: '2023-12-10T17:45:00Z'
    }
  ]
};

// Initialize persistent mock data from localStorage or use defaults
const initMockData = () => {
  // Check if this is the first time loading the app
  if (!localStorage.getItem('mock_data_initialized')) {
    // Initialize the flag to prevent this from running again
    localStorage.setItem('mock_data_initialized', 'true');
    
    // Start with empty events data
    localStorage.setItem('mock_events', JSON.stringify([]));
    MOCK_DATA.events = [];
    
    // Start with empty NFTs data for a clean experience
    localStorage.setItem('mock_nfts', JSON.stringify([]));
    MOCK_DATA.nfts = [];
    
    console.log('Initialized with empty events and NFTs');
  } else {
    // Get events from localStorage
    const savedEvents = localStorage.getItem('mock_events');
    if (savedEvents) {
      MOCK_DATA.events = JSON.parse(savedEvents);
    }
    
    // Get NFTs from localStorage
    const savedNFTs = localStorage.getItem('mock_nfts');
    if (savedNFTs) {
      MOCK_DATA.nfts = JSON.parse(savedNFTs);
    }
  }
};

// Run initialization
initMockData();

// Create axios instance with common configuration
const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Add request interceptor to add auth token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper function to check if JWT token is valid and not expired
const isValidJWT = (token) => {
  if (!token) return false;
  
  try {
    // Decode JWT payload (base64 decode the middle part)
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.log('Token has expired');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Invalid JWT token:', error);
    return false;
  }
};

// Check if mock mode is enabled or if there's a connection error to the backend
const isMockDataEnabled = () => {
  return localStorage.getItem('use_mock_data') === 'true';
};

// Set mock mode
const setMockMode = (enabled) => {
  localStorage.setItem('use_mock_data', enabled ? 'true' : 'false');
};

// API call with retry logic
const apiCallWithRetry = async (apiCall, mockResponse, retries = 0) => {
  // If mock mode is enabled, return mock data immediately
  if (isMockDataEnabled()) {
    console.log('Using mock data:', mockResponse);
    return typeof mockResponse === 'function' ? mockResponse() : mockResponse;
  }
  
  try {
    return await apiCall();
  } catch (error) {
    // Only retry certain types of errors (network errors, 5xx responses)
    const isNetworkError = !error.response;
    const isServerError = error.response && error.response.status >= 500;
    
    if ((isNetworkError || isServerError) && retries < MAX_RETRIES) {
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries)));
      
      // Retry with an incremented counter
      return apiCallWithRetry(apiCall, mockResponse, retries + 1);
    }
    
    console.warn('API call failed after retries, falling back to mock data');
    if (mockResponse) {
      setMockMode(true); // Auto-enable mock mode after failures
      return typeof mockResponse === 'function' ? mockResponse() : mockResponse;
    }
    
    // If we've exhausted retries and no mock data, throw it
    throw error;
  }
};

// Create API object with all methods
export const api = {
  // NEW: Wallet login method for your backend
  login: async (walletAddress) => {
    if (isMockDataEnabled()) {
      // Mock login - create fake token
      const mockToken = `mock_${Date.now()}_${walletAddress.substring(0, 8)}`;
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('wallet_address', walletAddress);
      localStorage.setItem('user_id', '1');
      localStorage.setItem('auth_mode', 'mock');
      return {
        token: mockToken,
        user: { id: 1, wallet_address: walletAddress }
      };
    }
    
    try {
      const response = await apiClient.post('/login', { 
        wallet_address: walletAddress
      });
      
      // Store the real token and user data
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('wallet_address', walletAddress);
      localStorage.setItem('user_id', response.data.user.id.toString());
      localStorage.setItem('auth_mode', 'api');
      
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },
  
  // OLD: Keep for backwards compatibility but update it
  authenticate: async (walletAddress, message, signature) => {
    // Redirect to new login method for wallet addresses
    if (walletAddress && !message && !signature) {
      return api.login(walletAddress);
    }
    
    if (isMockDataEnabled()) {
      return { token: 'mock_token_' + Date.now() };
    }
    
    try {
      const response = await apiClient.post('/auth', { 
        walletAddress, 
        message, 
        signature 
      });
      return response.data;
    } catch (error) {
      console.warn('Authentication failed, using mock token');
      return { token: 'mock_token_' + Date.now() };
    }
  },
  
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('user_id');
    localStorage.removeItem('auth_mode');
  },
  
  // UPDATED: Better authentication check
  isAuthenticated: () => {
    const token = localStorage.getItem('auth_token');
    const authMode = localStorage.getItem('auth_mode');
    
    if (!token) return false;
    
    // If we're in mock mode, just check if token exists
    if (authMode === 'mock' || authMode === 'manual') {
      return !!token;
    }
    
    // For real API tokens, validate JWT
    if (authMode === 'api') {
      return isValidJWT(token);
    }
    
    // Default: check if token exists
    return !!token;
  },
  
  getCurrentWallet: () => {
    return localStorage.getItem('wallet_address');
  },
  
  getCurrentUserId: () => {
    return localStorage.getItem('user_id');
  },
  
  // Mock data control
  enableMockMode: () => setMockMode(true),
  disableMockMode: () => setMockMode(false),
  isMockModeEnabled: () => isMockDataEnabled(),
  
  // Reset data
  resetAllEvents: () => {
    // Clear all events
    localStorage.setItem('mock_events', JSON.stringify([]));
    MOCK_DATA.events = [];
    console.log('All events have been reset');
    return { success: true, message: 'All events have been cleared' };
  },
  
  // Events
  getEvents: async () => {
    // Try to get from blockchain first if mock mode is off
    if (!isMockDataEnabled()) {
      try {
        return await blockchainService.getEvents();
      } catch (error) {
        console.error('Blockchain getEvents failed, falling back to API:', error);
      }
    }
    
    return apiCallWithRetry(
      async () => {
        const response = await apiClient.get('/admin/events');
        return response.data;
      },
      MOCK_DATA.events
    );
  },
  
  getEvent: async (id) => {
    // For blockchain, we would need to query the specific event by ID
    // Currently, we'll get all events and filter
    if (!isMockDataEnabled()) {
      try {
        const events = await blockchainService.getEvents();
        const event = events.find(e => e.id === id);
        if (event) return event;
      } catch (error) {
        console.error('Blockchain getEvent failed, falling back to API:', error);
      }
    }
    
    return apiCallWithRetry(
      async () => {
        const response = await apiClient.get(`/admin/events/${id}`);
        return response.data;
      },
      () => MOCK_DATA.events.find(event => event.id === id) || null
    );
  },
  
  createEvent: async (eventData) => {
    // Try blockchain first if mock mode is off
    if (!isMockDataEnabled()) {
      try {
        return await blockchainService.createEvent(eventData);
      } catch (error) {
        console.error('Blockchain createEvent failed, falling back to API:', error);
      }
    }
    
    // Generate a timestamp and random ID outside of the retry logic
    // to ensure consistency even if the function is called multiple times
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 10000);
    const eventId = `event-${timestamp}-${randomId}`;
    
    return apiCallWithRetry(
      async () => {
        const response = await apiClient.post('/admin/events', eventData);
        return response.data;
      },
      () => {
        console.log('Creating mock event:', eventData);
        
        // Get events from local storage to ensure we have the latest data
        const storedEvents = JSON.parse(localStorage.getItem('mock_events') || '[]');
        
        // Enhanced duplicate check - trim whitespace and compare case-insensitive
        const normalizedName = eventData.name.trim().toLowerCase();
        const isDuplicate = storedEvents.some(
          event => event.name.trim().toLowerCase() === normalizedName
        );
        
        if (isDuplicate) {
          console.warn("Preventing duplicate event creation:", eventData.name);
          // Return the existing event
          return storedEvents.find(
            event => event.name.trim().toLowerCase() === normalizedName
          );
        }
        
        // Create a new event with the pre-generated ID to ensure consistency
        const newEvent = {
          id: eventId,
          ...eventData,
          created_at: new Date().toISOString()
        };
        
        // Add to stored events
        const updatedEvents = [...storedEvents, newEvent];
        
        // Save to localStorage for persistence
        localStorage.setItem('mock_events', JSON.stringify(updatedEvents));
        
        // Update in-memory mock data to match localStorage
        MOCK_DATA.events = updatedEvents;
        
        return newEvent;
      }
    );
  },
  
  // NFTs
  getNFTs: async () => {
    // Try blockchain first if mock mode is off
    if (!isMockDataEnabled()) {
      try {
        return await blockchainService.getNFTs();
      } catch (error) {
        console.error('Blockchain getNFTs failed, falling back to API:', error);
      }
    }
    
    return apiCallWithRetry(
      async () => {
        const response = await apiClient.get('/admin/nfts');
        return response.data;
      },
      () => {
        // Get any locally created mock NFTs and combine with predefined mock data
        const localNfts = JSON.parse(localStorage.getItem('mock_nfts') || '[]');
        return [...MOCK_DATA.nfts, ...localNfts];
      }
    );
  },
  
  getNFTsByEvent: async (eventId) => {
    // Get all NFTs and filter by event ID
    if (!isMockDataEnabled()) {
      try {
        const allNfts = await blockchainService.getNFTs();
        return allNfts.filter(nft => 
          nft.metadata && nft.metadata.event_id === eventId
        );
      } catch (error) {
        console.error('Blockchain getNFTsByEvent failed, falling back to API:', error);
      }
    }
    
    return apiCallWithRetry(
      async () => {
        const response = await apiClient.get('/admin/nfts');
        return response.data.filter(nft => 
          nft.metadata && nft.metadata.event_id === eventId
        );
      },
      () => MOCK_DATA.nfts.filter(nft => 
        nft.metadata && nft.metadata.event_id === eventId
      )
    );
  },
  
  createNFT: async (nftData) => {
    // For createNFT, we'll use the nftMintingService directly
    // This method remains for compatibility
    return apiCallWithRetry(
      async () => {
        const response = await apiClient.post('/admin/nfts', nftData);
        return response.data;
      },
      () => {
        const newNFT = {
          id: `nft-${Date.now()}`,
          ...nftData,
          created_at: new Date().toISOString()
        };
        MOCK_DATA.nfts.push(newNFT);
        return newNFT;
      }
    );
  },
  
  mintNFT: async (eventId, attendeeData) => {
    // This will now be handled by nftMintingService
    return apiCallWithRetry(
      async () => {
        const response = await apiClient.post(`/admin/events/${eventId}/mint`, attendeeData);
        return response.data;
      },
      () => {
        const event = MOCK_DATA.events.find(e => e.id === eventId);
        if (!event) {
          throw new Error('Event not found');
        }
        
        const newNFT = {
          id: `nft-${Date.now()}`,
          owner: attendeeData.walletAddress || localStorage.getItem('wallet_address'),
          metadata: {
            name: `${event.name} Attendance`,
            description: `Attended ${event.name}`,
            image: 'https://via.placeholder.com/300',
            event_id: eventId,
            attributes: [
              { trait_type: 'Event', value: event.name },
              { trait_type: 'Date', value: event.date }
            ]
          },
          created_at: new Date().toISOString()
        };
        MOCK_DATA.nfts.push(newNFT);
        return newNFT;
      }
    );
  },
  
  batchMintNFTs: async (eventId, attendeesData) => {
    // Batch minting should use nftMintingService.batchMintNFTs
    return apiCallWithRetry(
      async () => {
        const response = await apiClient.post(`/admin/events/${eventId}/batch-mint`, { attendees: attendeesData });
        return response.data;
      },
      () => {
        const event = MOCK_DATA.events.find(e => e.id === eventId);
        if (!event) {
          throw new Error('Event not found');
        }
        
        const newNFTs = attendeesData.map((attendee, index) => ({
          id: `nft-${Date.now()}-${index}`,
          owner: attendee.walletAddress,
          metadata: {
            name: `${event.name} Attendance`,
            description: `Attended ${event.name}`,
            image: 'https://via.placeholder.com/300',
            event_id: eventId,
            attributes: [
              { trait_type: 'Event', value: event.name },
              { trait_type: 'Date', value: event.date },
              { trait_type: 'Attendee', value: attendee.name || 'Unknown' }
            ]
          },
          created_at: new Date().toISOString()
        }));
        
        MOCK_DATA.nfts.push(...newNFTs);
        return { success: true, minted: newNFTs.length, nfts: newNFTs };
      }
    );
  },
  
  configureWebhook: async (eventId, webhookUrl) => {
    return apiCallWithRetry(
      async () => {
        const response = await apiClient.post(`/admin/events/${eventId}/webhook`, { url: webhookUrl });
        return response.data;
      },
      { success: true, message: 'Webhook configured (mock)' }
    );
  },
  
  testWebhook: async (eventId) => {
    return apiCallWithRetry(
      async () => {
        const response = await apiClient.post(`/admin/events/${eventId}/test-webhook`);
        return response.data;
      },
      { success: true, message: 'Test webhook sent (mock)' }
    );
  },
  
  // UPDATED: Better health check that doesn't auto-enable mock mode
  checkHealth: async () => {
    if (isMockDataEnabled()) {
      return true;
    }
    
    try {
      // First check backend API (most important)
      const response = await apiClient.get('/health');
      const isBackendHealthy = response.data.status === 'ok';
      
      if (isBackendHealthy) {
        console.log('Backend API connection successful');
        
        // Then check blockchain connection (optional)
        try {
          await blockchainService.init();
          console.log('Blockchain connection successful');
        } catch (error) {
          console.warn('Blockchain connection failed, but backend API is working:', error);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Health check failed:', error);
      // Don't auto-enable mock mode - let the user decide
      return false;
    }
  }
};