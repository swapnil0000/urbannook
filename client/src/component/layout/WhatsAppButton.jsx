import React, { useState } from 'react';

const SocialMediaFAB = () => {
  const [isOpen, setIsOpen] = useState(false);

  const socialLinks = [
    {
      id: 'whatsapp',
      name: 'Chat on WhatsApp',
      icon: 'fa-brands fa-whatsapp',
      color: 'bg-[#25D366]',
      link: 'https://wa.me/+916386455982?text=Hi! I am interested in Urban Nook products.',
    },
    {
      id: 'instagram',
      name: 'Follow on Instagram',
      icon: 'fa-brands fa-instagram',
      color: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]', 
      link: 'https://instagram.com/urbannook.store',
    },
    {
      id: 'email',
      name: 'Email Support',
      icon: 'fa-solid fa-envelope',
      color: 'bg-blue-600',
      link: 'mailto:support@urbannook.in',
    },
    {
      id: 'call',
      name: 'Call Concierge',
      icon: 'fa-solid fa-phone',
      color: 'bg-emerald-700',
      link: 'tel:+916386455982',
    }
  ];

  return (
    <div className="fixed bottom-6  pb-20 right-6 z-[9999] flex flex-col-reverse items-end gap-4 pointer-events-none">
      
      {/* --- MAIN TOGGLE BUTTON --- */}
      {/* pointer-events-auto ensures this specific button is clickable */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-500 relative pointer-events-auto ${
            isOpen ? 'bg-slate-900 rotate-45' : 'bg-emerald-600 hover:scale-110'
        }`}
      >
        <i className="fa-solid fa-plus text-1xl"></i>
        
        {/* Pulse Effect (Only when closed) */}
        {!isOpen && (
            <span className="absolute -inset-1 rounded-full bg-emerald-500/50 animate-ping pointer-events-none"></span>
        )}
      </button>

      {/* --- EXPANDABLE MENU ITEMS --- */}
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