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
    handleViewTransfer
  } = useTransfers();

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
      <Header title="Transfers" />
      <main className="container mx-auto px-4 py-6">
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
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