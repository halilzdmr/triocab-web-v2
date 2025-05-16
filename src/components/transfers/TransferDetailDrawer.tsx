import React from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Calendar, Clock, Users, Phone, Plane, Car } from 'lucide-react';
import { Transfer } from '../../types';

interface TransferDetailDrawerProps {
  transfer: Transfer | null;
  isOpen: boolean;
  onClose: () => void;
}

const TransferDetailDrawer: React.FC<TransferDetailDrawerProps> = ({
  transfer,
  isOpen,
  onClose,
}) => {
  if (!transfer) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-30 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <motion.div
        className="fixed top-0 right-0 h-full w-full sm:w-3/4 md:w-1/2 lg:w-2/5 xl:w-1/3 bg-white z-30 shadow-xl overflow-y-auto"
        initial={{ x: '100%' }}
        animate={{ x: isOpen ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-xl font-semibold text-neutral-900">Transfer Details</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100 transition-colors"
          >
            <X className="h-6 w-6 text-neutral-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Journey Details */}
          <div className="space-y-6 mb-8">
            {/* Locations */}
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-neutral-400 mt-1 flex-shrink-0" />
              <div>
                <div className="font-medium text-lg text-neutral-900">{transfer.longPickupAddress}</div>
                <div className="h-8 border-l-2 border-dashed border-neutral-300 ml-2 my-1"></div>
                <div className="font-medium text-lg text-neutral-900">{transfer.longDropoffAddress}</div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-neutral-400" />
                <span className="text-neutral-900">{transfer.date}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-neutral-400" />
                <span className="text-neutral-900">{transfer.pickupTime}</span>
              </div>
            </div>

            {/* Vehicle Type */}
            <div className="flex items-center space-x-3">
              <Car className="w-5 h-5 text-neutral-400" />
              <div>
                <div className="font-medium text-neutral-900">{transfer.vehicleType}</div>
                <div className="text-sm text-neutral-500">Vehicle Type</div>
              </div>
            </div>

            {/* Price */}
            <div className="bg-neutral-50 rounded-xl p-4 flex items-center justify-between">
              <span className="text-neutral-600">Total Price</span>
              <span className="text-xl font-semibold text-neutral-900">EUR {transfer.price || 'N/A'}</span>
            </div>
          </div>

          {/* Passenger Details */}
          <div className="space-y-6">
            {/* Passenger Info */}
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-neutral-400" />
              <div>
                <div className="font-medium text-neutral-900">{transfer.passengerName}</div>
                <div className="text-sm text-neutral-500">{transfer.passengerCount} passengers</div>
              </div>
            </div>

            {/* Contact */}
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-neutral-400" />
              <span className="text-neutral-900">{transfer.contactPhone}</span>
            </div>

            {/* Flight Number */}
            <div className="flex items-center space-x-3">
              <Plane className="w-5 h-5 text-neutral-400" />
              <div>
                <div className="font-medium text-neutral-900">{transfer.flightNumber || 'N/A'}</div>
                <div className="text-sm text-neutral-500">Flight Number</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default TransferDetailDrawer;