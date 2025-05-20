/**
 * Dashboard Page Component
 * Displays transfers/reservations from Salesforce API
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */
import React from 'react';
import { motion } from 'framer-motion';
import Header from '../components/layout/Header';
import DateRangePicker from '../components/ui/DateRangePicker';
import TransfersTable from '../components/transfers/TransfersTable';
import TransferDetailDrawer from '../components/transfers/TransferDetailDrawer';
import EmptyState from '../components/transfers/EmptyState';
import { useTransfers } from '../hooks/useTransfers';
import { format } from 'date-fns'; // Keep format since it's used for date formatting
import { useAuth } from '../contexts/AuthContext'; // For getting the JWT token

/**
 * Dashboard Page Component implementation
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */
const DashboardPage: React.FC = () => {
  // Destructure state and handlers from our custom hook
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  // We're only showing 'Planned' status records, so we don't need the status filter variables
  const { 
    transfers, 
    isLoading, 
    error, 
    searchTerm, 
    setSearchTerm,
    dateRange,
    setDateRange,
    selectedTransfer,
    isDrawerOpen,
    setIsDrawerOpen,
    handleViewTransfer,
    statusFilter,
    // Only need the account name from summary data now
    summaryData
  } = useTransfers();
  
  // For accessing JWT token to authenticate Excel download
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  const { user } = useAuth();
  
  // State for tracking if download is in progress
  const [isDownloading, setIsDownloading] = React.useState(false);

  // Debug log for account name in summary data
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  React.useEffect(() => {
    console.log('DashboardPage summaryData:', summaryData);
    console.log('Account name in DashboardPage:', summaryData?.accountName);
  }, [summaryData]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header title={''} />
      <main className="container mx-auto px-4 py-6">
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Welcome message with account name */}
          {summaryData?.accountName && (
            <motion.div variants={itemVariants} className="text-center text-gray-800 font-semibold text-xl mb-4">
              {`Welcome ${summaryData?.accountName || ''}`}
            </motion.div>
          )}
          
          {/* Action Buttons */}
          <motion.div 
            className="flex justify-end gap-2 mb-2" 
            variants={itemVariants}
          >
            <button
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                // Prevent double-clicks
                if (isDownloading) return;
                
                // Apply debug logs
                // Applying rule: Always add debug logs & comments in the code for easier debug & readability
                console.debug('Download Excel button clicked');
                
                setIsDownloading(true);
                
                // Construct query parameters for filtering
                const params = new URLSearchParams();
                if (statusFilter && statusFilter !== 'all') {
                  params.append('status', statusFilter);
                }
                if (dateRange.start) {
                  params.append('start_date', dateRange.start.toISOString());
                }
                if (dateRange.end) {
                  params.append('end_date', dateRange.end.toISOString());
                }
                
                // API base URL - adjust for production vs development
                const API_BASE_URL = process.env.NODE_ENV === 'production' 
                  ? 'https://api.bodrumluxurytravel.com' 
                  : 'http://192.168.90.184:5001';
                
                // Construct the download URL with query parameters
                // Remove the /api prefix since the server doesn't have it
                const downloadUrl = `${API_BASE_URL}/transfers/download?${params.toString()}`;
                
                console.debug('Download URL:', downloadUrl);
                
                // Create a hidden link to trigger the download
                // We need to handle authentication by sending the JWT in headers
                fetch(downloadUrl, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${user?.token}`
                  }
                })
                .then(response => {
                  if (!response.ok) {
                    throw new Error('Failed to download Excel file');
                  }
                  return response.blob();
                })
                .then(blob => {
                  // Create a temporary link and trigger download
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.style.display = 'none';
                  a.href = url;
                  a.download = 'transfers.xlsx';
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  console.debug('Excel download completed');
                })
                .catch(error => {
                  console.error('Error downloading Excel file:', error);
                  alert('Failed to download Excel file. Please try again.');
                })
                .finally(() => {
                  setIsDownloading(false);
                });
              }}
              disabled={isLoading || isDownloading}
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Downloading...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download as Excel
                </>
              )}
            </button>
          </motion.div>
          
          {/* Filters */}
          {/* Filters Section */}
          <motion.div
            className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-soft border border-neutral-200"
            variants={itemVariants}
          >
            {/* Date Filter */}
            <div className="w-full md:w-1/2">
              <label className="text-gray-700 text-sm font-medium mb-1 block">
                Date Range
              </label>
              <DateRangePicker
                onChange={(range) => {
                  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
                  console.debug('Date range changed:', range);
                  setDateRange(range);
                }}
                defaultStartDate={dateRange.start}
                defaultEndDate={dateRange.end}
              />
            </div>
            
            {/* Status Display */}
            <div className="w-full md:w-1/2">
              <label className="text-gray-700 text-sm font-medium mb-1 block">
                Status
              </label>
              <div className="rounded-md border border-gray-300 shadow-sm p-2 bg-white flex items-center h-10">
                <div className="h-2 w-2 rounded-full bg-blue-500 mr-2"></div>
                <span className="text-gray-800">Planned</span>
              </div>
            </div>
          </motion.div>
          {/* Table or Empty State */}
          <motion.div variants={itemVariants}>
            {error && (
              <div className="text-red-600 mb-4">Error: {error}</div>
            )}
            {!isLoading && transfers.length === 0 && !error ? (
              <EmptyState />
            ) : (
              <TransfersTable
                transfers={transfers}
                isLoading={isLoading}
                searchTerm={searchTerm}
                onSearchChange={(value) => {
                  console.debug('Search term changed:', value);
                  setSearchTerm(value);
                }}
                onViewTransfer={(id) => {
                  console.debug('Viewing transfer:', id);
                  handleViewTransfer(id);
                }}
              />
            )}
          </motion.div>
        </motion.div>
      </main>
      {/* Transfer Detail Drawer */}
      <TransferDetailDrawer
        transfer={selectedTransfer}
        isOpen={isDrawerOpen}
        onClose={() => {
          console.debug('Closing drawer');
          setIsDrawerOpen(false);
        }}
      />
    </div>
  );
};

export default DashboardPage;