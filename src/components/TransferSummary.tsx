/**
 * TransferSummary Component
 * Displays a welcome message with the account name
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */
import React from 'react';

// Interface for the component props
interface TransferSummaryProps {
  accountName?: string; // Account name for welcome message
  isLoading?: boolean;
  dateRangeLabel?: string; // e.g., "May 18-19, 2025"
}

/**
 * TransferSummary Component
 * 
 * @param {TransferSummaryProps} props - Component props
 * @returns {JSX.Element} - Rendered component
 */
const TransferSummary: React.FC<TransferSummaryProps> = ({
  dateRangeLabel,
  isLoading = false,
  accountName,
}) => {
  // Debug log when component renders
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  React.useEffect(() => {
    console.log('TransferSummary rendering with data:', {
      dateRangeLabel,
      isLoading,
      accountName,
    });
  }, [dateRangeLabel, isLoading, accountName]);

  return (
    <div className="mb-6 bg-white rounded-xl shadow-soft border border-neutral-200 overflow-visible">
      <div className="p-6">
        {/* Welcome message with account name */}
        {isLoading ? (
          <div className="animate-pulse bg-gray-200 h-10 w-full rounded mb-2"></div>
        ) : accountName ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Welcome {accountName}
            </h1>
          </div>
        ) : null}
        
        {/* Optional date range display */}
        {dateRangeLabel && (
          <div className="text-center text-gray-600 text-sm mt-2">
            {dateRangeLabel}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransferSummary;
