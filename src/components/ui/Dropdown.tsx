import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedOption = options.find(option => option.value === value);

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          {label}
        </label>
      )}
      
      <button
        type="button"
        className="dropdown flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? "text-neutral-900" : "text-neutral-500"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-5 w-5 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-xl border border-neutral-200 py-1 max-h-60 overflow-auto">
          {options.map((option) => (
            <div
              key={option.value}
              className={`px-4 py-2 text-sm cursor-pointer hover:bg-neutral-50 ${
                option.value === value ? 'bg-primary-50 text-primary-700' : 'text-neutral-800'
              }`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;