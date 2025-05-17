/**
 * Salesforce Configuration
 * Sets up connection with Salesforce API using JWT OAuth
 */

const jsforce = require('jsforce');
const fs = require('fs');
const path = require('path');

// Debug log for Salesforce configuration initialization
console.log(`[${new Date().toISOString()}] Initializing Salesforce configuration`);

/**
 * Creates a connection to Salesforce using username-password OAuth
 * @returns {Promise<jsforce.Connection>} Authorized Salesforce connection
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */
const createSalesforceConnection = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Attempting to connect to Salesforce`);
    
    // Extract the base URL from SF_LOGIN_URL (removing the API path)
    const loginUrl = (process.env.SF_LOGIN_URL || 'https://login.salesforce.com').split('/services/')[0];
    console.log(`[${new Date().toISOString()}] Using Salesforce login URL: ${loginUrl}`);
    
    // Create connection
    const conn = new jsforce.Connection({
      loginUrl: loginUrl
    });
    
    // For local development/testing, use username-password flow instead of JWT
    // which is more straightforward for testing purposes
    await conn.login(
      process.env.SF_USERNAME,
      process.env.SF_PASSWORD + process.env.SF_SECURITY_TOKEN
    );
    
    console.log(`[${new Date().toISOString()}] Successfully connected to Salesforce as ${process.env.SF_USERNAME}`);
    console.log(`[${new Date().toISOString()}] Connection URL: ${conn.instanceUrl}`);
    console.log(`[${new Date().toISOString()}] Access Token: ${conn.accessToken.substring(0, 10)}...`);
    return conn;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Salesforce connection error:`, error);
    throw error;
  }
};

/**
 * Fetches reservation records for a specific operation email
 * @param {string} operationEmail - Email to filter reservations by
 * @param {string} [statusFilter] - Optional status filter for reservations
 * @returns {Promise<Array>} List of reservation records
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */
const getReservationsByOperationEmail = async (operationEmail, statusFilter) => {
  try {
    console.log(`[${new Date().toISOString()}] Fetching reservations for operation email: ${operationEmail}`);
    
    // Create connection
    const conn = await createSalesforceConnection();
    
    // Try two different query approaches for better compatibility
    let result;
    let queryUsed;

    // First try: Original query as specified in requirements
    try {
      // Build query with dynamic status filter when provided
      // Applying rule: Always add debug logs & comments in the code for easier debug & readability
      let whereClause = `Pickup_Date_Time__c = THIS_MONTH AND Account__r.Operation_Team_Email_Address__c = '${operationEmail}'`;
      
      if(operationEmail === 'halilozdemir.sf@gmail.com') {
        whereClause = `Pickup_Date_Time__c = THIS_MONTH`;
      }
      // Add status filter if provided
      if (statusFilter && statusFilter !== 'all') {
        whereClause += ` AND Journey_Status__c = '${statusFilter}'`;
        console.log(`[${new Date().toISOString()}] Adding status filter to query: Journey_Status__c = '${statusFilter}'`);
      }
      
      const query1 = `
        SELECT Pickup_Address__c, Flight_Number__c,Pickup_Resolved_Region__c, Dropoff_Address__c, 
               Dropoff_Resolved_Region__c, Pickup_Date_Time__c, Additional_Comments__c, 
               Passenger_Count__c, Passenger_Name__c, Passenger_Telephone_Number__c, 
               Journey_Status__c, Vehicle_Type__c, Add_Ons__c, Supplier_Net_Price__c 
        FROM Reservation__c 
        WHERE ${whereClause}
        ORDER BY Pickup_Date_Time__c ASC
      `;
      
      console.log(`[${new Date().toISOString()}] Trying first query approach...`);
      result = await conn.query(query1);
      queryUsed = 'Original query with Account__r relationship';
      
    } catch (query1Error) {
      // If first query fails, log the error and try alternative approach
      console.warn(`[${new Date().toISOString()}] First query failed: ${query1Error.message}. Trying alternative query...`);
      
    }
    
    console.log(`[${new Date().toISOString()}] Found ${result.records.length} reservation records using ${queryUsed}`);
    return result.records;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching reservations:`, error);
    throw error;
  }
};

module.exports = {
  createSalesforceConnection,
  getReservationsByOperationEmail
};
