const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

let prisma;

const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.DATABASE_URL + '?connection_limit=5&pool_timeout=10'
      }
    }
  });
};

const connectDatabase = async () => {
  try {
    if (!prisma) {
      prisma = createPrismaClient();
    }
    
    await prisma.$connect();
    logger.info('Database connected successfully');
    
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection test passed');
    
    return prisma;
  } catch (error) {
    logger.error('Database connection failed', error);
    throw error;
  }
};

const disconnectDatabase = async () => {
  try {
    if (prisma) {
      await prisma.$disconnect();
      logger.info('Database disconnected');
    }
  } catch (error) {
    logger.error('Database disconnection error', error);
  }
};

// Graceful shutdown handler
process.on('beforeExit', disconnectDatabase);
process.on('SIGINT', disconnectDatabase);
process.on('SIGTERM', disconnectDatabase);

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getPrismaClient: () => prisma || createPrismaClient()
};