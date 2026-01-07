import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth, useUI } from '../../hooks/useRedux';
import { useLogoutMutation } from '../../store/api/authApi';

const UserProfile = ({ user, onLogout, onClose }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef(null);
  const { logout } = useAuth();
  const { showNotification } = useUI();
  const [logoutApi, { isLoading: isLoggingOut }] = useLogoutMutation();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside the dropdown AND not inside the logout modal
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (!document.getElementById('logout-modal')?.contains(event.target)) {
            onClose();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const menuItems = [
    { icon: 'fa-user', label: 'My Profile', desc: 'Manage your account', action: () => window.location.href = '/my-profile' },
    { icon: 'fa-box-open', label: 'My Orders', desc: 'Track & History', action: () => window.location.href = '/my-orders' },
    { icon: 'fa-heart', label: 'Wishlist', desc: 'Saved Items', action: () => window.location.href = '/wishlist' },
    { icon: 'fa-life-ring', label: 'Support', desc: 'Get Help', action: () => window.location.href = '/customer-support' },
  ];

  const handleLogout = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await logoutApi().unwrap();
      showNotification('Logged out successfully!');
    } catch (error) {
      console.warn('Logout API failed, forcing local logout.');
      showNotification('Logged out successfully!');
    } finally {
      document.cookie = 'userAccessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      logout();
      localStorage.removeItem('user');
      onLogout();
      onClose();
    }
  };

  // 1. USE PORTAL: Renders component outside of the Header div to fix positioning
  return createPortal(
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-sheet { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-modal { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* --- BACKDROP --- */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99998] lg:bg-transparent lg:backdrop-blur-none transition-all"
        onClick={onClose}
      />

      {/* --- MAIN MENU CONTAINER --- */}
      <div 
        ref={dropdownRef} 
        className={`
            fixed z-[99999] bg-white overflow-hidden
            
            /* Mobile Styles (Bottom Sheet) */
            bottom-0 left-0 right-0 
            rounded-t-[2.5rem] 
            shadow-[0_-10px_60px_-10px_rgba(0,0,0,0.2)]
            animate-sheet

            /* Desktop Styles (Floating Dropdown) */
            lg:bottom-auto lg:left-auto 
            lg:top-20 lg:right-10 
            lg:w-[360px] 
            lg:rounded-[2rem] 
            lg:shadow-2xl
            lg:animate-none 
            lg:origin-top-right
        `}
      >
        {/* Mobile Drag Handle */}
        <div className="lg:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2" />

        {/* Header Section */}
        <div className="p-6 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
            <div className="flex items-center gap-5">
                <div className="relative">
                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-serif text-xl shadow-lg rotate-3">
                        {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div>
                    <h3 className="font-serif text-xl text-slate-900 leading-none mb-1.5">{user.name}</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{user.email}</p>
                </div>
            </div>
        </div>

        {/* Menu Items Grid */}
        <div className="p-4 grid gap-2 max-h-[50vh] overflow-y-auto lg:max-h-none">
            {menuItems.map((item, index) => (
                <button
                    key={index}
                    onClick={item.action}
                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all group active:scale-[0.98]"
                >
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm group-hover:border-emerald-500/30 group-hover:text-emerald-600 transition-colors">
                        <i className={`fa-solid ${item.icon} text-sm`}></i>
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-bold text-slate-700 group-hover:text-slate-900">{item.label}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{item.desc}</p>
                    </div>
                    <i className="fa-solid fa-chevron-right ml-auto text-[10px] text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all"></i>
                </button>
            ))}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-red-600 hover:bg-red-50 font-bold text-xs uppercase tracking-widest transition-all"
            >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
                Sign Out
            </button>
        </div>
      </div>

      {/* --- LOGOUT CONFIRMATION MODAL --- */}
      {showLogoutConfirm && (
        <div 
          id="logout-modal"
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()} 
        >
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl animate-modal relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-red-50 to-transparent -z-10"></div>

            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-red-50">
                <i className="fa-solid fa-power-off text-red-500 text-3xl"></i>
            </div>

            <h3 className="text-3xl font-serif text-slate-900 mb-3">Sign Out?</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed px-4">
                You'll need to log back in to access your wishlist and orders.
            </p>

            <div className="space-y-3">
                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-[0.98]"
                >
                    {isLoggingOut ? 'Signing out...' : 'Confirm Logout'}
                </button>
                <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="w-full py-4 bg-white text-slate-500 rounded-2xl font-bold uppercase tracking-widest text-xs border border-slate-100 hover:bg-slate-50 transition-all"
                >
                    Cancel
                </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body // 2. RENDER IN BODY TO FIX CSS TRANSFORM BUG
  );
};

export default UserProfile;