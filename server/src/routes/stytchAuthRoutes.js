/**
 * Stytch Authentication Routes
 * Handles routes for Stytch OTP authentication
 */

const express = require('express');
const { 
  loginWithEmail, 
  verifyOtp, 
  checkSession,
  logout
} = require('../controllers/stytchAuthController');

// Initialize router
const router = express.Router();

// Debug log for route initialization
console.log(`[${new Date().toISOString()}] Initializing Stytch authentication routes`);

/**
 * POST /auth/login
 * Request OTP code for login
 * body: { email }
 */
router.post('/login', loginWithEmail);

/**
 * POST /auth/verify
 * Verify OTP code and create session
 * body: { method_id, code, email }
 */
router.post('/verify', verifyOtp);

// OTP-only authentication, Magic Link routes removed

/**
 * GET /auth/session
 * Validate existing session
 * headers: { Authorization: Bearer {token} }
 */
router.get('/session', checkSession);

/**
 * POST /auth/logout
 * Revoke user session
 * headers: { Authorization: Bearer {token} }
 */
router.post('/logout', logout);

module.exports = router;
