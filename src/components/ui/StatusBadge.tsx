import React from 'react';

// Import the TransferStatus type for consistency
// Applying rule: Avoid duplication of code whenever possible
import { TransferStatus } from '../../types';

// Use the imported type instead of redefining
type StatusType = TransferStatus;

interface StatusBadgeProps {
  status: StatusType;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  // Get appropriate styling for each status type
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  const getStatusStyles = (): string => {
    switch (status) {
      case 'pending':
        return 'bg-warning-50 text-warning-700 border-warning-500';
      case 'confirmed':
        return 'bg-primary-50 text-primary-700 border-primary-500';
      case 'completed':
        return 'bg-success-50 text-success-700 border-success-500';
      case 'cancelled':
        return 'bg-error-50 text-error-700 border-error-500';
      case 'cancelled-with-costs':
        return 'bg-error-50 text-error-700 border-error-500';
      case 'planned':
        return 'bg-info-50 text-info-700 border-info-500';
      default:
        return 'bg-neutral-50 text-neutral-700 border-neutral-500';
    }
  };

  // Format the status text for display
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  const getStatusText = (): string => {
    // Special case for hyphenated statuses like 'cancelled-with-costs'
    if (status === 'cancelled-with-costs') {
      return 'Cancelled with Costs';
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <span className={`badge border ${getStatusStyles()}`}>
      {getStatusText()}
    </span>
  );
};

export default StatusBadge;