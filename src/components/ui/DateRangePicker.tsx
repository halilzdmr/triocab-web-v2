import React, { useState, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';
import { format } from 'date-fns';

/**
 * DateRangePicker Component Interface
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */
interface DateRangePickerProps {
  onChange: (range: { start: Date | null; end: Date | null }) => void;
  // Optional default values - if not provided, no dates are pre-selected
  defaultStartDate?: Date | null;
  defaultEndDate?: Date | null;
}

/**
 * DateRangePicker Component
 * Allows selection of a date range with optional reset functionality
 */
const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  onChange, 
  defaultStartDate = null, 
  defaultEndDate = null 
}) => {
  const [startDate, setStartDate] = useState<Date | null>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date | null>(defaultEndDate);
  const [isOpen, setIsOpen] = useState(false);

  // Initialize with null values or defaults if provided
  useEffect(() => {
    // Log the initial date range for debugging
    #console.log('DateRangePicker initialized with:', { 
      start: startDate ? startDate.toISOString() : null, 
      end: endDate ? endDate.toISOString() : null 
    });
    
    onChange({ start: startDate, end: endDate });
  }, []);

  /**
   * Handle start date changes from the date picker
   */
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    setStartDate(date);
    onChange({ start: date, end: endDate });
    #console.log('Start date changed:', date ? date.toISOString() : null);
  };

  /**
   * Handle end date changes from the date picker
   */
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    setEndDate(date);
    onChange({ start: startDate, end: date });
    #console.log('End date changed:', date ? date.toISOString() : null);
  };

  /**
   * Reset both dates to null and notify parent component
   */
  const handleReset = () => {
    setStartDate(null);
    setEndDate(null);
    onChange({ start: null, end: null });
    setIsOpen(false);
    #console.log('Date range reset');
  };

  /**
   * Toggle the date picker dropdown
   */
  const togglePicker = () => {
    setIsOpen(!isOpen);
  };

  /**
   * Format a date for display or show placeholder
   */
  const formatDisplayDate = (date: Date | null): string => {
    return date ? format(date, 'MMM dd, yyyy') : 'Select date';
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between p-2 border border-neutral-300 rounded-xl bg-white">
        {/* Date display area - clickable to open/close picker */}
        <div 
          className="flex items-center space-x-2 cursor-pointer flex-grow"
          onClick={togglePicker}
        >
          <Calendar className="h-5 w-5 text-primary-600" />
          <div className="text-sm">
            <span className="font-medium text-neutral-800">
              {startDate || endDate ? (
                `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`
              ) : (
                'All Dates'
              )}
            </span>
          </div>
        </div>
        
        {/* Reset button - only shown when dates are selected */}
        {(startDate || endDate) && (
          <button 
            onClick={handleReset}
            className="p-1 hover:bg-neutral-100 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
            title="Reset date filter"
            aria-label="Reset date filter"
          >
            <X className="h-4 w-4 text-neutral-500" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-white rounded-xl shadow-card z-10 border border-neutral-200 w-full md:w-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
                onChange={handleStartDateChange}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
                onChange={handleEndDateChange}
                className="input-field w-full"
                min={startDate ? format(startDate, 'yyyy-MM-dd') : undefined}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-between">
            {/* Reset button inside the picker */}
            <button 
              className="btn-text text-sm text-red-600 hover:text-red-700"
              onClick={handleReset}
            >
              Reset
            </button>
            
            {/* Apply button */}
            <button 
              className="btn-primary text-sm"
              onClick={() => setIsOpen(false)}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;