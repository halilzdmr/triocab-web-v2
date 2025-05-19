/**
 * Slack notification configuration
 * This module provides functionality to send notifications to Slack channels
 */

const axios = require('axios');

// Slack webhook URL for notifications
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/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';

// Debug setting to enable/disable logging
const DEBUG = process.env.NODE_ENV !== 'production';

/**
 * Send a notification to Slack
 * @param {string} message - The message to send to Slack
 * @param {Object} options - Optional parameters for the notification
 * @param {string} [options.channel] - The channel to send the message to
 * @param {string} [options.username] - The username to send the message as
 * @param {string} [options.emoji] - The emoji to use as the icon
 * @param {Object} [options.attachments] - Additional attachments for the message
 * @returns {Promise<Object>} - The response from Slack
 */
const sendSlackNotification = async (message, options = {}) => {
  // Early return if no message provided
  if (!message) {
    console.error('No message provided to sendSlackNotification');
    return { success: false, error: 'No message provided' };
  }

  try {
    // Debug logging
    if (DEBUG) {
      console.log(`[Slack Notification] Sending message: ${message}`);
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
    // Log the error
    console.error(`[Slack Notification] Error sending message: ${error.message}`);
    
    return { success: false, error: error.message };
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

// Export the functions
module.exports = {
  sendSlackNotification,
  notifyUserEvent
};
