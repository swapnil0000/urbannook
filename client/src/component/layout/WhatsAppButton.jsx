import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { socialLinks } from '../../data/constant';

const SocialMediaFAB = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Only show on home page
  if (location.pathname !== '/') {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse items-end gap-4 pointer-events-none">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-500 relative pointer-events-auto ${
            isOpen ? 'bg-slate-900 rotate-45' : 'bg-emerald-600 hover:scale-110'
        }`}
      >
        <i className="fa-solid fa-plus text-1xl"></i>
        
        {!isOpen && (
            <span className="absolute -inset-1 rounded-full bg-emerald-500/50 animate-ping pointer-events-none"></span>
        )}
      </button>

      <div className="flex flex-col-reverse items-end gap-3 pb-2">
        {socialLinks.map((social, index) => (
          <a
            key={social.id}
            href={social.link}
            target="_blank"
            rel="noopener noreferrer"
            // pointer-events-auto ensures these links are clickable when visible
            className={`group flex items-center gap-3 transition-all duration-300 transform origin-bottom pointer-events-auto ${
              isOpen 
                ? 'opacity-100 translate-y-0 scale-100' 
                : 'opacity-0 translate-y-10 scale-0 pointer-events-none'
            }`}
            style={{ 
                // Staggered animation delay based on index
                transitionDelay: isOpen ? `${index * 50}ms` : '0ms' 
            }}
          >
            
            {/* Tooltip Label (Appears on Left) */}
            <span className="bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 whitespace-nowrap hidden md:block border border-slate-100">
              {social.name}
            </span>

            {/* Icon Circle */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform ${social.color}`}>
              <i className={`${social.icon} text-lg`}></i>
            </div>

          </a>
        ))}
      </div>

    </div>
  );
};

export default SocialMediaFAB;