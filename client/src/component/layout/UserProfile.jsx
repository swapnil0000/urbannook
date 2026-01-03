import React, { useState, useEffect, useRef } from 'react';

const UserProfile = ({ user, onLogout, onClose }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const menuItems = [
    { icon: 'fa-user', label: 'My Profile', action: () => console.log('Profile') },
    { icon: 'fa-shopping-bag', label: 'My Orders', action: () => console.log('Orders') },
    { icon: 'fa-heart', label: 'Wishlist', action: () => console.log('Wishlist') },
    { icon: 'fa-headset', label: 'Customer Support', action: () => console.log('Support') },
    { icon: 'fa-gift', label: 'Rewards', action: () => console.log('Rewards') },
    { icon: 'fa-cog', label: 'Settings', action: () => console.log('Settings') },
  ];

  const handleLogout = () => {
    localStorage.removeItem('user');
    onLogout();
    onClose();
  };

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes popIn {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        .animate-pop { animation: popIn 0.3s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
      `}</style>

      {/* MOBILE BACKDROP (Mweb only) */}
      <div className="lg:hidden fixed inset-0   z-[90]" onClick={onClose} />

      {/* MENU CONTAINER: Dropdown (Desktop) / Bottom Sheet (Mobile) */}
      <div 
        ref={dropdownRef} 
        className="fixed bottom-0 left-0 right-0 lg:absolute lg:bottom-auto lg:top-full lg:right-0 lg:left-auto lg:mt-4 
                   w-full lg:w-72 bg-white rounded-t-[2.5rem] lg:rounded-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] 
                   lg:shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-t lg:border border-slate-100 z-[100] 
                   animate-slide-up lg:animate-in lg:fade-in lg:slide-in-from-top-2 overflow-hidden"
      >
        {/* Drag Handle (Mweb only) */}
        <div className="lg:hidden w-12 h-1 bg-slate-200 rounded-full mx-auto mt-4 mb-2" />

        {/* User Info Header */}
        <div className="p-6 md:p-8 lg:p-6 bg-gradient-to-br from-emerald-50 to-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 lg:w-12 lg:h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-serif text-xl md:text-2xl lg:text-xl shadow-lg ring-4 ring-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base md:text-lg lg:text-base leading-none mb-1">{user.name}</h3>
              <p className="text-[10px] md:text-xs lg:text-[10px] font-bold text-emerald-700 uppercase tracking-widest">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Menu Items: Optimized Hit Areas */}
        <div className="p-4 md:p-6 lg:p-3 max-h-[60vh] lg:max-h-none overflow-y-auto">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              className="w-full flex items-center gap-4 px-4 py-4 lg:py-3 text-left hover:bg-slate-50 transition-all rounded-2xl group active:bg-slate-100"
            >
              <div className="w-10 h-10 md:w-11 md:h-11 lg:w-9 lg:h-9 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                <i className={`fa-solid ${item.icon} text-slate-500 text-xs md:text-sm lg:text-xs group-hover:text-emerald-700`}></i>
              </div>
              <span className="text-slate-700 font-bold text-sm md:text-base lg:text-sm tracking-tight">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Logout Section */}
        <div className="border-t border-slate-100 p-4 md:p-6 lg:p-3 mb-4 lg:mb-0">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-4 px-4 py-4 lg:py-3 text-left hover:bg-red-50 transition-all rounded-2xl group active:bg-red-100/50"
          >
            <div className="w-10 h-10 lg:w-9 lg:h-9 bg-red-100/50 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-arrow-right-from-bracket text-red-600 text-xs md:text-sm lg:text-xs"></i>
            </div>
            <span className="text-red-600 font-bold text-sm md:text-base lg:text-sm tracking-tight">Logout Account</span>
          </button>
        </div>
      </div>

      {/* RESPONSIVE LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div 
          className="h-[100vh] fixed inset-0 flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div 
            className="bg-white rounded-[3rem] p-8 md:p-14 lg:p-12 w-full max-w-[440px] shadow-2xl relative animate-pop" 
            onClick={(e) => e.stopPropagation()}
            style={{ transform: 'translate(0, 0)' }}
          >
            <div className="flex  flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-8 ring-8 ring-red-50/50">
                <i className="fa-solid fa-door-open text-red-600 text-3xl"></i>
              </div>

              <h3 className=" text-3xl md:text-4xl font-serif text-slate-900 mb-3 tracking-tight">
                Leaving so <span className="italic font-light text-red-600">Soon?</span>
              </h3>
              <p className="text-slate-500 text-sm md:text-base leading-relaxed mb-10 max-w-[300px]">
                Are you sure you want to end your session? We'll miss your presence at Urban Nook.
              </p>

              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-red-600 transition-all shadow-xl active:scale-95"
                >
                  Confirm Logout
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full py-5 bg-transparent text-slate-400 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:text-slate-900 transition-all"
                >
                  Stay with us
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserProfile;