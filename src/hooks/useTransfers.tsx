/**
 * Custom hook for fetching and filtering transfers
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */
import { useState, useEffect, useCallback } from 'react';
import { Transfer, TransferStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, parseFormattedDate, isDateInRange } from '../utils/dateUtils';

// API base URL - adjust for production vs development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-api-url.com' 
  : 'http://localhost:5001';

interface UseTransfersProps {
  defaultStatus?: string;
}

interface DateRange {
  start: Date | null;
  end: Date | null;
}

export function useTransfers({ defaultStatus = 'Planned' }: UseTransfersProps = {}) {
  // Access auth context for token
  const { user } = useAuth();
  
  // State management for transfers
  const [allTransfers, setAllTransfers] = useState<Transfer[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(defaultStatus);
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  // Initialize with today and tomorrow as default date filter
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    console.log('Initializing date range with defaults:', {
      start: today.toISOString(),
      end: tomorrow.toISOString()
    });
    
    return {
      start: today,
      end: tomorrow
    };
  });
  
  // Additional state for selected transfer and drawer
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Map Salesforce status to our frontend status types
  const mapStatusFromSalesforce = (sfStatus: string): TransferStatus => {
    switch (sfStatus) {
      case 'Planned':
      case 'Driver Underway':
      case 'Driver Arrived':
      case 'Journey In Progress':
        return 'pending';
      case 'Completed':
        return 'completed';
      case 'No Show':
      case 'Cancelled With Costs':
        return 'cancelled';
      default:
        return 'pending'; // Default to pending for unknown statuses
    }
  };

  // Fetch transfers from API
  const fetchTransfers = useCallback(async () => {
    if (!user?.token) {
      console.error('No authentication token available');
      setError('Authentication failed. Please log in again.');
      setIsLoading(false);
      return;
    }

    try {
      // Applying rule: Always add debug logs & comments in the code for easier debug & readability
      console.log('Fetching transfers from API with filters:', { 
        status: statusFilter,
        dateRange: {
          start: dateRange.start ? dateRange.start.toISOString() : 'none',
          end: dateRange.end ? dateRange.end.toISOString() : 'none'
        }
      });
      setIsLoading(true);
      setError(null);
      
      // Build query params for filters if needed
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }
      
      // Server-side date filtering: only send to backend when we have a *complete* range.
      // Otherwise rely on client-side filtering to avoid accidentally excluding data.
      if (dateRange.start && dateRange.end) {
        queryParams.append('start_date', dateRange.start.toISOString());
        queryParams.append('end_date', dateRange.end.toISOString());
      }
      
      // Fetch data from our backend API
      const response = await fetch(`${API_BASE_URL}/transfers?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const { data } = await response.json();
      console.log(`Successfully fetched ${data?.length || 0} raw records from API`, data);
      
      // Process and store the fetched transfers
      const transformedData: Transfer[] = data.map((reservation: any) => {
        console.debug('Mapping reservation:', reservation);
        const id = reservation.Id || Math.random().toString(36).substring(2);
        const pickupDateTime = new Date(reservation.Pickup_Date_Time__c);
        const date = formatDate(pickupDateTime);
        let pickupTime = 'N/A';
        try {
          pickupTime = pickupDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch (error) {
          console.error('Error formatting pickup time:', error);
        }
        return {
          id,
          bookingReference: id,
          passengerName: reservation.Passenger_Name__c || 'Guest',
          passengerCount: reservation.Passenger_Count__c || 1,
          contactPhone: reservation.Passenger_Telephone_Number__c || 'N/A',
          origin: reservation.Pickup_Resolved_Region__c || reservation.Pickup_Address__c || 'N/A',
          longPickupAddress: reservation.Pickup_Address__c || 'N/A',
          destination: reservation.Dropoff_Resolved_Region__c || reservation.Dropoff_Address__c || 'N/A',
          longDropoffAddress: reservation.Dropoff_Address__c || 'N/A',
          date,
          pickupTime,
          flightNumber: reservation.Flight_Number__c || '',
          vehicleType: reservation.Vehicle_Type__c || 'Standard',
          status: mapStatusFromSalesforce(reservation.Journey_Status__c),
          notes: reservation.Additional_Comments__c || '',
          createdAt: new Date().toISOString(),
          price: reservation.Supplier_Net_Price__c || 'N/A',
        };
      });
      console.log(`Transformed ${transformedData.length} transfers`, transformedData);
      setAllTransfers(transformedData);
      
      // Initial filtering is applied automatically via useEffect
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching transfers:', err);
      setError('Failed to fetch transfers. Please try again later.');
      setIsLoading(false);
    }
  }, [user, statusFilter, dateRange]);

  // Apply filters to the transfers - now only applies client-side filters
  // Status filtering is now handled by the API call directly
  const applyFilters = useCallback(() => {
    console.log('Applying client-side filters:', {
      dateRange: {
        start: dateRange.start ? dateRange.start.toISOString() : 'none',
        end: dateRange.end ? dateRange.end.toISOString() : 'none'
      },
      searchTerm: searchTerm || 'none',
      totalTransfers: allTransfers.length
    });
    
    let result = [...allTransfers];
    console.debug('Initial result for filtering (allTransfers copy):', result);
    
    // Filter by date range (supports open-ended ranges)
    if (dateRange.start || dateRange.end) {
      console.log('Applying date range filter:', {
        start: dateRange.start ? dateRange.start.toISOString() : 'none',
        end: dateRange.end ? dateRange.end.toISOString() : 'none',
        transfersBeforeDateFilter: result.length,
        sampleDataBeforeDateFilter: result.slice(0, 3).map(t => ({ id: t.id, date: t.date, status: t.status}))
      });
      
      // Use utility functions to handle date parsing and range comparison reliably
      result = result.filter(transfer => {
        try {
          const transferDate = parseFormattedDate(transfer.date);
          if (!transferDate) {
            console.warn(`Could not parse date for transfer ${transfer.id}: ${transfer.date}`);
            return false;
          }
          const isInRange = isDateInRange(transferDate, dateRange.start, dateRange.end);
           
          // Debug log for a random sample (to avoid flooding console)
          // Let's log more aggressively for now, maybe first 5
          if (result.indexOf(transfer) < 5) {
            console.log(`Transfer ${transfer.id} date comparison:`, {
              transferId: transfer.id,
              dateString: transfer.date,
              parsedDate: transferDate.toISOString(),
              startDate: dateRange.start ? dateRange.start.toISOString() : 'none',
              endDate: dateRange.end ? dateRange.end.toISOString() : 'none',
              inRange: isInRange
            });
          }
           
          return isInRange;
        } catch (error) {
          console.error(`Error comparing dates for transfer ${transfer.id}:`, error);
          return false; 
        }
      });
      
      console.log(`After date filtering: ${result.length} transfers remain`);
    }
    
    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(transfer =>
        transfer.passengerName.toLowerCase().includes(search) ||
        transfer.bookingReference.toLowerCase().includes(search) ||
        (transfer.flightNumber && transfer.flightNumber.toLowerCase().includes(search)) ||
        transfer.origin.toLowerCase().includes(search) ||
        transfer.destination.toLowerCase().includes(search)
      );
      
      console.log(`After search term filtering: ${result.length} transfers remain`);
    }
    
    setFilteredTransfers(result);
  }, [allTransfers, statusFilter, dateRange, searchTerm]);
  
  // Initialize with a single API call including default filters
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  useEffect(() => {
    // Don't make the API call if we don't have user authentication yet
    if (!user?.token) return;
    
    // Only make a single API call on initial load with default filters applied
    console.log('Initial load - making single API call with default filters:', {
      status: statusFilter,
      dateRange: {
        start: dateRange.start?.toISOString(),
        end: dateRange.end?.toISOString()
      }
    });
    
    fetchTransfers();
    // We only include user and fetchTransfers in dependency array 
    // Since fetchTransfers has statusFilter and dateRange in its deps,
    // this ensures we only make an API call when user auth changes
    // or when user explicitly changes filters through the UI
  }, [user, fetchTransfers]);
  
  // Apply filters when any filter or data changes
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);
  
  // Handlers for transfer interaction
  const handleViewTransfer = useCallback((id: string) => {
    const transfer = allTransfers.find(t => t.id === id) || null;
    setSelectedTransfer(transfer);
    setIsDrawerOpen(true);
  }, [allTransfers]);

  const handleMarkCompleted = useCallback((id: string) => {
    // Update the status in the transfers array
    const updatedTransfers = allTransfers.map(transfer => 
      transfer.id === id ? { ...transfer, status: 'completed' as TransferStatus } : transfer
    );
    setAllTransfers(updatedTransfers);
    
    // Also update the selected transfer if it's open
    if (selectedTransfer && selectedTransfer.id === id) {
      setSelectedTransfer({ ...selectedTransfer, status: 'completed' });
    }
    
    // Close the drawer
    setIsDrawerOpen(false);
  }, [allTransfers, selectedTransfer]);

  return {
    // Data
    transfers: filteredTransfers,
    isLoading,
    error,
    
    // Filters
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    dateRange,
    setDateRange,
    
    // Selected transfer
    selectedTransfer,
    setSelectedTransfer,
    isDrawerOpen,
    setIsDrawerOpen,
    
    // Actions
    refreshTransfers: fetchTransfers,  // Allow components to trigger API refresh
    handleViewTransfer,
    handleMarkCompleted
  };
}
