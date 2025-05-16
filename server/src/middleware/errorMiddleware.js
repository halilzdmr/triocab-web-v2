/**
 * Error handling middleware
 * Provides consistent error responses across the application
 */

// Custom error class for application errors
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error(`[${new Date().toISOString()}] ERROR:`, err);
  
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your token has expired. Please log in again.';
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  }
  
  // Return error response
  res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
    // Include stack trace only in development environment
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = {
  AppError,
  errorHandler
};
