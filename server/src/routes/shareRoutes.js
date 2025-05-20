/**
 * Share Routes
 * Handles routes for sharing transfer records
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */

const express = require('express');
const router = express.Router();
const { generateShareLink, getSharedTransfer } = require('../controllers/shareController');
const { verifyJwt } = require('../middleware/authMiddleware');

// Debug log for route initialization
console.log(`[${new Date().toISOString()}] Initializing share routes`);

/**
 * POST /transfers/share/:id
 * Generate a shareable link for a specific transfer
 * Requires JWT authentication
 */
router.route('/:id').post(verifyJwt, generateShareLink);

/**
 * GET /transfers/share
 * Get shared transfer details using a token
 * Does not require authentication as it's a public route
 */
router.route('/').get(getSharedTransfer);

module.exports = router;
