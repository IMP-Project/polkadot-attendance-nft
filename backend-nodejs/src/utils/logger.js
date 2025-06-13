const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'INFO';
  }

  formatMessage(level, message, extra = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...extra
    };
    
    return JSON.stringify(logEntry);
  }

  writeToFile(level, formattedMessage) {
    if (process.env.NODE_ENV === 'development') return; // Skip file logging in dev
    
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `${date}.log`);
    
    fs.appendFileSync(logFile, formattedMessage + '\n');
  }

  log(level, message, extra = {}) {
    const formattedMessage = this.formatMessage(level, message, extra);
    
    // Console output with colors
    switch (level) {
      case LOG_LEVELS.ERROR:
        console.error(`🔴 ${formattedMessage}`);
        break;
      case LOG_LEVELS.WARN:
        console.warn(`🟡 ${formattedMessage}`);
        break;
      case LOG_LEVELS.INFO:
        console.info(`🔵 ${formattedMessage}`);
        break;
      case LOG_LEVELS.DEBUG:
        if (process.env.NODE_ENV === 'development') {
          console.debug(`⚪ ${formattedMessage}`);
        }
        break;
    }
    
    // File output
    this.writeToFile(level, formattedMessage);
  }

  error(message, error = null) {
    const extra = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    } : {};
    
    this.log(LOG_LEVELS.ERROR, message, extra);
  }

  warn(message, extra = {}) {
    this.log(LOG_LEVELS.WARN, message, extra);
  }

  info(message, extra = {}) {
    this.log(LOG_LEVELS.INFO, message, extra);
  }

  debug(message, extra = {}) {
    this.log(LOG_LEVELS.DEBUG, message, extra);
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;