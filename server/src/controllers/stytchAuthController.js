/**
 * Stytch Authentication Controller
 * Handles authentication via Stytch API for secure login
 * 
 * Endpoints:
 * - POST /auth/login: Send OTP code to user email
 * - POST /auth/verify: Verify OTP code and create session
 * - GET /auth/session: Validate existing session
 * - POST /auth/logout: Revoke session
 */

// Polyfill fetch for Node.js v16 (required by Stytch)
const fetch = require('node-fetch');
global.fetch = fetch;

// Debug log to verify fetch is polyfilled
console.log('Fetch polyfill initialized for Stytch API calls');

const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const { stytchClient } = require('../config/stytchConfig');
const { AppError } = require('../middleware/errorMiddleware');
const { notifyLoginEvent } = require('../config/slackConfig');
// For getting client IP address
const requestIp = require('request-ip');

// Constants for JWT configuration
const JWT_EXPIRY = '1d'; // 1 days expiry for JWT

/**
 * Check if email is in the allowed list (if ALLOWED_EMAILS is defined)
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is allowed
 */
const isEmailAllowed = (email) => {
  // If ALLOWED_EMAILS is not defined, allow all emails
  if (!process.env.ALLOWED_EMAILS) return true;
  
  // Split comma-separated list and check if email is included
  const allowedEmails = process.env.ALLOWED_EMAILS.split(',');
  return allowedEmails.includes(email.toLowerCase());
};

/**
 * Handle login with OTP (One-Time Password)
 * POST /auth/login
 * body: { email }
 */
const loginWithEmail = asyncHandler(async (req, res) => {
  // Debug the entire request body to see what's coming in
  console.log(`[${new Date().toISOString()}] Login request body:`, JSON.stringify(req.body, null, 2));
  
  // Extract email with fallback to prevent undefined
  const email = req.body?.email || null;
  
  // Debug log for login request
  console.log(`[${new Date().toISOString()}] Stytch Discovery OTP login request - Email: ${email || 'MISSING'}`);
  
  // Validate email explicitly to prevent undefined errors
  if (!email) {
    console.error(`[${new Date().toISOString()}] Missing email in request`);
    throw new AppError('Please provide an email address', 400);
  }
  
  // Validate email format
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    console.error(`[${new Date().toISOString()}] Invalid email format: ${email}`);
    throw new AppError('Please provide a valid email address', 400);
  }
  
  // Check if email is in allowed list (if defined)
  if (!isEmailAllowed(email)) {
    console.log(`[${new Date().toISOString()}] Email ${email} not in allowed list`);
    throw new AppError('Email not authorized to access this system', 403);
  }
  
  // Log whether we're in OTP bypass mode or not
  const isLocalDevelopment = process.env.NODE_ENV === 'development';
  console.log(`[${new Date().toISOString()}] Environment: ${process.env.NODE_ENV}, OTP Bypass Mode: ${isLocalDevelopment ? 'ENABLED' : 'DISABLED'}`);
  if (isLocalDevelopment) {
    console.log(`[${new Date().toISOString()}] LOCAL DEV MODE: OTP verification will be bypassed during verification step`);
  }
  
  try {
    // Check if we're in development mode to bypass Stytch API
    if (isLocalDevelopment) {
      console.log(`[${new Date().toISOString()}] LOCAL DEV MODE: Bypassing Stytch API call for email: ${email}`);
      console.log(`[${new Date().toISOString()}] LOCAL DEV MODE: In development environment, OTP code will be bypassed during verification.`);
      
      // Return success without actually calling Stytch API
      res.status(200).json({
        status: 'success',
        message: 'LOCAL DEV MODE: Mock OTP sent successfully',
        email, // echo back so frontend has context if needed
        dev_mode: true // flag to indicate we're in dev mode
      });
      return; // Exit early
    }
    
    // Only executed in non-development environments:
    // Discovery flow: use otps.email.discovery.send endpoint to send OTP
    console.log(`[${new Date().toISOString()}] Calling Stytch Discovery API for email: ${email}`);
    
    // Prepare the API request parameters
    const stytchParams = {
      email_address: String(email).toLowerCase() // Ensure email is a string and lowercase
      // Note: Discovery loginOrSignup endpoint does not support expiration_minutes
    };
    
    // Debug log the exact parameters being sent to Stytch
    console.log(`[${new Date().toISOString()}] Stytch Discovery API parameters:`, JSON.stringify(stytchParams, null, 2));
    
    // Make the API call with our prepared parameters
    // Use Discovery OTP send endpoint
    const otpResponse = await stytchClient.otps.email.discovery.send(stytchParams);
    
    // Debug log the entire response for troubleshooting
    console.log(`[${new Date().toISOString()}] Stytch Discovery OTP response:`, JSON.stringify(otpResponse, null, 2));
    
    console.log(`[${new Date().toISOString()}] Stytch Discovery OTP sent for: ${email}`);
    
    // Return success message
    res.status(200).json({
      status: 'success',
      message: 'OTP sent successfully',
      email // echo back so frontend has context if needed
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Stytch error:`, error);
    throw new AppError(error.message || 'Failed to initiate authentication', 500);
  }
});

/**
 * Verify OTP code and create session
 * POST /auth/verify
 * body: { email, code }
 */
const verifyOtp = asyncHandler(async (req, res) => {
  // Debug the entire request body
  console.log(`[${new Date().toISOString()}] Verify OTP request body:`, JSON.stringify(req.body, null, 2));
  
  // Extract parameters with fallbacks to prevent undefined
  const code = req.body?.code || null;
  const email = req.body?.email || null;
  
  // Debug log for verification attempt
  console.log(`[${new Date().toISOString()}] Verifying Discovery OTP - Email: ${email || 'MISSING'}, Code: ${code ? '******' : 'MISSING'}`);
  
  // Validate inputs
  if (!code) {
    console.error(`[${new Date().toISOString()}] Missing verification code in request`);
    throw new AppError('Please provide a verification code', 400);
  }
  
  if (!email) {
    console.error(`[${new Date().toISOString()}] Missing email in verification request`);
    throw new AppError('Please provide an email for verification', 400);
  }
  
  // Check if running in development environment - if so, bypass OTP verification
  // This allows for easier local testing
  const isLocalDevelopment = process.env.NODE_ENV === 'development';
  console.log(`[${new Date().toISOString()}] Environment: ${process.env.NODE_ENV}, OTP Bypass: ${isLocalDevelopment ? 'ENABLED' : 'DISABLED'}`);
  
  try {
    // Create response variable outside the if-else scope
    let response;
    let member_id;
    let org_id;
    
    // Bypass OTP verification if in local development
    if (isLocalDevelopment) {
      // Log that we're bypassing real OTP verification
      console.log(`[${new Date().toISOString()}] LOCAL DEV MODE: Bypassing Stytch OTP verification for ${email}`);
      
      // Create a mock successful response with a dummy member_id and org_id
      member_id = 'local_dev_member_id';
      org_id = 'local_dev_org_id';
      
      // Log the mock verification
      console.log(`[${new Date().toISOString()}] LOCAL DEV MODE: Simulated successful OTP verification for: ${email}`);
    } else {
      // Normal flow - verify with Stytch API in non-development environments
      console.log(`[${new Date().toISOString()}] Verifying OTP with Stytch Discovery API - email: ${email}, code: ${code ? '******' : 'missing'}`);
      
      // Prepare the verification parameters
      const verifyParams = {
        email_address: String(email).toLowerCase(), // Ensure it's a string
        code: String(code) // Ensure it's a string
      };
      
      // Debug log the exact parameters being sent to Stytch
      console.log(`[${new Date().toISOString()}] Stytch Discovery verify parameters:`, JSON.stringify(verifyParams, null, 2));
      
      // Make the API call with our prepared parameters
      // Use Discovery OTP verification endpoint: otps.email.discovery.authenticate
      response = await stytchClient.otps.email.discovery.authenticate(verifyParams);
      
      // Debug log the entire response for troubleshooting
      console.log(`[${new Date().toISOString()}] Stytch Discovery OTP verification response:`, JSON.stringify(response, null, 2));
      
      console.log(`[${new Date().toISOString()}] OTP verified successfully for: ${email}`);
      
      // Get the member ID and organization ID from the response, with safe fallbacks
      // Discovery responses are structured differently than B2B
      member_id = response?.member_id || 
                   response?.member?.member_id || 
                   response?.data?.member_id || 
                   'unknown_member_id';
                        
      org_id = response?.organization_id || 
                response?.organization?.organization_id || 
                response?.data?.organization_id || 
                'unknown_org_id';
    }
    
    // Generate our own JWT token with user info for our backend
    const token = jwt.sign(
      { 
        memberId: member_id,
        organizationId: org_id,
        email: email.toLowerCase()
      },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    
    // Get member details if available
    let memberData = null;
    try {
      console.log(`[${new Date().toISOString()}] Attempting to retrieve member data for: ${member_id} in organization: ${org_id}`);
      
      // Only attempt to retrieve member data if we have valid IDs
      if (member_id !== 'unknown_member_id' && org_id !== 'unknown_org_id') {
        memberData = await stytchClient.organizations.members.get({
          member_id: member_id,
          organization_id: org_id
        });
        console.log(`[${new Date().toISOString()}] Successfully retrieved member data for: ${member_id} in organization: ${org_id}`);
      } else {
        console.warn(`[${new Date().toISOString()}] Skipping member data retrieval due to missing IDs`);
      }
    } catch (userError) {
      console.warn(`[${new Date().toISOString()}] Could not retrieve member data:`, userError);
      // Continue without member data
    }
    
    // Safely extract session token from Stytch response (could be in various locations)
    const session_token = response?.session_token || 
                         response?.session?.session_token || 
                         response?.data?.session_token || 
                         null;
    
    // Debug log for session token availability
    console.log(`[${new Date().toISOString()}] Session token available: ${session_token ? 'Yes' : 'No'}`);
                         
    // Return the session information with safe fallback values
    res.status(200).json({
      status: 'success',
      member_id: member_id,
      organization_id: org_id,
      email: email,
      token: token, // Our JWT token
      session_token: session_token, // Stytch's session token (may be null)
      member: memberData?.member || null
    });
    
    // Additional debug log for successful authentication completion
    console.log(`[${new Date().toISOString()}] Authentication successful for ${email} with member_id: ${member_id}`);
    
    // Send Slack notification for successful login
    try {
      // Get client IP address
      const clientIp = requestIp.getClientIp(req) || 'Unknown IP';
      
      // Send login notification
      await notifyLoginEvent(
        { 
          email, 
          memberId: member_id,
          organizationId: org_id
        },
        clientIp,
        'Stytch OTP'
      );
      
      console.log(`[${new Date().toISOString()}] Slack login notification sent for ${email}`);
    } catch (slackError) {
      // Don't fail authentication if Slack notification fails
      console.error(`[${new Date().toISOString()}] Failed to send Slack login notification:`, slackError);
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Stytch verification error:`, error);
    // Friendly message for wrong passcode so UI can prompt retry without hard failure
    if (error?.error_type === 'otp_code_not_found') {
      // 400 Bad Request is appropriate – client can simply ask the user to try again
      throw new AppError('Incorrect code, please try again', 400);
    }
    throw new AppError(error.message || 'Failed to verify code', 401);
  }
});

/**
 * Authenticate user with magic link token
 * GET /auth/authenticate
 * query params: token
 */
const authenticateMagicLink = asyncHandler(async (req, res) => {
  const { token } = req.query;
  
  console.log(`[${new Date().toISOString()}] Authenticating magic link token`);
  
  if (!token) {
    throw new AppError('Token is required', 400);
  }
  
  try {
    // Authenticate magic link token
    const response = await stytchClient.magicLinks.authenticate({
      token,
      session_duration_minutes: 60 * 24 * 1 // 7 day session
    });
    
    console.log(`[${new Date().toISOString()}] Magic link authenticated successfully for user: ${response.user_id}`);
    
    // Generate our own JWT token with user info
    const email = response.user.emails[0]?.email;
    const jwtToken = jwt.sign(
      { 
        userId: response.user_id,
        email: email
      },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${jwtToken}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Magic link authentication error:`, error);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Validate existing session token
 * GET /auth/session
 * headers: Authorization: Bearer {token}
 */
const checkSession = asyncHandler(async (req, res) => {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('No token provided', 401);
  }
  
  const token = authHeader.split(' ')[1];
  console.log(`[${new Date().toISOString()}] Validating Discovery session token`);
  
  try {
    // Verify our JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // For Discovery, we need to check if the member still exists in the organization
    try {
      if (decoded.memberId && decoded.organizationId) {
        await stytchClient.organizations.members.get({
          member_id: decoded.memberId,
          organization_id: decoded.organizationId
        });
        console.log(`[${new Date().toISOString()}] Verified member ${decoded.memberId} in organization ${decoded.organizationId}`);
      } else {
        throw new Error('Missing member or organization ID');
      }
    } catch (userError) {
      console.error(`[${new Date().toISOString()}] Member doesn't exist in organization:`, userError);
      throw new AppError('Member session is invalid', 401);
    }
    
    // Return member info
    res.status(200).json({
      status: 'success',
      member_id: decoded.memberId,
      organization_id: decoded.organizationId,
      email: decoded.email
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Session validation error:`, error);
    throw new AppError('Invalid or expired token', 401);
  }
});

/**
 * Revoke a member's sessions in an organization
 * POST /auth/logout
 * headers: Authorization: Bearer {token}
 */
const logout = asyncHandler(async (req, res) => {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('No token provided', 401);
  }
  
  const token = authHeader.split(' ')[1];
  console.log(`[${new Date().toISOString()}] Processing Discovery logout request`);
  
  try {
    // Decode token to get member info
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Revoke sessions for this member in the organization
    try {
      if (decoded.memberId && decoded.organizationId) {
        // For Discovery, we use the organizations endpoints to revoke sessions
        await stytchClient.organizations.members.deleteSessions({
          member_id: decoded.memberId,
          organization_id: decoded.organizationId
        });
        console.log(`[${new Date().toISOString()}] All sessions revoked for member: ${decoded.memberId} in organization: ${decoded.organizationId}`);
      } else {
        throw new Error('Missing member or organization ID');
      }
    } catch (stytchError) {
      console.log(`[${new Date().toISOString()}] Error revoking Stytch sessions:`, stytchError);
      // Continue even if Stytch revocation fails
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Logout error:`, error);
    // Return success anyway since client will clear tokens
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  }
});

module.exports = {
  loginWithEmail,
  verifyOtp,
  authenticateMagicLink,
  checkSession,
  logout
};
