import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useUI } from '../hooks/useRedux';
import { motion, AnimatePresence } from 'framer-motion';

const Notification = () => {
  const { notification } = useSelector((state) => state.ui);
  const { clearNotification } = useUI();

  // Auto-dismiss timer (4 seconds)
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        clearNotification();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification, clearNotification]);

  // Configuration for different types
  const getConfig = (type) => {
    switch (type) {
      case 'success':
        return { 
            icon: 'fa-circle-check', 
            color: 'text-emerald-400', 
            border: 'border-emerald-500', 
            glow: 'shadow-emerald-500/20' 
        };
      case 'error':
        return { 
            icon: 'fa-circle-xmark', 
            color: 'text-red-400', 
            border: 'border-red-500', 
            glow: 'shadow-red-500/20' 
        };
      case 'warning':
        return { 
            icon: 'fa-triangle-exclamation', 
            color: 'text-[#F5DEB3]', 
            border: 'border-[#F5DEB3]', 
            glow: 'shadow-[#F5DEB3]/20' 
        };
      default:
        return { 
            icon: 'fa-circle-info', 
            color: 'text-blue-400', 
            border: 'border-blue-500', 
            glow: 'shadow-blue-500/20' 
        };
    }
  };

  const style = notification ? getConfig(notification.type) : {};

  return (
    <div className="fixed top-24 right-0 left-0 md:left-auto md:right-6 z-[9999] flex justify-center md:justify-end px-4 pointer-events-none">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`
                pointer-events-auto
                relative overflow-hidden
                min-w-[300px] max-w-sm w-full
                bg-[#1c3026] text-white
                rounded-xl shadow-2xl ${style.glow}
                border-l-4 ${style.border}
                flex flex-col
            `}
          >
            {/* Content Container */}
            <div className="p-4 flex items-start gap-4">
              
              {/* Icon */}
              <div className={`mt-0.5 text-xl ${style.color}`}>
                <i className={`fa-solid ${style.icon}`}></i>
              </div>

              {/* Message */}
              <div className="flex-1 pt-0.5">
                <h4 className={`text-xs font-bold uppercase tracking-widest mb-1 ${style.color}`}>
                    {notification.type === 'error' ? 'Attention' : notification.type}
                </h4>
                <p className="text-sm font-medium text-gray-200 leading-relaxed">
                    {notification.message}
                </p>
              </div>

              {/* Close Button */}
              <button 
                onClick={clearNotification}
                className="text-gray-500 hover:text-white transition-colors p-1"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Progress Bar Animation */}
            <div className="h-1 w-full bg-black/20">
                <motion.div 
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 4, ease: "linear" }}
                    className={`h-full ${style.color.replace('text-', 'bg-')}`} 
                />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Notification;