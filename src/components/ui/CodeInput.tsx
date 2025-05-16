import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CodeInputProps {
  length: number;
  onComplete: (code: string) => void;
}

const CodeInput: React.FC<CodeInputProps> = ({ length, onComplete }) => {
  const [code, setCode] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Only accept single digits
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    
    // Take only the last character if multiple were pasted
    newCode[index] = value.slice(-1);
    setCode(newCode);
    
    // Move to next input if we have a value
    if (value !== '' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Check if code is complete
    if (newCode.every(digit => digit !== '') && newCode.join('').length === length) {
      onComplete(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Move to previous input on backspace
    if (e.key === 'Backspace' && index > 0 && code[index] === '') {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    
    // Only process if it looks like a code
    if (!/^\d+$/.test(pastedData)) return;
    
    const newCode = [...code];
    
    // Fill the code array with pasted digits
    for (let i = 0; i < length; i++) {
      newCode[i] = pastedData[i] || '';
    }
    
    setCode(newCode);
    
    // Focus last filled input or the first empty one
    const lastIndex = Math.min(pastedData.length, length) - 1;
    if (lastIndex >= 0) {
      inputRefs.current[lastIndex]?.focus();
      
      // Check if code is complete
      if (newCode.every(digit => digit !== '') && newCode.join('').length === length) {
        onComplete(newCode.join(''));
      }
    }
  };

  return (
    <div className="flex justify-center space-x-2">
      {Array.from({ length }, (_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <input
            ref={el => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={code[index]}
            onChange={e => handleChange(index, e)}
            onKeyDown={e => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            className="w-12 h-12 text-center text-xl font-medium border border-neutral-300 rounded-lg focus:border-primary-600 focus:ring-2 focus:ring-primary-600 focus:ring-opacity-50 outline-none"
          />
        </motion.div>
      ))}
    </div>
  );
};

export default CodeInput;