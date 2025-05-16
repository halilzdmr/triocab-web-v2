/**
 * Authentication Routes
 * Handles routes for OTP code request and verification
 */

const express = require('express');
const { requestCode, verifyCode } = require('../controllers/authController');

// Initialize router
const router = express.Router();

// Debug log for route initialization
console.log(`[${new Date().toISOString()}] Initializing authentication routes`);

/**
 * POST /auth/request-code
 * Request OTP verification code
 * body: { email }
 */
router.post('/request-code', requestCode);

/**
 * POST /auth/verify-code
 * Verify OTP code and issue JWT token
 * body: { email, code }
 */
router.post('/verify-code', verifyCode);

module.exports = router;
