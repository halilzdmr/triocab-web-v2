import React from 'react';

interface TextFieldProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  name?: string;
  required?: boolean;
  error?: string;
  fullWidth?: boolean;
}

const TextField: React.FC<TextFieldProps> = ({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  name,
  required = false,
  error,
  fullWidth = true,
}) => {
  return (
    <div className={`mb-4 ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="block text-neutral-800 font-medium mb-1">
          {label} {required && <span className="text-error-500">*</span>}
        </label>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`input-field ${error ? 'border-error-500 focus:ring-error-500 focus:border-error-500' : ''}`}
      />
      {error && <p className="mt-1 text-error-500 text-sm">{error}</p>}
    </div>
  );
};

export default TextField;