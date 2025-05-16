/**
 * Stytch Configuration
 * Sets up the Stytch client for authentication
 */

// Polyfill fetch for Node.js v16 (required by Stytch)
const fetch = require('node-fetch');
global.fetch = fetch;

const stytch = require('stytch');

// Debug log for initialization
console.log(`[${new Date().toISOString()}] Initializing Stytch B2B configuration`);

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

// Create Stytch client with appropriate environment
// Use the B2B client since this project is set up as a B2B project
let client;

try {
  // Create a B2B client instead of the consumer client
  client = new stytch.B2BClient({
    project_id: process.env.STYTCH_PROJECT_ID,
    secret: process.env.STYTCH_SECRET,
    env: isProduction ? stytch.envs.live : stytch.envs.test
  });
  
  console.log(`[${new Date().toISOString()}] Stytch B2B client initialized in ${isProduction ? 'PRODUCTION' : 'TEST'} mode`);
} catch (error) {
  console.error(`[${new Date().toISOString()}] Failed to initialize Stytch client:`, error);
  // Don't throw here, let the application continue and fail on actual API calls
  // This allows the server to start even if Stytch credentials are missing
}

module.exports = {
  stytchClient: client
};
