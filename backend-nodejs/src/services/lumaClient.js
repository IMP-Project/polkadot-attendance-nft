const axios = require('axios');

/**
 * Simple Luma API Client
 * Based on documentation: https://docs.lu.ma/reference/getting-started-with-your-api
 */
class LumaClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.lu.ma';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'x-luma-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Test API connection by getting user info
   */
  async testConnection() {
    try {
      const response = await this.client.get('/public/v1/user/get-self');
      return {
        success: true,
        user: response.data.user
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status
      };
    }
  }

  /**
   * Get events from calendar
   */
  async getEvents() {
    try {
      const response = await this.client.get('/public/v1/calendar/list-events');
      return {
        success: true,
        events: response.data.entries || [],
        has_more: response.data.has_more || false
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status
      };
    }
  }

  /**
   * Get guests for a specific event (with pagination and check-in data)
   */
  async getEventGuests(eventApiId) {
    try {
      const response = await this.client.get('/public/v1/event/get-guests', {
        params: { 
          event_api_id: eventApiId,
          pagination_limit: 500
        }
      });
      
      // Extract guests from entries structure
      const guests = (response.data.entries || []).map(entry => entry.guest);
      
      return {
        success: true,
        guests: guests,
        has_more: response.data.has_more || false
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status
      };
    }
  }
}

/**
 * Create a LumaClient instance for a specific user
 * @param {string} userId - Database user ID
 * @returns {Promise<LumaClient>} Configured LumaClient instance
 */
async function createLumaClientForUser(userId) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      lumaApiKey: true,
      lumaConnectedAt: true
    }
  });

  if (!user || !user.lumaApiKey || !user.lumaConnectedAt) {
    throw new Error(`User ${userId} does not have Luma integration configured`);
  }

  await prisma.$disconnect();
  return new LumaClient(user.lumaApiKey);
}

/**
 * Transform Luma check-in data to our database format
 * @param {Object} lumaCheckIn - Check-in data from Luma API
 * @param {string} eventId - Database event ID
 * @returns {Object} Transformed check-in data
 */
function transformLumaCheckIn(lumaCheckIn, eventId) {
  return {
    lumaCheckInId: lumaCheckIn.checkin_id,
    eventId: eventId,
    attendeeName: lumaCheckIn.user?.name || 'Unknown',
    attendeeEmail: lumaCheckIn.user?.email || null,
    checkedInAt: new Date(lumaCheckIn.created_at),
    location: lumaCheckIn.location || null,
    walletAddress: lumaCheckIn.user?.wallet_address || null,
    metadata: {
      lumaUserId: lumaCheckIn.user?.user_api_id,
      lumaEventId: lumaCheckIn.event_api_id,
      checkInSource: 'luma'
    }
  };
}

/**
 * Transform Luma event data to our database format
 * @param {Object} lumaEvent - Event data from Luma API
 * @param {string} userId - Database user ID
 * @returns {Object} Transformed event data
 */
function transformLumaEvent(lumaEvent, userId) {
  return {
    lumaEventId: lumaEvent.event_api_id,
    userId: userId,
    name: lumaEvent.name || 'Untitled Event',
    description: lumaEvent.description || null,
    startTime: lumaEvent.start_at ? new Date(lumaEvent.start_at) : null,
    endTime: lumaEvent.end_at ? new Date(lumaEvent.end_at) : null,
    location: lumaEvent.geo_address_info?.full_address || null,
    timezone: lumaEvent.timezone || null,
    lumaUrl: lumaEvent.url || null,
    metadata: {
      lumaEventData: lumaEvent
    }
  };
}

module.exports = { 
  LumaClient, 
  createLumaClientForUser, 
  transformLumaCheckIn,
  transformLumaEvent 
};