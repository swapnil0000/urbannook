import React, { useEffect, useState } from 'react';


// --- ANIMATED TOGGLE COMPONENT ---
const AnimatedToggle = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    className={`relative w-12 h-7 rounded-full p-1 transition-colors duration-300 focus:outline-none flex items-center ${
      checked ? 'bg-[#F5DEB3]' : 'bg-white/10'
    }`}
  >
    <div
      className={`w-5 h-5 rounded-full shadow-md transition-transform duration-300 ${
        checked ? 'bg-[#1c3026] translate-x-5' : 'bg-gray-400 translate-x-0'
      }`}
    />
  </button>
);

const SettingsPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [activeTab, setActiveTab] = useState('notifications');
  const [isSaving, setIsSaving] = useState(false);

  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      sms: false,
      push: true,
      promotions: false,
    },
    privacy: {
      profileVisibility: 'private',
      dataSharing: false,
      analytics: true
    },
    preferences: {
      language: 'en',
      currency: 'INR',
      theme: 'dark'
    }
  });

  const handleToggle = (section, key) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: !prev[section][key] }
    }));
  };

  const handleSelect = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value }
    }));
  };

  const saveSettings = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1500);
  };

  // Nav Configuration
  const tabs = [
    { id: 'notifications', label: 'Alerts', icon: 'fa-bell' },
    { id: 'privacy', label: 'Privacy', icon: 'fa-shield-halved' },
    { id: 'preferences', label: 'General', icon: 'fa-sliders' },
  ];

  return (
    <div className="bg-[#2e443c] min-h-screen font-sans text-[#e8e6e1] selection:bg-[#F5DEB3] selection:text-[#1c3026] relative overflow-hidden">

      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#2a4538] to-[#1c3026] pointer-events-none opacity-60"></div>
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#F5DEB3] rounded-full blur-[180px] opacity-[0.05] pointer-events-none"></div>

      <main className="pt-28 pb-20 px-4 lg:px-12 relative z-10 max-w-6xl mx-auto">
        
        {/* --- HEADER --- */}
        <div className="mb-8 lg:mb-12 text-center lg:text-left">
            <h1 className="text-4xl md:text-6xl font-serif text-white mb-2">
                Settings
            </h1>
            <p className="text-[#F5DEB3]/60 text-sm md:text-base font-light tracking-wide">
                Manage your app experience and preferences.
            </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
            
            {/* --- NAVIGATION (Sticky on Mobile) --- */}
            <div className="lg:w-64 flex-shrink-0 sticky top-24 z-30">
                <div className="bg-[#111f18]/80 backdrop-blur-xl border border-white/5 p-1.5 rounded-2xl flex lg:flex-col overflow-x-auto no-scrollbar shadow-xl lg:shadow-none">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex items-center gap-3 px-5 py-3 rounded-xl transition-all whitespace-nowrap lg:w-full group ${
                                activeTab === tab.id ? 'text-[#1c3026]' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {/* Active Background Pill */}
                            {activeTab === tab.id && (
                                <div className="absolute inset-0 bg-[#F5DEB3] rounded-xl shadow-lg" />
                            )}
                            
                            {/* Content */}
                            <span className="relative z-10 flex items-center justify-center w-6 text-center">
                                <i className={`fa-solid ${tab.icon} text-sm`}></i>
                            </span>
                            <span className="relative z-10 text-sm font-bold uppercase tracking-widest">
                                {tab.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* --- CONTENT AREA --- */}
            <div className="flex-1 min-h-[500px]">
                <div className="space-y-6">
                        {/* 1. NOTIFICATIONS */}
                        {activeTab === 'notifications' && (
                            <div className="bg-[#e8e6e1]/5 backdrop-blur-md border border-white/5 rounded-[2rem] p-6 md:p-8">
                                <h2 className="text-2xl font-serif text-white mb-6 flex items-center gap-3">
                                    <i className="fa-regular fa-bell text-[#F5DEB3] text-lg"></i> Notifications
                                </h2>
                                <div className="space-y-1">
                                    {[
                                        { key: 'email', label: 'Email Alerts', desc: 'Order confirmations & shipping updates' },
                                        { key: 'sms', label: 'SMS Messages', desc: 'Real-time delivery status on your phone' },
                                        { key: 'push', label: 'Push Notifications', desc: 'App alerts for offers and cart updates' },
                                        { key: 'promotions', label: 'Marketing', desc: 'New arrivals and exclusive discounts' },
                                    ].map((item, i) => (
                                        <div key={item.key} className={`flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors ${i !== 3 ? 'border-b border-white/5' : ''}`}>
                                            <div>
                                                <h3 className="text-white font-medium text-sm">{item.label}</h3>
                                                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                                            </div>
                                            <AnimatedToggle 
                                                checked={settings.notifications[item.key]} 
                                                onChange={() => handleToggle('notifications', item.key)} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. PRIVACY */}
                        {activeTab === 'privacy' && (
                            <div className="bg-[#e8e6e1]/5 backdrop-blur-md border border-white/5 rounded-[2rem] p-6 md:p-8 space-y-8">
                                <div>
                                    <h2 className="text-2xl font-serif text-white mb-6 flex items-center gap-3">
                                        <i className="fa-solid fa-lock text-[#F5DEB3] text-lg"></i> Privacy
                                    </h2>
                                    
                                    {/* Select Input Style */}
                                    <div className="group mb-6">
                                        <label className="block text-[10px] font-bold text-[#F5DEB3]/70 uppercase tracking-widest mb-3 ml-1">Profile Visibility</label>
                                        <div className="relative">
                                            <select
                                                value={settings.privacy.profileVisibility}
                                                onChange={(e) => handleSelect('privacy', 'profileVisibility', e.target.value)}
                                                className="w-full appearance-none bg-black/20 p-4 pr-10 border border-white/10 rounded-xl focus:border-[#F5DEB3] outline-none font-medium text-white transition-all cursor-pointer"
                                            >
                                                <option value="public" className="bg-[#1c3026]">Public (Visible to everyone)</option>
                                                <option value="friends" className="bg-[#1c3026]">Friends Only</option>
                                                <option value="private" className="bg-[#1c3026]">Private (Only Me)</option>
                                            </select>
                                            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-xs group-hover:text-[#F5DEB3] transition-colors"></i>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                                            <div>
                                                <h3 className="text-white font-medium text-sm">Analytics</h3>
                                                <p className="text-xs text-gray-500 mt-0.5">Share usage data to help us improve</p>
                                            </div>
                                            <AnimatedToggle 
                                                checked={settings.privacy.analytics} 
                                                onChange={() => handleToggle('privacy', 'analytics')} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. PREFERENCES */}
                        {activeTab === 'preferences' && (
                            <div className="bg-[#e8e6e1]/5 backdrop-blur-md border border-white/5 rounded-[2rem] p-6 md:p-8">
                                <h2 className="text-2xl font-serif text-white mb-6 flex items-center gap-3">
                                    <i className="fa-solid fa-sliders text-[#F5DEB3] text-lg"></i> General
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[
                                        { label: 'Display Language', key: 'language', options: [{v:'en', t:'English (UK)'}, {v:'hi', t:'Hindi'}] },
                                        { label: 'Currency', key: 'currency', options: [{v:'INR', t:'Indian Rupee (₹)'}, {v:'USD', t:'US Dollar ($)'}] },
                                        { label: 'Color Theme', key: 'theme', options: [{v:'dark', t:'Midnight Green'}, {v:'light', t:'Light (Coming Soon)'}] },
                                    ].map((field) => (
                                        <div key={field.key} className="group">
                                            <label className="block text-[10px] font-bold text-[#F5DEB3]/70 uppercase tracking-widest mb-2 ml-1 transition-colors">{field.label}</label>
                                            <div className="relative">
                                                <select
                                                    value={settings.preferences[field.key]}
                                                    onChange={(e) => handleSelect('preferences', field.key, e.target.value)}
                                                    className="w-full appearance-none bg-black/20 p-4 pr-10 border border-white/10 rounded-xl focus:border-[#F5DEB3] outline-none font-medium text-white transition-all cursor-pointer hover:bg-black/30"
                                                >
                                                    {field.options.map(o => (
                                                        <option key={o.v} value={o.v} className="bg-[#1c3026]">{o.t}</option>
                                                    ))}
                                                </select>
                                                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-xs group-hover:text-[#F5DEB3] transition-colors"></i>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                {/* --- SAVE BAR --- */}
                <div className="mt-8 flex justify-end">
                    <button
                        onClick={saveSettings}
                        disabled={isSaving}
                        className="w-full md:w-auto px-10 py-4 bg-[#F5DEB3] text-[#1c3026] rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-70 disabled:scale-100"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-[#1c3026] border-t-transparent rounded-full animate-spin"></div>
                                Saving Changes...
                            </>
                        ) : (
                            <>Save Preferences <i className="fa-solid fa-check"></i></>
                        )}
                    </button>
                </div>
            </div>

        </div>
      </main>

    </div>
  );
};

export default SettingsPage;