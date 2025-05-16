import React from 'react';
import { LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const { logout } = useAuth();
  
  return (
    <motion.header 
      className="bg-white border-b border-neutral-200 sticky top-0 z-10"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <div className="text-accent-600 font-bold text-xl">
                Bodrum Luxury Travel
              </div>
            </div>
          </div>
        </div>
        
        <h1 className="text-xl font-semibold hidden md:block">{title}</h1>
        
        <Button 
          variant="secondary" 
          onClick={logout}
          icon={<LogOut className="w-4 h-4" />}
        >
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </motion.header>
  );
};

export default Header;