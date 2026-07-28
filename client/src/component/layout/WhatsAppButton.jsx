import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { socialLinks } from '../../data/constant';

const SocialMediaFAB = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Only show on home page
  if (location.pathname !== '/') return null;

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[9998] flex items-center pointer-events-none">
      {/* Social icons — slide out from the right edge when opened */}
      <div
        className={`flex flex-col justify-center gap-2 p-2 bg-ink/95 backdrop-blur border-y border-l border-white/10 shadow-2xl transition-all duration-500 ease-out ${
          isOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-full opacity-0'
        }`}
      >
        {socialLinks.map((social) => (
          <a
            key={social.id}
            href={social.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.name}
            className={`group relative w-10 h-10 rounded-full grid place-items-center text-white shadow-md border border-white/20 hover:scale-110 active:scale-95 transition-transform ${social.color}`}
          >
            <i className={`${social.icon} text-base`} />
            {/* hover label (desktop) */}
            <span className="absolute right-full mr-2 gl-lbl text-[9px] bg-ink text-paper px-2 py-1 whitespace-nowrap opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 hidden md:block">
              {social.name}
            </span>
          </a>
        ))}
      </div>

      {/* Right-edge trigger tab — icon only */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? 'Close menu' : 'Chat & follow us'}
        aria-expanded={isOpen}
        className="pointer-events-auto bg-brand hover:bg-brandHi text-white w-11 h-12 grid place-items-center shadow-lg border-l-2 border-white/30 transition-colors"
      >
        <i className={`fa-solid ${isOpen ? 'fa-xmark' : 'fa-share-nodes'} text-lg transition-transform duration-300`} />
      </button>
    </div>
  );
};

export default SocialMediaFAB;
