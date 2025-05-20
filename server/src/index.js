/**
 * BLT Partner Portal Server
 * Main entry point for the Express server that provides authentication 
 * and Salesforce integration for transfer company partners
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('express-async-handler');
const authRoutes = require('./routes/authRoutes');
const stytchAuthRoutes = require('./routes/stytchAuthRoutes');
const transferRoutes = require('./routes/transferRoutes');
const shareRoutes = require('./routes/shareRoutes');
const { verifyJwt } = require('./middleware/authMiddleware');
const { errorHandler } = require('./middleware/errorMiddleware');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Debug log for initialization
console.log(`[${new Date().toISOString()}] Initializing BLT Partner Portal Server`);

// Apply security middlewares
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

// Rate limiting - 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.'
  }
});
app.use(limiter);

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
// Legacy email OTP authentication
app.use('/auth', authRoutes);

// Stytch authentication routes
app.use('/stytch', stytchAuthRoutes);

// Share routes - need special handling to allow public access for token verification
// while protecting the share link generation
// Applying rule: Always add debug logs & comments in the code for easier debug & readability
console.log(`[${new Date().toISOString()}] Setting up public and protected share routes`);

// Import share controller directly for explicit routing
const { generateShareLink, getSharedTransfer } = require('./controllers/shareController');
// asyncHandler is already imported at the top of the file

// Public route for accessing shared transfers with a token (no auth required)
app.get('/transfers/share', asyncHandler(async (req, res) => {
  console.log(`[${new Date().toISOString()}] Accessing public share route with token: ${req.query.token}`);
  await getSharedTransfer(req, res);
}));

// Protected routes - apply JWT verification to transfers routes
app.use('/transfers', verifyJwt, transferRoutes);

// Protected route for generating share links (requires auth)
app.post('/transfers/share/:id', verifyJwt, asyncHandler(async (req, res) => {
  console.log(`[${new Date().toISOString()}] Generating share link for ID: ${req.params.id} by user ${req.user?.email}`);
  await generateShareLink(req, res);
}));

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Resource not found'
  });
});

// Global error handler
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`[${new Date().toISOString()}] Unhandled Rejection: ${err.message}`);
  console.error(err.stack);
  // In production, we might want to exit and let the process manager restart
  // process.exit(1);
});

module.exports = app; // For testing purposes
