/**
 * Authentication middleware
 * Verifies JWT tokens for protected routes
 */

const jwt = require('jsonwebtoken');
const { AppError } = require('./errorMiddleware');
const asyncHandler = require('express-async-handler');

/**
 * Middleware to verify JWT token
 * Extracts token from Authorization header and verifies it
 */
const verifyJwt = asyncHandler(async (req, res, next) => {
  // Debug log for auth verification
  console.log(`[${new Date().toISOString()}] Verifying JWT for request to ${req.originalUrl}`);
  
  let token;
  
  // Check if Authorization header exists and follows Bearer schema
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    // Extract token from header
    token = req.headers.authorization.split(' ')[1];
  }
  
  // If no token found, return 401 Unauthorized
  if (!token) {
    console.log(`[${new Date().toISOString()}] No token provided for protected route`);
    throw new AppError('Not authorized. No token provided.', 401);
  }
  
  try {
    // Verify token with secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user object to request
    req.user = {
      email: decoded.email
    };
    
    // Debug log for successful verification
    console.log(`[${new Date().toISOString()}] JWT verified successfully for ${decoded.email}`);
    
    next();
  } catch (error) {
    console.log(`[${new Date().toISOString()}] JWT verification failed: ${error.message}`);
    throw new AppError('Not authorized. Invalid token.', 401);
  }
});

module.exports = {
  verifyJwt
};
