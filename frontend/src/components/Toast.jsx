import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-500 shrink-0" />
  };

  const bgColors = {
    success: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-200',
    error: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-900 dark:text-red-200',
    info: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30 text-blue-900 dark:text-blue-200'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`fixed bottom-5 right-5 z-50 flex items-center space-x-3 p-4 rounded-xl border shadow-lg max-w-sm ${bgColors[type]} backdrop-blur-md`}
    >
      <div>{icons[type]}</div>
      <div className="flex-1 text-sm font-medium pr-2">{message}</div>
      <button 
        onClick={onClose} 
        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label="Close notification"
      >
        <X className="h-4 w-4 opacity-75" />
      </button>
    </motion.div>
  );
};

export default Toast;
