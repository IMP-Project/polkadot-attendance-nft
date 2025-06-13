const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class SyncErrorHandler {
  constructor() {
    this.maxRetries = 3;
    this.retryDelays = [1000, 5000, 15000]; // 1s, 5s, 15s
    this.circuitBreakerThreshold = 5; // failures before circuit breaker opens
    this.circuitBreakerResetTime = 300000; // 5 minutes
    this.userCircuitBreakers = new Map(); // userId -> circuit breaker state
  }

  /**
   * Handle sync error with retry logic
   * @param {string} userId - User ID
   * @param {string} syncType - 'events' or 'checkins'
   * @param {Function} syncFunction - Function to retry
   * @param {Object} context - Additional context for error handling
   */
  async handleSyncWithRetry(userId, syncType, syncFunction, context = {}) {
    const maxAttempts = this.maxRetries + 1;
    let lastError = null;

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(userId, syncType)) {
      const error = new Error(`Circuit breaker open for user ${userId} ${syncType} sync`);
      await this.logSyncError(userId, syncType, error, context);
      throw error;
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 Sync attempt ${attempt}/${maxAttempts} for user ${userId} (${syncType})`);
        
        const result = await syncFunction();
        
        // Success - reset circuit breaker
        this.resetCircuitBreaker(userId, syncType);
        
        // Log successful sync
        await this.logSyncSuccess(userId, syncType, result, context);
        
        return result;

      } catch (error) {
        lastError = error;
        console.error(`❌ Sync attempt ${attempt}/${maxAttempts} failed for user ${userId} (${syncType}):`, error.message);

        // Determine if error is retryable
        const isRetryable = this.isRetryableError(error);
        
        if (!isRetryable || attempt === maxAttempts) {
          // Final failure or non-retryable error
          await this.handleFinalSyncFailure(userId, syncType, error, context, attempt);
          throw error;
        }

        // Wait before retry (exponential backoff with jitter)
        const delay = this.retryDelays[attempt - 1] || this.retryDelays[this.retryDelays.length - 1];
        const jitteredDelay = delay + Math.random() * 1000; // Add up to 1s jitter
        
        console.log(`⏳ Waiting ${Math.round(jitteredDelay)}ms before retry...`);
        await this.delay(jitteredDelay);
      }
    }

    throw lastError;
  }

  /**
   * Determine if an error is retryable
   * @param {Error} error - The error to check
   */
  isRetryableError(error) {
    const message = error.message.toLowerCase();
    const statusCode = error.response?.status;

    // Network errors are retryable
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND' ||
        message.includes('network') ||
        message.includes('timeout')) {
      return true;
    }

    // HTTP status codes that are retryable
    if (statusCode) {
      // Rate limiting
      if (statusCode === 429) return true;
      
      // Server errors
      if (statusCode >= 500) return true;
      
      // Some 4xx errors that might be temporary
      if (statusCode === 408 || statusCode === 409) return true;
    }

    // Luma API specific errors that are retryable
    if (message.includes('rate limit') || 
        message.includes('temporarily unavailable') ||
        message.includes('service unavailable')) {
      return true;
    }

    // Database connection errors
    if (message.includes('database') && 
        (message.includes('connection') || message.includes('timeout'))) {
      return true;
    }

    return false;
  }

  /**
   * Handle final sync failure after all retries
   * @param {string} userId - User ID
   * @param {string} syncType - 'events' or 'checkins'
   * @param {Error} error - The final error
   * @param {Object} context - Additional context
   * @param {number} attempts - Number of attempts made
   */
  async handleFinalSyncFailure(userId, syncType, error, context, attempts) {
    console.error(`💥 Final sync failure for user ${userId} (${syncType}) after ${attempts} attempts:`, error);

    // Update circuit breaker
    this.recordCircuitBreakerFailure(userId, syncType);

    // Log the error
    await this.logSyncError(userId, syncType, error, { ...context, attempts });

    // Update user/event with error information
    if (syncType === 'events') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          syncError: `Event sync failed: ${error.message}`,
          lastEventSyncAt: new Date()
        }
      }).catch(dbError => {
        console.error('Failed to update user sync error:', dbError);
      });
    } else if (syncType === 'checkins') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          checkInSyncError: `Check-in sync failed: ${error.message}`,
          lastCheckInSyncAt: new Date()
        }
      }).catch(dbError => {
        console.error('Failed to update user check-in sync error:', dbError);
      });
    }

    // Send notification if critical error
    if (this.isCriticalError(error)) {
      await this.sendCriticalErrorNotification(userId, syncType, error);
    }
  }

  /**
   * Check if circuit breaker is open for a user/sync type
   * @param {string} userId - User ID
   * @param {string} syncType - Sync type
   */
  isCircuitBreakerOpen(userId, syncType) {
    const key = `${userId}:${syncType}`;
    const state = this.userCircuitBreakers.get(key);
    
    if (!state) return false;
    
    if (state.isOpen) {
      // Check if reset time has passed
      if (Date.now() - state.openedAt > this.circuitBreakerResetTime) {
        this.resetCircuitBreaker(userId, syncType);
        return false;
      }
      return true;
    }
    
    return false;
  }

  /**
   * Record a circuit breaker failure
   * @param {string} userId - User ID
   * @param {string} syncType - Sync type
   */
  recordCircuitBreakerFailure(userId, syncType) {
    const key = `${userId}:${syncType}`;
    const state = this.userCircuitBreakers.get(key) || { failures: 0, isOpen: false };
    
    state.failures++;
    state.lastFailureAt = Date.now();
    
    if (state.failures >= this.circuitBreakerThreshold) {
      state.isOpen = true;
      state.openedAt = Date.now();
      console.warn(`🔴 Circuit breaker opened for user ${userId} (${syncType}) after ${state.failures} failures`);
    }
    
    this.userCircuitBreakers.set(key, state);
  }

  /**
   * Reset circuit breaker for a user/sync type
   * @param {string} userId - User ID
   * @param {string} syncType - Sync type
   */
  resetCircuitBreaker(userId, syncType) {
    const key = `${userId}:${syncType}`;
    const state = this.userCircuitBreakers.get(key);
    
    if (state && state.isOpen) {
      console.log(`🟢 Circuit breaker reset for user ${userId} (${syncType})`);
    }
    
    this.userCircuitBreakers.set(key, { failures: 0, isOpen: false });
  }

  /**
   * Log successful sync
   * @param {string} userId - User ID
   * @param {string} syncType - Sync type
   * @param {Object} result - Sync result
   * @param {Object} context - Additional context
   */
  async logSyncSuccess(userId, syncType, result, context) {
    // Log to console
    console.log(`✅ Sync success for user ${userId} (${syncType}):`, {
      ...result,
      context
    });

    // Could also log to database or external monitoring service here
  }

  /**
   * Log sync error
   * @param {string} userId - User ID
   * @param {string} syncType - Sync type
   * @param {Error} error - The error
   * @param {Object} context - Additional context
   */
  async logSyncError(userId, syncType, error, context) {
    const errorLog = {
      userId,
      syncType,
      error: error.message,
      stack: error.stack,
      statusCode: error.response?.status,
      context,
      timestamp: new Date().toISOString()
    };

    // Log to console
    console.error(`💥 Sync error for user ${userId} (${syncType}):`, errorLog);

    // Could also log to database, external monitoring, or alerting service here
    // For now, we'll just use console logging
  }

  /**
   * Check if error is critical and needs immediate attention
   * @param {Error} error - The error to check
   */
  isCriticalError(error) {
    const message = error.message.toLowerCase();
    
    // API authentication errors are critical
    if (message.includes('unauthorized') || 
        message.includes('invalid api key') ||
        message.includes('authentication failed')) {
      return true;
    }

    // Database connection errors are critical
    if (message.includes('database') && 
        message.includes('connection')) {
      return true;
    }

    return false;
  }

  /**
   * Send critical error notification
   * @param {string} userId - User ID
   * @param {string} syncType - Sync type
   * @param {Error} error - The critical error
   */
  async sendCriticalErrorNotification(userId, syncType, error) {
    // For now, just log critical errors
    // In production, this could send emails, Slack notifications, etc.
    console.error(`🚨 CRITICAL ERROR for user ${userId} (${syncType}):`, {
      error: error.message,
      timestamp: new Date().toISOString(),
      userId,
      syncType
    });
  }

  /**
   * Get error statistics
   */
  async getErrorStats() {
    const circuitBreakerStats = Array.from(this.userCircuitBreakers.entries()).map(([key, state]) => {
      const [userId, syncType] = key.split(':');
      return {
        userId,
        syncType,
        failures: state.failures,
        isOpen: state.isOpen,
        lastFailureAt: state.lastFailureAt ? new Date(state.lastFailureAt).toISOString() : null,
        openedAt: state.openedAt ? new Date(state.openedAt).toISOString() : null
      };
    });

    return {
      circuitBreakers: circuitBreakerStats,
      config: {
        maxRetries: this.maxRetries,
        retryDelays: this.retryDelays,
        circuitBreakerThreshold: this.circuitBreakerThreshold,
        circuitBreakerResetTime: this.circuitBreakerResetTime
      }
    };
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
const syncErrorHandler = new SyncErrorHandler();

module.exports = {
  SyncErrorHandler,
  syncErrorHandler
};