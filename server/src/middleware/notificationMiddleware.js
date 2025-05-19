/**
 * Notification middleware for tracking important application events
 * Provides utility functions to send notifications for various events
 */

const { notifyUserEvent } = require('../config/slackConfig');

/**
 * Middleware to track user login events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const trackUserLogin = (req, res, next) => {
  // Extract response data after it's sent
  const originalSend = res.send;
  
  res.send = function(body) {
    // Debug logging
    console.log(`[${new Date().toISOString()}] Tracking user login response: ${res.statusCode}`);
    
    // Only track successful logins (status code 200)
    if (res.statusCode === 200 && req.body && req.body.email) {
      // Send notification asynchronously (don't block response)
      notifyUserEvent('user_login', {
        email: req.body.email,
        url: req.originalUrl,
        userAgent: req.headers['user-agent']
      }).catch(err => console.error(`[Slack Notification Error] ${err.message}`));
    }
    
    // Call the original send function
    return originalSend.call(this, body);
  };
  
  next();
};

/**
 * Track specific application events and send notifications
 * @param {string} eventType - Type of event to track
 * @param {Object} eventData - Additional data about the event
 * @param {Error} [error] - Error object if applicable
 * @returns {Promise<Object>} - Result of notification
 */
const trackEvent = async (eventType, eventData = {}, error = null) => {
  // Log the event
  console.log(`[${new Date().toISOString()}] Tracking event: ${eventType}`);
  
  // Send notification
  return notifyUserEvent(eventType, eventData, error);
};

/**
 * Middleware to track API usage
 * Can be applied to specific routes to monitor their usage
 * @param {string} eventName - Custom name for the event
 */
const trackApiUsage = (eventName) => {
  return (req, res, next) => {
    // Track the request
    const userData = req.user ? { email: req.user.email } : {};
    
    // Add request information
    userData.url = req.originalUrl;
    userData.method = req.method;
    userData.params = req.params;
    
    // Send notification asynchronously (don't await)
    notifyUserEvent(`api_${eventName}`, userData)
      .catch(err => console.error(`[Slack Notification Error] ${err.message}`));
    
    next();
  };
};

module.exports = {
  trackUserLogin,
  trackEvent,
  trackApiUsage
};
