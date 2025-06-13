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

module.exports = { LumaClient };