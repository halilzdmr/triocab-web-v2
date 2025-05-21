/**
 * Slack notification configuration
 * This module provides functionality to send notifications to Slack channels
 * 
 * @version 1.1.0
 */

const axios = require('axios');

// Get Slack webhook URL from environment variables with fallback
// The URL should be in format: https://hooks.slack.com/services/XXX/YYY/ZZZ
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

// Enable or disable Slack notifications entirely
const SLACK_ENABLED = process.env.SLACK_ENABLED !== 'false' && SLACK_WEBHOOK_URL.length > 0;

// Debug setting to enable/disable logging
const DEBUG = process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true';

// Log status of Slack integration on module load
console.log(`[Slack Config] Slack notifications ${SLACK_ENABLED ? 'ENABLED' : 'DISABLED'}`);

// Icon emojis for different event types
const ICONS = {
  login: ':unlock:',
  error: ':x:',
  success: ':white_check_mark:',
  warning: ':warning:'
};

/**
 * Send a notification to Slack
 * @param {string} message - The message to send to Slack
 * @param {Object} options - Optional parameters for the notification
 * @param {string} [options.channel] - The channel to send the message to
 * @param {string} [options.username] - The username to send the message as
 * @param {string} [options.icon_emoji] - The emoji to use as the icon
 * @param {Object} [options.attachments] - Additional attachments for the message
 * @returns {Promise<Object>} - The response from Slack or error object
 */
const sendSlackNotification = async (message, options = {}) => {
  // Early return if no message provided
  if (!message) {
    console.error('[Slack Notification] No message provided to sendSlackNotification');
    return { success: false, error: 'No message provided' };
  }

  // Early return if Slack notifications are disabled
  if (!SLACK_ENABLED) {
    if (DEBUG) {
      console.log('[Slack Notification] Notifications disabled, skipping:', message);
    }
    return { success: false, error: 'Slack notifications are disabled' };
  }

  // Early return if webhook URL is not valid
  if (!SLACK_WEBHOOK_URL || !SLACK_WEBHOOK_URL.startsWith('https://hooks.slack.com/')) {
    console.error('[Slack Notification] Invalid webhook URL');
    return { success: false, error: 'Invalid webhook URL' };
  }

  try {
    // Debug logging
    if (DEBUG) {
      console.log(`[Slack Notification] Sending message: ${message}`);
      console.log(`[Slack Notification] Webhook URL: ${SLACK_WEBHOOK_URL.substring(0, 30)}...`);
    }

    // Construct the payload
    const payload = {
      text: message,
      ...options
    };

    // Send the request to Slack
    const response = await axios.post(SLACK_WEBHOOK_URL, payload);
    
    // Debug logging for successful response
    if (DEBUG) {
      console.log(`[Slack Notification] Message sent successfully: ${response.status}`);
    }

    return { success: true, response: response.data };
  } catch (error) {
    // Log the error with detailed information
    console.error(`[Slack Notification] Error sending message: ${error.message}`);
    if (error.response) {
      console.error(`[Slack Notification] Response status: ${error.response.status}`);
      console.error(`[Slack Notification] Response data:`, error.response.data);
    }
    
    return { success: false, error: error.message, details: error.response?.data };
  }
};

/**
 * Send a user event notification to Slack
 * @param {string} eventType - The type of event (login, error, etc.)
 * @param {Object} userData - User data related to the event
 * @param {Error|string|Object} [error] - Error object or message if applicable
 * @returns {Promise<Object>} - The response from Slack
 */
const notifyUserEvent = async (eventType, userData = {}, error = null) => {
  // Format the message based on event type
  let message = `[${eventType.toUpperCase()}] `;
  
  // Add user information if available
  if (userData && userData.email) {
    message += `User: ${userData.email} `;
  }
  
  // Add timestamp
  message += `| Timestamp: ${new Date().toISOString()}`;
  
  // Additional attachments for more context
  const attachments = [];
  
  // Add user data as an attachment if available
  if (userData && Object.keys(userData).length > 0) {
    attachments.push({
      title: 'User Data',
      text: '```' + JSON.stringify(userData, null, 2) + '```',
      color: eventType.includes('error') ? 'danger' : 'good'
    });
  }
  
  // Add error information as an attachment if available
  if (error) {
    const errorMessage = error instanceof Error
      ? error.stack || error.message
      : typeof error === 'object'
        ? JSON.stringify(error, null, 2)
        : error.toString();
    
    attachments.push({
      title: 'Error Details',
      text: '```' + errorMessage + '```',
      color: 'danger'
    });
  }
  
  // Send the notification with attachments
  return sendSlackNotification(message, {
    username: 'Triocab Event Monitor',
    icon_emoji: eventType.includes('error') ? ':x:' : ':white_check_mark:',
    attachments: attachments.length > 0 ? attachments : undefined
  });
};

/**
 * Send a login notification to Slack when a user logs in
 * @param {Object} userData - User data for the login event
 * @param {string} userData.email - User email
 * @param {string} [userData.memberId] - Optional member ID
 * @param {string} [ipAddress] - IP address of the login
 * @param {string} [authMethod] - Authentication method used (e.g., 'OTP', 'Stytch')
 * @returns {Promise<Object>} - The response from Slack
 */
const notifyLoginEvent = async (userData, ipAddress = 'Unknown IP', authMethod = 'Unknown') => {
  // Early return if userData is not provided
  if (!userData || !userData.email) {
    console.error('[Slack Notification] Missing user data for login notification');
    return { success: false, error: 'Missing user data' };
  }

  // Debug log
  if (DEBUG) {
    console.log(`[Slack Notification] Processing login notification for ${userData.email}`);
  }
  
  // Format the login message
  const message = `🔐 *Login Alert*: User *${userData.email}* logged in`;
  
  // Create attachments with login details
  const attachments = [
    {
      color: '#36a64f', // Green color for success
      fields: [
        {
          title: 'User',
          value: userData.email,
          short: true
        },
        {
          title: 'Authentication Method',
          value: authMethod,
          short: true
        },
        {
          title: 'IP Address',
          value: ipAddress,
          short: true
        },
        {
          title: 'Login Time',
          value: new Date().toISOString(),
          short: true
        }
      ],
      footer: 'Triocab Security Monitor'
    }
  ];
  
  // Add member ID if available
  /*if (userData.memberId) {
    attachments[0].fields.push({
      title: 'Member ID',
      value: userData.memberId,
      short: true
    });
  }*/
  
  // Send the notification with login-specific formatting
  return sendSlackNotification(message, {
    username: 'Triocab Security',
    icon_emoji: ICONS.login,
    attachments
  });
};

// Export the functions
module.exports = {
  sendSlackNotification,
  notifyUserEvent,
  notifyLoginEvent
};
