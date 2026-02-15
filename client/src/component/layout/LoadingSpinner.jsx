import React, { useEffect, useState } from 'react';

// --- 1. The "Liquid" Spinner (For buttons & small areas) ---
// Why it's better: Uses SVG stroke-dasharray for a smooth, "Apple-like" rotation 
// instead of a jagged CSS border.
const LoadingSpinner = ({ size = 'default', color = 'dark', className = '' }) => {
  const sizes = {
    small: { w: 16, h: 16, stroke: 2 },
    default: { w: 40, h: 40, stroke: 3 }, // 40px = h-10
    large: { w: 64, h: 64, stroke: 4 }
  };

  const colors = {
    dark: 'text-[#0a1a13]',
    light: 'text-white',
    emerald: 'text-emerald-500'
  };

  const { w, h, stroke } = sizes[size] || sizes.default;
  const strokeColor = colors[color] || colors.dark;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        className={`animate-spin ${strokeColor}`}
        width={w}
        height={h}
        viewBox="0 0 50 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className="opacity-20"
          cx="25"
          cy="25"
          r="20"
          stroke="currentColor"
          strokeWidth={stroke}
        />
        <path
          className="opacity-100"
          d="M25 5C13.9543 5 5 13.9543 5 25"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

// --- 2. The Branded Page Loader (Full Screen) ---
// Why it's better: It reinforces the brand. The progress bar gives visual feedback, 
// and the quote makes the wait feel shorter (Psychology of waiting).
export const PageLoader = () => {
  const [progress, setProgress] = useState(0);

  // Fake progress bar animation for visual delight
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((old) => {
        if (old === 100) return 100;
        const diff = Math.random() * 10;
        return Math.min(old + diff, 100);
      });
    }, 200);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#F5F5F0] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-100/50 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-50/50 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Pulsing Logo Container */}
        <div className="mb-8 relative">
           <div className="absolute inset-0 bg-emerald-200 rounded-full blur-xl opacity-20 animate-pulse"></div>
           <img 
             src="/assets/logo.webp" 
             alt="Loading..." 
             className="h-16 w-auto relative z-10 animate-[bounce_2s_infinite]" 
           />
        </div>

        {/* Elegant Progress Bar */}
        <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-[#0a1a13] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Changing Text / Quote */}
        <div className="h-6 overflow-hidden text-center">
           <p className="text-sm font-medium text-gray-500 tracking-widest uppercase animate-pulse">
             Curating Essentials...
           </p>
        </div>
      </div>
    </div>
  );
};

// --- 3. The Skeleton Loader (For Components) ---
// Why it's better: Instead of a spinner in the middle of a blank box, 
// a "Skeleton" mimics the content layout (shimmer effect). This makes the app feel faster.
export const ComponentLoader = ({ type = 'card' }) => {
  if (type === 'card') {
    return (
      <div className="w-full h-full min-h-[300px] bg-white rounded-3xl p-4 shadow-sm animate-pulse">
        <div className="w-full h-48 bg-gray-200 rounded-2xl mb-4"></div>
        <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // Default centered spinner for smaller components
  return (
    <div className="w-full h-full min-h-[200px] flex items-center justify-center bg-gray-50/50 rounded-2xl">
      <LoadingSpinner size="default" color="emerald" />
    </div>
  );
};

export default LoadingSpinner;