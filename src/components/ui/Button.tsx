import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent';
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  icon,
}) => {
  const baseClasses = `${variant === 'primary' ? 'btn-primary' : variant === 'accent' ? 'btn-accent' : 'btn-secondary'} 
                       ${fullWidth ? 'w-full' : ''} 
                       ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                       ${className}`;

  return (
    <motion.button
      type={type}
      className={baseClasses}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </motion.button>
  );
};

export default Button;