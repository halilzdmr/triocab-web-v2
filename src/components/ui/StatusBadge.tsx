import React from 'react';

type StatusType = 'pending' | 'confirmed' | 'completed' | 'cancelled';

interface StatusBadgeProps {
  status: StatusType;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
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
      default:
        return 'bg-neutral-50 text-neutral-700 border-neutral-500';
    }
  };

  const getStatusText = (): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <span className={`badge border ${getStatusStyles()}`}>
      {getStatusText()}
    </span>
  );
};

export default StatusBadge;