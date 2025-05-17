/**
 * Date utilities for consistent parsing and formatting across the application
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */

/**
 * Parse a date string in "MMM dd, yyyy" format (e.g., "Apr 22, 2025")
 * @param dateStr Date string to parse
 * @returns JavaScript Date object or null if invalid
 */
export function parseFormattedDate(dateStr: string): Date | null {
  try {
    // Handle empty or invalid input
    if (!dateStr || typeof dateStr !== 'string') {
      console.warn('Invalid date string provided to parseFormattedDate:', dateStr);
      return null;
    }

    // Split the date string into components
    const parts = dateStr.split(' ');
    if (parts.length !== 3) {
      console.warn('Invalid date format in parseFormattedDate. Expected "MMM dd, yyyy" format:', dateStr);
      return null;
    }
    
    // Map month names to month indices (0-11)
    const monthMap: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    // Extract date components
    const month = monthMap[parts[0]];
    const day = parseInt(parts[1].replace(',', ''));
    const year = parseInt(parts[2]);
    
    // Validate components
    if (isNaN(day) || isNaN(year) || month === undefined) {
      console.warn('Failed to parse date components:', { dateStr, month, day, year });
      return null;
    }
    
    // Create a date object (noon to avoid timezone issues)
    const date = new Date(year, month, day, 12, 0, 0);
    
    // Validate the resulting date
    if (isNaN(date.getTime())) {
      console.warn('Invalid date created from components:', { dateStr, date });
      return null;
    }
    
    return date;
  } catch (error) {
    console.error('Error in parseFormattedDate:', error);
    return null;
  }
}

/**
 * Format a Date object to "MMM dd, yyyy" format
 * @param date Date object to format
 * @returns Formatted date string or fallback text if invalid
 */
export function formatDate(date: Date, fallback: string = 'Invalid date'): string {
  try {
    if (!date || isNaN(date.getTime())) {
      return fallback;
    }
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${month} ${day}, ${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return fallback;
  }
}

/**
 * Check if a date is within a given range
 * Supports open-ended ranges when either startDate or endDate is null
 * @param date      Date to check (required)
 * @param startDate Range start date (inclusive) – optional, null means "no lower bound"
 * @param endDate   Range end date   (inclusive) – optional, null means "no upper bound"
 * @returns Boolean indicating if date is within range (inclusive)
 */
export function isDateInRange(
  date: Date,
  startDate: Date | null | undefined,
  endDate: Date | null | undefined
): boolean {
  if (!date) {
    console.debug('isDateInRange: date is null or undefined');
    return false;
  }

  try {
    // Clone the date to avoid modifying the original
    const dateToCheck = new Date(date);
    
    // Extract just the date part (year, month, day) to normalize for comparison
    // This ensures we ignore time zone issues by comparing only the date parts
    const dateYear = dateToCheck.getFullYear();
    const dateMonth = dateToCheck.getMonth();
    const dateDay = dateToCheck.getDate();
    
    // Normalize the comparison boundaries
    let inRange = true;

    if (startDate) {
      // Create a normalized start date (midnight)
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      // For date comparison, check if the day is at or after the start date
      const startYear = start.getFullYear();
      const startMonth = start.getMonth();
      const startDay = start.getDate();
      
      // Compare year, month, day hierarchically
      const isAfterStart = 
        dateYear > startYear || 
        (dateYear === startYear && dateMonth > startMonth) ||
        (dateYear === startYear && dateMonth === startMonth && dateDay >= startDay);
      
      inRange = inRange && isAfterStart;
      
      console.debug('Date range comparison (start):', {
        dateToCheck: dateToCheck.toISOString(),
        dateParts: { year: dateYear, month: dateMonth, day: dateDay },
        startDate: start.toISOString(),
        startParts: { year: startYear, month: startMonth, day: startDay },
        isAfterStart,
        inRange
      });
    }

    if (endDate) {
      // Create a normalized end date (end of day)
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      // For date comparison, check if the day is at or before the end date
      const endYear = end.getFullYear();
      const endMonth = end.getMonth();
      const endDay = end.getDate();
      
      // Compare year, month, day hierarchically
      const isBeforeEnd = 
        dateYear < endYear || 
        (dateYear === endYear && dateMonth < endMonth) ||
        (dateYear === endYear && dateMonth === endMonth && dateDay <= endDay);
      
      inRange = inRange && isBeforeEnd;
      
      console.debug('Date range comparison (end):', {
        dateToCheck: dateToCheck.toISOString(),
        dateParts: { year: dateYear, month: dateMonth, day: dateDay },
        endDate: end.toISOString(),
        endParts: { year: endYear, month: endMonth, day: endDay },
        isBeforeEnd,
        inRange
      });
    }

    return inRange;
  } catch (error) {
    console.error('Error checking date range:', error);
    return false;
  }
}
