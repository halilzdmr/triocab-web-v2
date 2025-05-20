/**
 * Share Controller
 * Handles generation and validation of shareable transfer links
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */

const asyncHandler = require('express-async-handler');
const { AppError } = require('../middleware/errorMiddleware');
const crypto = require('crypto');
const { getReservationById, getReservationsByOperationEmail } = require('../config/salesforceConfig');

// Applying rule: Always add debug logs & comments in the code for easier debug & readability
console.log(`[${new Date().toISOString()}] Initializing Share Controller with required dependencies`);

// In-memory store for temporary links (in production, use Redis or a database)
// Structure: { [token]: { transferId, expiresAt } }
const shareTokens = {};

/**
 * Generate a shareable link for a transfer
 * POST /transfers/share/:id
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */
const generateShareLink = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  console.log(`[${new Date().toISOString()}] Generating share link for transfer ID: ${id}`);
  
  try {
    // Now we're receiving the Salesforce ID directly from the frontend
    // Applying rule: Always add debug logs & comments in the code for easier debug & readability
    console.log(`[${new Date().toISOString()}] Using provided Salesforce ID directly: ${id}`);
    
    // Get the transfer from Salesforce to verify it exists and get pickup time
    const transfer = await getReservationById(id);
    
    if (!transfer) {
      console.error(`[${new Date().toISOString()}] Transfer not found with Salesforce ID: ${id}`);
      throw new AppError('Transfer not found', 404);
    }
    
    console.log(`[${new Date().toISOString()}] Found transfer with Salesforce ID: ${id}`);
    
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Get pickup time from transfer and add 1 hour for expiration
    const pickupTime = new Date(transfer.Pickup_Date_Time__c);
    if (isNaN(pickupTime.getTime())) {
      console.error(`[${new Date().toISOString()}] Invalid pickup time for transfer: ${id}`);
      throw new AppError('Invalid pickup time', 400);
    }
    
    const expiresAt = new Date(pickupTime);
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    console.log(`[${new Date().toISOString()}] Share link details:`, {
      salesforceId: id,
      pickupTime: pickupTime.toISOString(),
      expiresAt: expiresAt.toISOString()
    });
    
    // Store token with Salesforce record ID and expiration time
    shareTokens[token] = {
      transferId: id,  // This is already the Salesforce ID
      expiresAt: expiresAt.toISOString()
    };
    
    // Cleanup old tokens (basic housekeeping)
    cleanupExpiredTokens();
    
    // Return the token
    return res.status(200).json({
      success: true,
      token,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error generating share link:`, error);
    throw new AppError(error.message || 'Failed to generate share link', error.statusCode || 500);
  }
});

/**
 * Validate a share token and return the associated transfer
 * GET /transfers/share
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */
const getSharedTransfer = asyncHandler(async (req, res) => {
  const { token } = req.query;
  
  console.log(`[${new Date().toISOString()}] Validating share token: ${token}`);
  
  if (!token) {
    console.error(`[${new Date().toISOString()}] Missing token in request`);
    throw new AppError('Missing token', 400);
  }
  
  // Check if token exists
  if (!shareTokens[token]) {
    console.error(`[${new Date().toISOString()}] Invalid or expired token: ${token}`);
    throw new AppError('Invalid or expired link', 404);
  }
  
  // Check if token has expired
  const { transferId, expiresAt } = shareTokens[token];
  const now = new Date();
  const expiry = new Date(expiresAt);
  
  if (now > expiry) {
    // Remove expired token
    delete shareTokens[token];
    console.error(`[${new Date().toISOString()}] Token expired: ${token}`);
    throw new AppError('This link has expired', 401);
  }
  
  try {
    // Get transfer from Salesforce using the Salesforce ID we stored
    // Applying rule: Always add debug logs & comments in the code for easier debug & readability
    console.log(`[${new Date().toISOString()}] Fetching transfer with Salesforce ID: ${transferId}`);
    const transfer = await getReservationById(transferId);
    
    if (!transfer) {
      console.error(`[${new Date().toISOString()}] Transfer not found for valid token: ${transferId}`);
      throw new AppError('Transfer not found', 404);
    }
    
    console.log(`[${new Date().toISOString()}] Successfully retrieved shared transfer: ${transferId}`);
    
    // Return the transfer without sensitive information
    // Remove price information as per requirements
    // Applying rule: Always add debug logs & comments in the code for easier debug & readability
    console.log(`[${new Date().toISOString()}] Sanitizing transfer data to remove price information`);
    
    // Create a new object with only the fields we need, using the correct field names
    const sanitizedTransfer = {
      ...transfer,
      // Remove price-related fields
      Supplier_Net_Price__c: undefined,
      Price__c: undefined,
      Price_Summary__c: undefined
    };
    
    return res.status(200).json({
      success: true,
      transfer: sanitizedTransfer
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error retrieving shared transfer:`, error);
    throw new AppError(error.message || 'Failed to retrieve shared transfer', error.statusCode || 500);
  }
});

/**
 * Helper function to clean up expired tokens
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */
const cleanupExpiredTokens = () => {
  const now = new Date();
  let expiredCount = 0;
  
  for (const [token, { expiresAt }] of Object.entries(shareTokens)) {
    if (now > new Date(expiresAt)) {
      delete shareTokens[token];
      expiredCount++;
    }
  }
  
  if (expiredCount > 0) {
    console.log(`[${new Date().toISOString()}] Cleaned up ${expiredCount} expired share tokens`);
  }
};

module.exports = {
  generateShareLink,
  getSharedTransfer
};
