import React, { useState } from 'react';
import { Eye, Search, Users } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { Transfer } from '../../types';
import { motion } from 'framer-motion';
import SkeletonRow from './SkeletonRow';

interface TransfersTableProps {
  transfers: Transfer[];
  isLoading: boolean;
  onViewTransfer: (id: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const TransfersTable: React.FC<TransfersTableProps> = ({
  transfers,
  isLoading,
  onViewTransfer,
  searchTerm,
  onSearchChange,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  
  // Calculate pagination
  const totalPages = Math.ceil(transfers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransfers = transfers.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-soft overflow-hidden border border-neutral-200">
      {/* Search bar */}
      <div className="p-4 border-b border-neutral-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-neutral-400" />
          </div>
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search transfers..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Pickup Date/Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Passenger Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Pickup Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Dropoff Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                <Users className="h-4 w-4" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {isLoading ? (
              // Skeleton rows
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : (
              // Actual data rows
              currentTransfers.map((transfer, index) => (
                <motion.tr 
                  key={transfer.id}
                  className="hover:bg-neutral-50 cursor-pointer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onViewTransfer(transfer.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-neutral-900">{transfer.date}</div>
                      <div className="text-neutral-500">{transfer.pickupTime}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                    {transfer.passengerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                    {transfer.origin}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                    {transfer.destination}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-neutral-400 mr-1" />
                      <span>{transfer.passengerCount}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <StatusBadge status={transfer.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button 
                      className="text-primary-600 hover:text-primary-800 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewTransfer(transfer.id);
                      }}
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="px-4 py-3 border-t border-neutral-200 sm:px-6 flex items-center justify-between">
        <div className="hidden sm:block">
          <p className="text-sm text-neutral-700">
            Showing {startIndex + 1} to {Math.min(endIndex, transfers.length)} of {transfers.length} transfers
          </p>
        </div>
        <div className="flex-1 flex justify-end">
          <div className="relative z-0 inline-flex shadow-sm rounded-md">
            <button
              type="button"
              className="btn-secondary text-sm px-3"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn-secondary text-sm px-3 ml-2"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransfersTable;