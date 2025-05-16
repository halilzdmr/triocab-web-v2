/**
 * Authentication Controller
 * Handles OTP code generation, verification and JWT token issuance
 */

const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const { PutCommand, GetCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { SendEmailCommand } = require('@aws-sdk/client-ses');
const { dynamoDocClient, sesClient } = require('../config/awsConfig');
const { AppError } = require('../middleware/errorMiddleware');

// Constants
const OTP_TABLE = 'OtpCodes';
const OTP_VALIDITY_MINUTES = 5;
const JWT_EXPIRY = '8h';

/**
 * Generate a random 6-digit numeric code
 * @returns {string} 6-digit code
 */
const generateOtpCode = () => {
  // Generate a random number between 100000 and 999999
  return Math.floor(100000 + Math.random() * 900000).toString();
};

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
 * Request OTP verification code
 * POST /auth/request-code
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */
const requestCode = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  // Debug log for code request
  console.log(`[${new Date().toISOString()}] OTP code requested for email: ${email}`);
  
  // Validate email format
  if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    throw new AppError('Please provide a valid email address', 400);
  }
  
  // Check if email is in allowed list (if defined)
  if (!isEmailAllowed(email)) {
    console.log(`[${new Date().toISOString()}] Email ${email} not in allowed list`);
    throw new AppError('Email not authorized to access this system', 403);
  }
  
  // Check if we're running in bypass mode (local development)
  const bypassMode = process.env.BYPASS_EMAIL_VERIFICATION === 'true';
  
  if (bypassMode) {
    // In bypass mode, we don't need to store code or send email
    console.log(`[${new Date().toISOString()}] BYPASS MODE: Skipping DynamoDB and email operations`);
    console.log(`[${new Date().toISOString()}] Use any code with this email to login in bypass mode`);
    
    res.status(200).json({
      status: 'success',
      message: 'In test mode. Use any 6-digit code.',
      bypass: true
    });
    return;
  }
  
  // Normal flow when not in bypass mode
  // Generate OTP code
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000).toISOString();
  
  // Store in DynamoDB
  try {
    await dynamoDocClient.send(
      new PutCommand({
        TableName: OTP_TABLE,
        Item: {
          email: email.toLowerCase(),
          code,
          expiresAt
        }
      })
    );
    console.log(`[${new Date().toISOString()}] OTP code stored in DynamoDB for ${email}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] DynamoDB error:`, error);
    throw new AppError('Failed to generate verification code', 500);
  }
  
  // Send email via SES
  try {
    const emailParams = {
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: `
              <html>
                <body>
                  <h2>Partner Portal Verification Code</h2>
                  <p>Your verification code is: <strong>${code}</strong></p>
                  <p>This code will expire in ${OTP_VALIDITY_MINUTES} minutes.</p>
                  <p>If you did not request this code, please ignore this email.</p>
                </body>
              </html>
            `
          },
          Text: {
            Charset: 'UTF-8',
            Data: `Your Partner Portal verification code is: ${code}\nThis code will expire in ${OTP_VALIDITY_MINUTES} minutes.`
          }
        },
        Subject: {
          Charset: 'UTF-8',
          Data: `${code} - Partner Portal Verification Code`
        }
      },
      Source: process.env.SES_FROM_EMAIL
    };
    
    await sesClient.send(new SendEmailCommand(emailParams));
    console.log(`[${new Date().toISOString()}] Verification email sent to ${email}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] SES error:`, error);
    throw new AppError('Failed to send verification email', 500);
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Verification code sent to email'
  });
});

/**
 * Verify OTP code and issue JWT token
 * POST /auth/verify-code
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */
const verifyCode = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  
  // Debug log for verification attempt
  console.log(`[${new Date().toISOString()}] Verifying OTP code for email: ${email}`);
  
  // Validate inputs
  if (!email) {
    throw new AppError('Please provide an email address', 400);
  }
  
  // Check for bypass mode for local development/testing
  const bypassVerification = process.env.BYPASS_EMAIL_VERIFICATION === 'true';
  
  if (bypassVerification) {
    console.log(`[${new Date().toISOString()}] BYPASS MODE: Skipping email verification for ${email}`);
    
    // Generate JWT token without verification
    const token = jwt.sign(
      { email: email.toLowerCase() },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    
    console.log(`[${new Date().toISOString()}] JWT token issued for ${email} in bypass mode`);
    
    return res.status(200).json({
      status: 'success',
      token,
      bypass: true
    });
  }
  
  // Normal verification flow when bypass is disabled
  if (!code) {
    throw new AppError('Please provide a verification code', 400);
  }
  
  // Get stored code from DynamoDB
  try {
    const result = await dynamoDocClient.send(
      new GetCommand({
        TableName: OTP_TABLE,
        Key: {
          email: email.toLowerCase()
        }
      })
    );
    
    const storedData = result.Item;
    
    // Check if code exists and is valid
    if (!storedData) {
      console.log(`[${new Date().toISOString()}] No code found for ${email}`);
      throw new AppError('Invalid or expired verification code', 401);
    }
    
    if (storedData.code !== code) {
      console.log(`[${new Date().toISOString()}] Incorrect code provided for ${email}`);
      throw new AppError('Invalid verification code', 401);
    }
    
    // Check if code is expired
    if (new Date() > new Date(storedData.expiresAt)) {
      console.log(`[${new Date().toISOString()}] Expired code for ${email}`);
      throw new AppError('Verification code has expired', 401);
    }
    
    // Delete the used code
    await dynamoDocClient.send(
      new DeleteCommand({
        TableName: OTP_TABLE,
        Key: {
          email: email.toLowerCase()
        }
      })
    );
    console.log(`[${new Date().toISOString()}] OTP code deleted after successful verification for ${email}`);
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error(`[${new Date().toISOString()}] DynamoDB error during verification:`, error);
    throw new AppError('Failed to verify code', 500);
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { email: email.toLowerCase() },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
  
  console.log(`[${new Date().toISOString()}] JWT token issued for ${email}`);
  
  res.status(200).json({
    status: 'success',
    token
  });
});

module.exports = {
  requestCode,
  verifyCode
};
