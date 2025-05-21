/**
 * Transfer Controller
 * Handles fetching reservation data from Salesforce
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */

const asyncHandler = require('express-async-handler');
const { getReservationsByOperationEmail, getReservationsSummary } = require('../config/salesforceConfig');
const { AppError } = require('../middleware/errorMiddleware');
const ExcelJS = require('exceljs');
// Applying rule: Always add debug logs & comments in the code for easier debug & readability

/**
 * Get transfers for the authenticated user
 * GET /transfers
 * 
 * Fields mapping with UI:
 * - Status => Journey_Status__c
 * - Pickup Date/Time => Pickup_Date_Time__c
 * - Passenger Name => Passenger_Name__c
 * - Pickup Address => Pickup_Address__c
 * - Dropoff Address => Dropoff_Address__c
 * - Vehicle Type => Vehicle_Type__c
 * - Total Price => Supplier_Net_Price__c
 */
const getTransfers = asyncHandler(async (req, res) => {
  // Get email from JWT token (added by verifyJwt middleware)
  const { email } = req.user;
  
  // Get query parameters for filtering (if any)
  // Extract query parameters for filtering
  let { status, start_date, end_date } = req.query;
  
  // If no date filter is applied and we have historical data (from 2023),
  // let's adjust the start_date to include historical data
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  if (!start_date) {
    //start_date = '2023-01-01T00:00:00.000Z';
    console.log(`[${new Date().toISOString()}] No start date provided, defaulting to: ${start_date} to include historical data`);
  }
  
  // Debug log for transfer request with any filters
  console.log(`[${new Date().toISOString()}] Fetching transfers for user: ${email}, filters: ${JSON.stringify({ status, start_date, end_date })}`);
  
  // Map email to operational email if needed (using same value by default per requirements)
  // This mapping could be extended in the future if needed
  const operationalEmail = email;
  
  try {
    // Get reservations from Salesforce with optional filters
    // Applying rule: Always add debug logs & comments in the code for easier debug & readability
    console.log(`[${new Date().toISOString()}] Fetching reservations with filters:`, {
      status: status || 'none',
      start_date: start_date || 'none',
      end_date: end_date || 'none'
    });
    const reservations = await getReservationsByOperationEmail(operationalEmail, status, start_date, end_date);
    
    // Debug log for successful fetch
    console.log(`[${new Date().toISOString()}] Successfully fetched ${reservations.length} reservations for ${email}`);
    
    // Apply filters if provided
    let filteredReservations = [...reservations];
    
    // Filter by status if provided
    // Applying rule: Always add debug logs & comments in the code for easier debug & readability
    if (status) {
      console.log(`[${new Date().toISOString()}] Filtering by status: ${status}`);
      // Added support for 'Completed' and 'Cancelled with Costs'
      filteredReservations = filteredReservations.filter(res => 
        res.Journey_Status__c === status
      );
      console.log(`[${new Date().toISOString()}] After status filtering: ${filteredReservations.length} reservations remain`);
    }
    /*
    // Filter by date range if provided
    if (start_date) {
      try {
        // Ensure we have a valid date object
        // Check if the string is in ISO format or another format
        const startDate = new Date(start_date);
        
        // Validate that we have a valid date
        if (isNaN(startDate.getTime())) {
          throw new Error(`Invalid start date format: ${start_date}`);
        }
        
        // Applying rule: Always add debug logs & comments in the code for easier debug & readability
        // Set to beginning of day (00:00:00.000) to include the entire day
        startDate.setHours(0, 0, 0, 0);
        
        // Log the date values for comprehensive debugging
        console.log(`[${new Date().toISOString()}] Filtering by start date: ${startDate.toISOString()}`);
        console.log(`[${new Date().toISOString()}] Reservations before filtering: ${filteredReservations.length}`);
        console.log(`[${new Date().toISOString()}] First few pickup dates in data:`, 
          filteredReservations.slice(0, 3).map(r => {
            const parsed = new Date(r.Pickup_Date_Time__c);
            return {
              id: r.Id || 'unknown',
              status: r.Journey_Status__c || 'unknown',
              raw: r.Pickup_Date_Time__c,
              parsed: parsed.toISOString(),
              valid: !isNaN(parsed.getTime())
            };
          })
        );
        
        // Track how many are filtered out for debugging
        let filteredOutCount = 0;
        
        // Filter the reservations with detailed error handling
        filteredReservations = filteredReservations.filter(res => {
          try {
            // Ensure we have pickup date data
            if (!res.Pickup_Date_Time__c) {
              console.warn(`[${new Date().toISOString()}] Missing Pickup_Date_Time__c for reservation: ${res.Id || 'unknown'}`);
              filteredOutCount++;
              return false;
            }
            
            // Ensure Pickup_Date_Time__c is treated as UTC for consistent parsing
            // Salesforce DATETIME fields are stored in UTC and usually returned with 'Z' or as GMT.
            // If the string doesn't end with 'Z', explicitly append it to guide `new Date()`.
            const pickupDateTimeString = res.Pickup_Date_Time__c;
            const ensuredUtcPickupDateTimeString = pickupDateTimeString.endsWith('Z') || pickupDateTimeString.includes('+') || pickupDateTimeString.includes('-') 
                                                 ? pickupDateTimeString 
                                                 : pickupDateTimeString.replace(' ', 'T') + 'Z'; // Replace space if any, then append Z

            const pickupDate = new Date(ensuredUtcPickupDateTimeString);
            if (isNaN(pickupDate.getTime())) {
              console.warn(`[${new Date().toISOString()}] Invalid pickup date in reservation: ${res.Id || 'unknown'}, raw: '${res.Pickup_Date_Time__c}', parsed as: '${ensuredUtcPickupDateTimeString}'`);
              filteredOutCount++;
              return false;
            }
            
            const result = pickupDate >= startDate;
            
            // Only log the first few comparisons to avoid console flood
            if (filteredReservations.indexOf(res) < 3) { // Check original array index or a counter
              console.log(`[${new Date().toISOString()}] Date Filter Check (Start): Res ID ${res.Id || 'unknown'}`, {
                rawPickupDateTime: res.Pickup_Date_Time__c,
                ensuredUtcString: ensuredUtcPickupDateTimeString,
                parsedPickupDateEpoch: pickupDate.getTime(),
                pickupDateISO: pickupDate.toISOString(),
                filterStartDateEpoch: startDate.getTime(),
                filterStartDateISO: startDate.toISOString(),
                comparison: `${pickupDate.toISOString()} (pickup) >= ${startDate.toISOString()} (filterStart)`,
                result: result
              });
            }
            
            if (!result) filteredOutCount++;
            return result;
          } catch (err) {
            console.error(`[${new Date().toISOString()}] Error processing reservation date for ID ${res.Id || 'unknown'}:`, err);
            filteredOutCount++;
            return false;
          }
        });
        
        console.log(`[${new Date().toISOString()}] After start date filtering: filtered out ${filteredOutCount} reservations, ${filteredReservations.length} remaining`);
      } catch (dateError) {
        console.error(`[${new Date().toISOString()}] Error parsing start date:`, dateError);
      }
    }
    
    if (end_date) {
      try {
        // Ensure we have a valid date object
        const endDate = new Date(end_date);
        
        // Validate that we have a valid date
        if (isNaN(endDate.getTime())) {
          throw new Error(`Invalid end date format: ${end_date}`);
        }
        
        // Set to end of day (23:59:59.999) to include the entire day
        // Applying rule: Always add debug logs & comments in the code for easier debug & readability
        endDate.setHours(23, 59, 59, 999);
        
        console.log(`[${new Date().toISOString()}] Filtering by end date (adjusted to EOD): ${endDate.toISOString()}`);
        console.log(`[${new Date().toISOString()}] Reservations before end date filtering: ${filteredReservations.length}`);
        
        // Track how many are filtered out for debugging
        let filteredOutCount = 0;
        
        // Filter the reservations with detailed error handling
        filteredReservations = filteredReservations.filter(res => {
          try {
            // Ensure we have pickup date data
            if (!res.Pickup_Date_Time__c) {
              console.warn(`[${new Date().toISOString()}] Missing Pickup_Date_Time__c for reservation: ${res.Id || 'unknown'}`);
              filteredOutCount++;
              return false;
            }
            
            // Ensure Pickup_Date_Time__c is treated as UTC for consistent parsing
            const pickupDateTimeString = res.Pickup_Date_Time__c;
            const ensuredUtcPickupDateTimeString = pickupDateTimeString.endsWith('Z') || pickupDateTimeString.includes('+') || pickupDateTimeString.includes('-')
                                                 ? pickupDateTimeString
                                                 : pickupDateTimeString.replace(' ', 'T') + 'Z';

            const pickupDate = new Date(ensuredUtcPickupDateTimeString);
            if (isNaN(pickupDate.getTime())) {
              console.warn(`[${new Date().toISOString()}] Invalid pickup date in reservation: ${res.Id || 'unknown'}, raw: '${res.Pickup_Date_Time__c}', parsed as: '${ensuredUtcPickupDateTimeString}'`);
              filteredOutCount++;
              return false;
            }
            
            const result = pickupDate <= endDate;
            
            // Only log the first few comparisons to avoid console flood
            if (filteredReservations.indexOf(res) < 3) { // Check original array index or a counter
              console.log(`[${new Date().toISOString()}] Date Filter Check (End): Res ID ${res.Id || 'unknown'}`, {
                rawPickupDateTime: res.Pickup_Date_Time__c,
                ensuredUtcString: ensuredUtcPickupDateTimeString,
                parsedPickupDateEpoch: pickupDate.getTime(),
                pickupDateISO: pickupDate.toISOString(),
                filterEndDateEpoch: endDate.getTime(),
                filterEndDateISO: endDate.toISOString(),
                comparison: `${pickupDate.toISOString()} (pickup) <= ${endDate.toISOString()} (filterEnd)`,
                result: result
              });
            }
            
            if (!result) filteredOutCount++;
            return result;
          } catch (err) {
            console.error(`[${new Date().toISOString()}] Error processing reservation date for ID ${res.Id || 'unknown'}:`, err);
            filteredOutCount++;
            return false;
          }
        });
        
        console.log(`[${new Date().toISOString()}] After end date filtering: filtered out ${filteredOutCount} reservations, ${filteredReservations.length} remaining`);
      } catch (dateError) {
        console.error(`[${new Date().toISOString()}] Error parsing end date:`, dateError);
      }
    }*/
    
    console.log(`[${new Date().toISOString()}] After filtering: ${filteredReservations.length} reservations`);
    
    // Return the data structured according to the field mapping
    res.status(200).json({
      status: 'success',
      results: filteredReservations.length,
      data: filteredReservations
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching reservations:`, error);
    throw new AppError('Failed to fetch reservation data from Salesforce', 500);
  }
});

/**
 * Get summary statistics for transfers (total count and total revenue)
 * GET /transfers/summary
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */
const getTransfersSummary = asyncHandler(async (req, res) => {
  // Get email from JWT token (added by verifyJwt middleware)
  const { email } = req.user;
  
  // Get query parameters for filtering (if any)
  let { status, start_date, end_date } = req.query;
  
  // Debug log for transfer summary request with any filters
  console.log(`[${new Date().toISOString()}] Fetching transfer summary for user: ${email}, filters: ${JSON.stringify({ status, start_date, end_date })}`);
  
  // Map email to operational email
  const operationalEmail = email;
  
  try {
    // Get summary data from Salesforce with optional filters
    // Applying rule: Always add debug logs & comments in the code for easier debug & readability
    console.log(`[${new Date().toISOString()}] Fetching summary with filters:`, {
      status: status || 'none',
      start_date: start_date || 'none',
      end_date: end_date || 'none'
    });
    
    const summaryData = await getReservationsSummary(operationalEmail, status, start_date, end_date);
    
    // Format the response
    const formattedResponse = {
      totalRecords: summaryData.totalRecords,
      totalRevenue: summaryData.totalRevenue,
      // Include account name for welcome message
      accountName: summaryData.accountName || '',
      // Format currency for display
      formattedTotalRevenue: new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'EUR'
      }).format(summaryData.totalRevenue || 0)
    };
    
    // Debug log for account name
    console.log(`[${new Date().toISOString()}] Adding account name to response: ${summaryData.accountName || 'Not found'}`);

    
    // Return the summary data
    res.status(200).json({
      status: 'success',
      data: formattedResponse
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching transfer summary:`, error);
    throw new AppError('Failed to fetch transfer summary data', 500);
  }
});

/**
 * Download transfers as an Excel file with separate sheets for arrivals, departures, and others
 * GET /transfers/download
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */
const downloadTransfersAsExcel = asyncHandler(async (req, res) => {
  // Get email from JWT token (added by verifyJwt middleware)
  const { email } = req.user;
  
  // Get query parameters for filtering (if any)
  let { status, start_date, end_date } = req.query;
  
  // Debug log for transfer download request with any filters
  console.log(`[${new Date().toISOString()}] Downloading transfers as Excel for user: ${email}, filters:`, {
    status: status || 'none',
    start_date: start_date || 'none',
    end_date: end_date || 'none'
  });
  
  // Map email to operational email
  const operationalEmail = email;
  
  try {
    // Get reservations from Salesforce with optional filters
    console.log(`[${new Date().toISOString()}] Fetching reservations for Excel export`);
    const reservations = await getReservationsByOperationEmail(operationalEmail, status, start_date, end_date);
    
    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Triocab-web';
    workbook.created = new Date();
    
    // Group reservations by flight direction
    const arrivals = reservations.filter(res => res.Flight_Direction__c === 'Arrival');
    const departures = reservations.filter(res => res.Flight_Direction__c === 'Departure');
    const others = reservations.filter(res => !res.Flight_Direction__c || (res.Flight_Direction__c !== 'Arrival' && res.Flight_Direction__c !== 'Departure'));
    
    console.log(`[${new Date().toISOString()}] Grouped reservations for Excel: ${arrivals.length} arrivals, ${departures.length} departures, ${others.length} others`);
    
    // Function to create a worksheet with the specified data
    const createWorksheet = (name, data) => {
      const sheet = workbook.addWorksheet(name);
      
      // Define columns
      sheet.columns = [
        { header: 'ID', key: 'reservationId', width: 20 },
        { header: 'Passenger Name', key: 'passengerName', width: 20 },
        { header: 'Passenger Phone Number', key: 'passengerPhone', width: 20 },
        { header: 'Flight Number', key: 'flightNumber', width: 15 },
        { header: 'Flight Direction', key: 'flightDirection', width: 15 },
        { header: 'Pickup Date', key: 'pickupDate', width: 15 },
        { header: 'Pickup Time', key: 'pickupTime', width: 15 },
        { header: 'Pickup Address', key: 'pickupAddress', width: 25 },
        { header: 'Dropoff Address', key: 'dropoffAddress', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Vehicle Type', key: 'vehicleType', width: 15 },
        { header: 'Price (EUR)', key: 'price', width: 12 }
      ];
      
      // Add data rows
      data.forEach(res => {
        // Parse pickup date/time
        const pickupDateTime = new Date(res.Pickup_Date_Time__c);
        
        // Format date as DD/MM/YYYY and time as HH:mm (24-hour format)
        // Applying rule: Always add debug logs & comments in the code for easier debug & readability
        const day = String(pickupDateTime.getDate()).padStart(2, '0');
        const month = String(pickupDateTime.getMonth() + 1).padStart(2, '0');
        const year = pickupDateTime.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;
        
        // Fix: Use UTC hours to ensure consistency with dashboard display
        // Applying rule: Always add debug logs & comments in the code for easier debug & readability
        const hours = String(pickupDateTime.getUTCHours()).padStart(2, '0');
        const minutes = String(pickupDateTime.getUTCMinutes()).padStart(2, '0');
        const formattedTime = `${hours}:${minutes}`;
        
        sheet.addRow({
          reservationId: res.Name || '',
          passengerName: res.Passenger_Name__c || '',
          passengerPhone: res.Passenger_Telephone_Number__c || '',
          flightNumber: res.Flight_Number__c || '',
          flightDirection: res.Flight_Direction__c || 'N/A',
          pickupDate: formattedDate,
          pickupTime: formattedTime,
          pickupAddress: res.Pickup_Address__c || '',
          dropoffAddress: res.Dropoff_Address__c || '',
          status: res.Journey_Status__c || '',
          vehicleType: res.Vehicle_Type__c || '',
          price: res.Supplier_Net_Price__c || 0
        });
      });
      
      // Style the header row
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE9EDEF' }
      };
    };
    
    // Create worksheets for each group
    createWorksheet('All Transfers', reservations); // Add a worksheet with all transfers
    createWorksheet('Arrivals', arrivals);
    createWorksheet('Departures', departures);
    createWorksheet('Address to Address', others);
    
    // Create Greeting Team sheet with specific fields for greeting team use
    // Applying rule: Always add debug logs & comments in the code for easier debug & readability
    console.log(`[${new Date().toISOString()}] Creating Greeting Team worksheet`);
    const createGreetingTeamWorksheet = () => {
      const sheet = workbook.addWorksheet('Greeting Team');
      
      // Define columns for greeting team
      sheet.columns = [
        { header: 'Passenger Phone Number', key: 'passengerPhone', width: 20 },
        { header: 'Pickup Date', key: 'pickupDate', width: 15 },
        { header: 'Pickup Time', key: 'pickupTime', width: 15 },
        { header: 'Flight Number', key: 'flightNumber', width: 15 },
        { header: 'Passenger Name', key: 'passengerName', width: 20 }
      ];
      
      // Add data rows with specific fields needed by greeting team
      // Applying rule: Always add debug logs & comments in the code for easier debug & readability
      // Filter to only include arrivals for the greeting team
      const arrivalReservations = reservations.filter(res => res.Flight_Direction__c === 'Arrival');
      console.log(`[${new Date().toISOString()}] Creating Greeting Team worksheet with ${arrivalReservations.length} arrival records`);
      
      arrivalReservations.forEach(res => {
        // Parse pickup date/time
        const pickupDateTime = new Date(res.Pickup_Date_Time__c);
        
        // Format date as DD/MM/YYYY and time as HH:mm (24-hour format)
        // Applying rule: Always add debug logs & comments in the code for easier debug & readability
        const day = String(pickupDateTime.getDate()).padStart(2, '0');
        const month = String(pickupDateTime.getMonth() + 1).padStart(2, '0');
        const year = pickupDateTime.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;
        
        // Fix: Use UTC hours to ensure consistency with dashboard display
        // Applying rule: Always add debug logs & comments in the code for easier debug & readability
        const hours = String(pickupDateTime.getUTCHours()).padStart(2, '0');
        const minutes = String(pickupDateTime.getUTCMinutes()).padStart(2, '0');
        const formattedTime = `${hours}:${minutes}`;
        
        // Applying rule: Always add debug logs & comments in the code for easier debug & readability
        // For Greeting Team, display "YOK" instead of empty cell when Flight Number is missing
        sheet.addRow({
          passengerPhone: res.Passenger_Telephone_Number__c || '',
          pickupDate: formattedDate,
          pickupTime: formattedTime,
          flightNumber: res.Flight_Number__c ? res.Flight_Number__c : 'YOK',
          passengerName: res.Passenger_Name__c || ''
        });
      });
      
      // Style the header row
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE9EDEF' }
      };
    };
    
    // Call the function to create the Greeting Team worksheet
    createGreetingTeamWorksheet();
    
    // Set the response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=transfers.xlsx');
    
    // Write the workbook to the response
    console.log(`[${new Date().toISOString()}] Writing Excel file to response`);
    await workbook.xlsx.write(res);
    
    console.log(`[${new Date().toISOString()}] Excel file sent successfully`);
    res.end();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error generating Excel file:`, error);
    throw new AppError('Failed to generate Excel file', 500);
  }
});

module.exports = {
  getTransfers,
  getTransfersSummary,
  downloadTransfersAsExcel
};
