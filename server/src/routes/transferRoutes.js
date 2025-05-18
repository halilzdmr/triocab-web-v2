/**
 * Transfer Routes
 * Handles routes for fetching transfer data
 */

const express = require('express');
const router = express.Router();
const { getTransfers, getTransfersSummary, downloadTransfersAsExcel } = require('../controllers/transferController');
const { verifyJwt } = require('../middleware/authMiddleware');

// Debug log for route initialization
console.log(`[${new Date().toISOString()}] Initializing transfer routes`);

/**
 * GET /transfers
 * Get transfers for the authenticated user
 * Requires JWT authentication
 */
router.route('/').get(verifyJwt, getTransfers);

/**
 * GET /transfers/summary
 * Get summary statistics for transfers (total count and revenue)
 * Requires JWT authentication
 */
router.route('/summary').get(verifyJwt, getTransfersSummary);

// Route for downloading transfers as Excel
router.route('/download').get(verifyJwt, downloadTransfersAsExcel);

module.exports = router;
