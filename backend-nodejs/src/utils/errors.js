class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class ExternalServiceError extends AppError {
  constructor(service, message = 'External service error') {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

class BlockchainError extends AppError {
  constructor(message = 'Blockchain operation failed') {
    super(message, 503, 'BLOCKCHAIN_ERROR');
  }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  const logger = require('./logger');
  
  // Log error
  logger.error('API Error', err);
  
  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Resource already exists',
      code: 'DUPLICATE_ERROR'
    });
  }
  
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Resource not found',
      code: 'NOT_FOUND_ERROR'
    });
  }
  
  // Custom app errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.field && { field: err.field }),
      ...(err.service && { service: err.service })
    });
  }
  
  // Unexpected errors
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ExternalServiceError,
  BlockchainError,
  errorHandler,
  asyncHandler
};