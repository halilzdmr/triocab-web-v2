import React from 'react';
import { motion } from 'framer-motion';
import { Ship } from 'lucide-react';

const EmptyState: React.FC = () => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-primary-50 p-6 rounded-full mb-4">
        <Ship className="h-14 w-14 text-primary-600" />
      </div>
      <h3 className="text-xl font-semibold text-neutral-800 mb-2">No transfers yet 🎉</h3>
      <p className="text-neutral-600 max-w-md mx-auto">
        Looks like there are no transfers matching your criteria. Try changing your filters or check back later.
      </p>
    </motion.div>
  );
};

export default EmptyState;