import axios from 'axios';

// Use environment variable if available, otherwise use the correct deployed backend URL
const BASE_URL = process.env.REACT_APP_API_URL || 'https://polkadot-attendance-nft-api-bpa5.onrender.com';

// Maximum number of retries for API calls
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

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

// API call with retry logic
const apiCallWithRetry = async (apiCall, retries = 0) => {
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
      return apiCallWithRetry(apiCall, retries + 1);
    }
    
    // If we've exhausted retries, throw the error
    throw error;
  }
};

// Create API object with all methods
export const api = {
  // Wallet login method
  login: async (walletAddress) => {
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
  
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('user_id');
    localStorage.removeItem('auth_mode');
  },
  
  isAuthenticated: () => {
    const token = localStorage.getItem('auth_token');
    const authMode = localStorage.getItem('auth_mode');
    
    if (!token) return false;
    
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
  
  // Events
  getEvents: async () => {
    return apiCallWithRetry(async () => {
      const response = await apiClient.get('/user/events');
      return response.data;
    });
  },
  
  getEvent: async (id) => {
    return apiCallWithRetry(async () => {
      const response = await apiClient.get(`/admin/events/${id}`);
      return response.data;
    });
  },
  
  createEvent: async (eventData) => {
    return apiCallWithRetry(async () => {
      const response = await apiClient.post('/admin/events', eventData);
      return response.data;
    });
  },
  
  // NFTs
  getNFTs: async () => {
    return apiCallWithRetry(async () => {
      const response = await apiClient.get('/admin/nfts');
      return response.data;
    });
  },
  
  getNFTsByEvent: async (eventId) => {
    return apiCallWithRetry(async () => {
      const response = await apiClient.get(`/user/events/${eventId}/nfts`);
      return response.data.nfts || [];
    });
  },
  
  createNFT: async (nftData) => {
    return apiCallWithRetry(async () => {
      const response = await apiClient.post('/admin/nfts', nftData);
      return response.data;
    });
  },
  
  mintNFT: async (eventId, attendeeData) => {
    return apiCallWithRetry(async () => {
      const response = await apiClient.post(`/admin/events/${eventId}/mint`, attendeeData);
      return response.data;
    });
  },
  
  batchMintNFTs: async (eventId, attendeesData) => {
    return apiCallWithRetry(async () => {
      const response = await apiClient.post(`/admin/events/${eventId}/batch-mint`, { attendees: attendeesData });
      return response.data;
    });
  },
  
  configureWebhook: async (eventId, webhookUrl) => {
    return apiCallWithRetry(async () => {
      const response = await apiClient.post(`/admin/events/${eventId}/webhook`, { url: webhookUrl });
      return response.data;
    });
  },
  
  testWebhook: async (eventId) => {
    return apiCallWithRetry(async () => {
      const response = await apiClient.post(`/admin/events/${eventId}/test-webhook`);
      return response.data;
    });
  },
  
  checkHealth: async () => {
    try {
      const response = await apiClient.get('/health');
      return response.data.status === 'ok';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  },

  // Get check-in count for a specific event
  async getEventCheckInCount(eventId) {
    const response = await apiClient.get(`/user/events/${eventId}/check-ins/count`);
    return response.data;
  },

  // Get check-in counts for all events
  async getAllEventCheckInCounts() {
    const response = await apiClient.get('/user/events/check-ins/counts');
    return response.data;
  },

  // Add this to the api object
getEventCheckIns: async (eventId) => {
  return apiCallWithRetry(async () => {
    const response = await apiClient.get(`/user/events/${eventId}/check-ins`);
    return response.data;
  });
},

  // Design API methods
  async createDesign(designData) {
    return apiCallWithRetry(async () => {
      const response = await apiClient.post('/user/designs', designData);
      return response.data;
    });
  },

  async getEventDesigns(eventId) {
    return apiCallWithRetry(async () => {
      const response = await apiClient.get(`/user/events/${eventId}/designs`);
      return response.data;
    });
  },

  async getDesign(designId) {
    return apiCallWithRetry(async () => {
      const response = await apiClient.get(`/user/designs/${designId}`);
      return response.data;
    });
  },

  async deleteDesign(designId) {
    return apiCallWithRetry(async () => {
      const response = await apiClient.delete(`/user/designs/${designId}`);
      return response.data;
    });
  }
};