/**
 * Transfer Routes
 * Handles routes for fetching transfer data
 */

const express = require('express');
const { getTransfers } = require('../controllers/transferController');

// Initialize router
const router = express.Router();

// Debug log for route initialization
console.log(`[${new Date().toISOString()}] Initializing transfer routes`);

/**
 * GET /transfers
 * Get transfers for the authenticated user
 * Requires JWT authentication
 */
router.get('/', getTransfers);

module.exports = router;
