import React from 'react';

const PlaceholderImage = ({ className = "",  }) => {
  return (
    <div className={ `flex items-center justify-center ${className}`}>
      <svg 
        className="w-12 h-12 text-gray-400" 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
       
      </svg>
    </div>
  );
};

export default PlaceholderImage;