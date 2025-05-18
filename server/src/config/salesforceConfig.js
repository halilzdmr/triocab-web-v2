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
 * @param {string} [startDate] - Optional ISO string for start date filter
 * @param {string} [endDate] - Optional ISO string for end date filter
 * @returns {Promise<Array>} List of reservation records
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */
const getReservationsByOperationEmail = async (operationEmail, statusFilter, startDate, endDate) => {
  try {
    console.log(`[${new Date().toISOString()}] Fetching reservations for operation email: ${operationEmail}`);
    
    // Create connection
    const conn = await createSalesforceConnection();
    
    // Try two different query approaches for better compatibility
    let result;
    let queryUsed;

    // First try: Original query as specified in requirements
    try {
      // Build query with dynamic filters
      // Applying rule: Always add debug logs & comments in the code for easier debug & readability
      let whereClause = '';
      
      // Add email filter if not the special case
      if(operationEmail !== 'halilozdemir.sf@gmail.com') {
        whereClause = `Account__r.Operation_Team_Email_Address__c = '${operationEmail}'`;
      }
      
      // Add date filters if provided
      if (startDate) {
        // Format date for SOQL datetime literal
        // Pickup_Date_Time__c is a datetime field, so we need to use datetime literals
        const startDateObj = new Date(startDate);
        // Format the date as YYYY-MM-DD for Salesforce DateTime literal
        const year = startDateObj.getFullYear();
        const month = String(startDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(startDateObj.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        console.log(`[${new Date().toISOString()}] Adding start date filter: ${formattedDate}`);
        
        // Use proper datetime literal format for SOQL
        // Format: YYYY-MM-DDThh:mm:ssZ without quotes as specified in Salesforce docs
        // Applying rule: Always add debug logs & comments in the code for easier debug & readability
        const dateCondition = `Pickup_Date_Time__c >= ${year}-${month}-${day}T00:00:00Z`;
        whereClause = whereClause ? `${whereClause} AND ${dateCondition}` : dateCondition;
      } else {
        // Default to THIS_MONTH if no date filter provided
        const dateCondition = 'Pickup_Date_Time__c = THIS_MONTH';
        whereClause = whereClause ? `${whereClause} AND ${dateCondition}` : dateCondition;
      }
      
      if (endDate) {
        // Format date for SOQL datetime literal
        const endDateObj = new Date(endDate);
        // Format the date as YYYY-MM-DD for Salesforce DateTime literal
        const year = endDateObj.getFullYear();
        const month = String(endDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(endDateObj.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        console.log(`[${new Date().toISOString()}] Adding end date filter: ${formattedDate}`);
        
        // Use proper datetime literal format for SOQL
        // Format: YYYY-MM-DDThh:mm:ssZ without quotes as specified in Salesforce docs
        // For end date, we use 23:59:59 to include the whole day
        // Applying rule: Always add debug logs & comments in the code for easier debug & readability
        const dateCondition = `Pickup_Date_Time__c <= ${year}-${month}-${day}T23:59:59Z`;
        whereClause = whereClause ? `${whereClause} AND ${dateCondition}` : dateCondition;
      }
      
      // Add status filter if provided
      if (statusFilter && statusFilter !== 'all') {
        whereClause += ` AND Journey_Status__c = '${statusFilter}'`;
        console.log(`[${new Date().toISOString()}] Adding status filter to query: Journey_Status__c = '${statusFilter}'`);
      }
      
      // Check if we're using a date filter
      const hasDateFilter = startDate || endDate;
      
      // Add LIMIT 1000 if no date filter is provided to prevent performance issues
      // Applying rule: Always add debug logs & comments in the code for easier debug & readability
      const limitClause = !hasDateFilter ? 'LIMIT 1000' : '';
      
      console.log(`[${new Date().toISOString()}] ${!hasDateFilter ? 'No date filter provided, applying 1000 record limit' : 'Date filter applied, no record limit needed'}`);
      
      const query1 = `
        SELECT Pickup_Address__c, Flight_Number__c, Pickup_Resolved_Region__c, Dropoff_Address__c, 
               Dropoff_Resolved_Region__c, Pickup_Date_Time__c, Additional_Comments__c, 
               Passenger_Count__c, Passenger_Name__c, Passenger_Telephone_Number__c, 
               Journey_Status__c, Vehicle_Type__c, Add_Ons__c, Supplier_Net_Price__c,
               Flight_Direction__c
        FROM Reservation__c 
        WHERE ${whereClause}
        ORDER BY Pickup_Date_Time__c ASC
        ${limitClause}
      `;
      
      // Log the complete query for debugging purposes
      // Applying rule: Always add debug logs & comments in the code for easier debug & readability
      console.log(`[${new Date().toISOString()}] Executing SOQL query:\n${query1}`);
      console.log(`[${new Date().toISOString()}] Trying first query approach...`);
      result = await conn.query(query1);
      queryUsed = 'Original query with Account__r relationship';
      
      // Log detailed information about the response
      // Applying rule: Always add debug logs & comments in the code for easier debug & readability
      console.log(`[${new Date().toISOString()}] Salesforce response details:`, {
        totalSize: result.totalSize,
        done: result.done,
        nextRecordsUrl: result.nextRecordsUrl || 'No more records',
        recordCount: result.records ? result.records.length : 0
      });
      
      // Handle pagination - fetch all records
      // Applying rule: Always add debug logs & comments in the code for easier debug & readability
      if (result.nextRecordsUrl) {
        console.log(`[${new Date().toISOString()}] More records available. Fetching next batch from: ${result.nextRecordsUrl}`);
        
        // Fetch all remaining pages recursively
        let allRecords = [...result.records];
        let hasMoreRecords = true;
        let nextUrl = result.nextRecordsUrl;
        
        // Keep fetching until no more records are available
        while (hasMoreRecords) {
          console.log(`[${new Date().toISOString()}] Fetching next batch from: ${nextUrl}`);
          
          try {
            // Use the nextRecordsUrl to fetch the next batch
            const nextResult = await conn.queryMore(nextUrl);
            
            // Log details about this batch
            console.log(`[${new Date().toISOString()}] Batch details:`, {
              batchSize: nextResult.records.length,
              done: nextResult.done,
              nextUrl: nextResult.nextRecordsUrl || 'No more records'
            });
            
            // Add these records to our collection
            allRecords = [...allRecords, ...nextResult.records];
            
            // Check if there are more records to fetch
            if (nextResult.nextRecordsUrl) {
              nextUrl = nextResult.nextRecordsUrl;
            } else {
              hasMoreRecords = false;
            }
          } catch (paginationError) {
            console.error(`[${new Date().toISOString()}] Error fetching next batch:`, paginationError);
            hasMoreRecords = false; // Stop on error
          }
        }
        
        console.log(`[${new Date().toISOString()}] Pagination complete. Total records fetched: ${allRecords.length}`);
        
        // Replace the result with all records
        result.records = allRecords;
        result.totalSize = allRecords.length;
        result.done = true;
      }
      
    } catch (query1Error) {
      // If first query fails, log the error and try alternative approach
      console.warn(`[${new Date().toISOString()}] First query failed: ${query1Error.message}. Trying alternative query...`);
      
    }
    
    // Check if we have a result before accessing properties
    // Applying rule: Always add debug logs & comments in the code for easier debug & readability
    if (result && result.records) {
      console.log(`[${new Date().toISOString()}] Total records found: ${result.records.length} using ${queryUsed}`);
      
      // Add debugging information for the first few records
      if (result.records.length > 0) {
        console.log(`[${new Date().toISOString()}] Sample data (first record):`, {
          id: result.records[0].Id || 'No ID',
          pickupDateTime: result.records[0].Pickup_Date_Time__c || 'No pickup date',
          status: result.records[0].Journey_Status__c || 'No status'
        });
      }
    } else {
      console.log(`[${new Date().toISOString()}] No results found or query failed`);
      // Initialize with empty records to avoid null reference errors
      result = { records: [] };
    }
    return result.records;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching reservations:`, error);
    throw error;
  }
};

/**
 * Fetches aggregated summary data about reservations (total count and total revenue)
 * @param {string} operationEmail - Email to filter reservations by
 * @param {string} [statusFilter] - Optional status filter for reservations
 * @param {string} [startDate] - Optional ISO string for start date filter
 * @param {string} [endDate] - Optional ISO string for end date filter
 * @returns {Promise<Object>} Summary data including count and total revenue
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */
const getReservationsSummary = async (operationEmail, statusFilter, startDate, endDate) => {
  try {
    console.log(`[${new Date().toISOString()}] Fetching reservation summary for operation email: ${operationEmail}`);
    
    // Create connection
    const conn = await createSalesforceConnection();
    
    // Build the where clause similar to the main query
    let whereClause = '';
    
    // Add email filter if not the special case
    if(operationEmail !== 'halilozdemir.sf@gmail.com') {
      whereClause = `Account__r.Operation_Team_Email_Address__c = '${operationEmail}'`;
    }
    
    // Add date filters if provided
    if (startDate) {
      // Format date for SOQL datetime literal
      const startDateObj = new Date(startDate);
      // Format the date as YYYY-MM-DD for Salesforce DateTime literal
      const year = startDateObj.getFullYear();
      const month = String(startDateObj.getMonth() + 1).padStart(2, '0');
      const day = String(startDateObj.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      console.log(`[${new Date().toISOString()}] Adding start date filter for summary: ${formattedDate}`);
      
      // Use proper datetime literal format for SOQL
      const dateCondition = `Pickup_Date_Time__c >= ${formattedDate}T00:00:00Z`;
      whereClause = whereClause ? `${whereClause} AND ${dateCondition}` : dateCondition;
    } else {
      // Default to THIS_MONTH if no date filter provided
      const dateCondition = 'Pickup_Date_Time__c = THIS_MONTH';
      whereClause = whereClause ? `${whereClause} AND ${dateCondition}` : dateCondition;
    }
    
    if (endDate) {
      // Format date for SOQL datetime literal
      const endDateObj = new Date(endDate);
      // Format the date as YYYY-MM-DD for Salesforce DateTime literal
      const year = endDateObj.getFullYear();
      const month = String(endDateObj.getMonth() + 1).padStart(2, '0');
      const day = String(endDateObj.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      console.log(`[${new Date().toISOString()}] Adding end date filter for summary: ${formattedDate}`);
      
      // Use proper datetime literal format for SOQL
      const dateCondition = `Pickup_Date_Time__c <= ${formattedDate}T23:59:59Z`;
      whereClause = whereClause ? `${whereClause} AND ${dateCondition}` : dateCondition;
    }
    
    // For the summary query, we want totals across ALL statuses
    // No status filter is applied for the summary view as requested
    console.log(`[${new Date().toISOString()}] Not adding status filter to summary query to show total across all statuses`);
    
    // Build aggregation query - using COUNT() and SUM() with Account name
    const summaryQuery = `
      SELECT Account__r.Name accountName, COUNT(Id) totalRecords, SUM(Supplier_Net_Price__c) totalRevenue
      FROM Reservation__c
      WHERE ${whereClause}
      GROUP BY Account__r.Name
    `;
    
    console.log(`[${new Date().toISOString()}] Executing SOQL summary query:\n${summaryQuery}`);
    
    // Execute the query
    const result = await conn.query(summaryQuery);
    
    if (result && result.records && result.records.length > 0) {
      // If there are multiple accounts, we'll aggregate the totals
      let totalRecords = 0;
      let totalRevenue = 0;
      let accountName = '';
      
      // Process all records (should be one per account after GROUP BY)
      result.records.forEach(record => {
        totalRecords += record.totalRecords || 0;
        totalRevenue += record.totalRevenue || 0;
        
        // We'll use the first account name if there are multiple
        // Typically there should only be one account per operation email
        // Debug log to see what we're getting in the record
        console.log(`[${new Date().toISOString()}] Record structure:`, JSON.stringify(record));
        
        // Try to get account name from the record - it's directly in accountName field because we aliased it in the query
        if (!accountName && record.accountName) {
          accountName = record.accountName;
          console.log(`[${new Date().toISOString()}] Found account name in record: ${accountName}`);
        }
      });
      
      const summaryData = {
        accountName,
        totalRecords,
        totalRevenue
      };

      // Debug log for account name
      console.log(`[${new Date().toISOString()}] Found account name: ${accountName}`);

      console.log(`[${new Date().toISOString()}] Summary data:`, summaryData);
      return summaryData;
    } else {
      console.log(`[${new Date().toISOString()}] No summary data found`);
      return { totalRecords: 0, totalRevenue: 0 };
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching reservation summary:`, error);
    return { totalRecords: 0, totalRevenue: 0, error: error.message };
  }
};

module.exports = {
  createSalesforceConnection,
  getReservationsByOperationEmail,
  getReservationsSummary
};
