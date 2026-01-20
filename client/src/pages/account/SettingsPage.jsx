import React, { useEffect, useState } from 'react';

// --- HELPER: Custom Glowing Toggle ---
const ToggleSwitch = ({ checked, onChange }) => (
  <label className="relative inline-flex items-center cursor-pointer shrink-0 group">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="sr-only peer"
    />
    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:rounded-full after:h-5 after:w-5 after:transition-all after:duration-300 peer-checked:bg-emerald-500 peer-checked:after:bg-white peer-checked:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all"></div>
  </label>
);

const SettingsPage = () => {

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      sms: false,
      push: true,
      orderUpdates: true,
      promotions: false,
      newsletter: true
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

  const [activeTab, setActiveTab] = useState('notifications');
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (section, key) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: !prev[section][key]
      }
    }));
  };

  const handleSelect = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const saveSettings = () => {
    setIsSaving(true);
    setTimeout(() => {
        console.log('Saving settings:', settings);
        setIsSaving(false);
    }, 1000);
  };

  // Navigation Config
  const navItems = [
    { id: 'notifications', label: 'Notifications', icon: 'fa-bell', desc: 'Alerts & Messages' },
    { id: 'privacy', label: 'Privacy', icon: 'fa-shield-halved', desc: 'Security & Data' },
    { id: 'preferences', label: 'Preferences', icon: 'fa-sliders', desc: 'App Settings' },
  ];

  return (
    <div className="bg-[#0a1a13] min-h-screen font-sans text-gray-300 selection:bg-emerald-500 selection:text-white pt-32 pb-20 md:pt-40 px-4 md:px-8 relative overflow-hidden">
      
      {/* --- BACKGROUND GLOW --- */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">

        {/* --- PAGE HEADER --- */}
        <div className="mb-12 border-b border-white/10 pb-8">
            <span className="inline-block px-3 py-1 mb-6 text-[10px] font-bold tracking-[0.3em] text-emerald-400 uppercase bg-white/5 border border-white/10 rounded-full">
                System Controls
            </span>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-white leading-[0.95]">
                Settings & <span className="italic font-light text-emerald-500">Preferences.</span>
            </h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
            
            {/* --- SIDEBAR NAVIGATION --- */}
            <aside className="lg:w-1/4 shrink-0">
                <nav className="flex lg:flex-col gap-3 overflow-x-auto pb-4 lg:pb-0 no-scrollbar">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 text-left whitespace-nowrap min-w-[200px] lg:min-w-0 border ${
                                activeTab === item.id 
                                ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.4)]' 
                                : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors ${
                                activeTab === item.id ? 'bg-white/20 text-white' : 'bg-[#0a1a13] text-emerald-500'
                            }`}>
                                <i className={`fa-solid ${item.icon}`}></i>
                            </div>
                            <div>
                                <span className={`block text-sm ${activeTab === item.id ? 'font-bold' : 'font-medium'}`}>
                                    {item.label}
                                </span>
                                <span className={`text-[10px] uppercase tracking-wider block ${activeTab === item.id ? 'text-emerald-100' : 'text-gray-600'}`}>
                                    {item.desc}
                                </span>
                            </div>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* --- MAIN CONTENT CARD --- */}
            <main className="flex-1">
                <div className="bg-white/5 rounded-[2.5rem] border border-white/10 overflow-hidden min-h-[500px] relative backdrop-blur-md">
                    
                    {/* Inner Content */}
                    <div className="p-6 md:p-10 relative z-10">
                        
                        {/* 1. NOTIFICATIONS CONTENT */}
                        {activeTab === 'notifications' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                                <div className="border-b border-white/10 pb-6">
                                    <h2 className="text-2xl font-serif text-white">Notifications</h2>
                                    <p className="text-gray-500 text-sm mt-1">Control how and when we contact you.</p>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { id: 'email', label: 'Email Notifications', desc: 'Get updates on your orders and account.', key: 'email' },
                                        { id: 'sms', label: 'SMS Notifications', desc: 'Receive shipping updates via text.', key: 'sms' },
                                        { id: 'promo', label: 'Marketing Emails', desc: 'Be the first to know about sales.', key: 'promotions' },
                                    ].map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group">
                                            <div>
                                                <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{item.label}</h3>
                                                <p className="text-xs md:text-sm text-gray-500">{item.desc}</p>
                                            </div>
                                            <ToggleSwitch 
                                                checked={settings.notifications[item.key]} 
                                                onChange={() => handleToggle('notifications', item.key)} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. PRIVACY CONTENT */}
                        {activeTab === 'privacy' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                                <div className="border-b border-white/10 pb-6">
                                    <h2 className="text-2xl font-serif text-white">Privacy & Security</h2>
                                    <p className="text-gray-500 text-sm mt-1">Manage your data visibility.</p>
                                </div>

                                <div className="space-y-8">
                                    {/* Dropdown Section */}
                                    <div className="bg-[#0a1a13]/50 p-6 rounded-3xl border border-white/10">
                                        <label className="block text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-3">Profile Visibility</label>
                                        <div className="relative group">
                                            <select
                                                value={settings.privacy.profileVisibility}
                                                onChange={(e) => handleSelect('privacy', 'profileVisibility', e.target.value)}
                                                className="w-full appearance-none bg-[#0a1a13] p-4 pr-10 border border-white/20 rounded-xl focus:border-emerald-500 outline-none font-medium text-white transition-all cursor-pointer hover:border-white/40"
                                            >
                                                <option value="public">Public (Everyone)</option>
                                                <option value="friends">Friends Only</option>
                                                <option value="private">Private (Only Me)</option>
                                            </select>
                                            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-xs group-hover:text-emerald-500 transition-colors"></i>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors">
                                            <div>
                                                <h3 className="font-bold text-white">Data Usage</h3>
                                                <p className="text-xs md:text-sm text-gray-500">Allow us to use data for personalization.</p>
                                            </div>
                                            <ToggleSwitch 
                                                checked={settings.privacy.analytics} 
                                                onChange={() => handleToggle('privacy', 'analytics')} 
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors">
                                            <div>
                                                <h3 className="font-bold text-white">Share with Partners</h3>
                                                <p className="text-xs md:text-sm text-gray-500">Allow sharing data with trusted partners.</p>
                                            </div>
                                            <ToggleSwitch 
                                                checked={settings.privacy.dataSharing} 
                                                onChange={() => handleToggle('privacy', 'dataSharing')} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. PREFERENCES CONTENT */}
                        {activeTab === 'preferences' && (
                             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                                <div className="border-b border-white/10 pb-6">
                                    <h2 className="text-2xl font-serif text-white">App Preferences</h2>
                                    <p className="text-gray-500 text-sm mt-1">Customize your experience.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[
                                        { label: 'Language', key: 'language', options: [{v:'en', t:'English'}, {v:'hi', t:'Hindi'}] },
                                        { label: 'Currency', key: 'currency', options: [{v:'INR', t:'INR (₹)'}, {v:'USD', t:'USD ($)'}] },
                                        { label: 'Theme', key: 'theme', options: [{v:'light', t:'Light'}, {v:'dark', t:'Dark'}] },
                                    ].map((field) => (
                                        <div key={field.key} className="group">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1 group-focus-within:text-emerald-500 transition-colors">{field.label}</label>
                                            <div className="relative">
                                                <select
                                                    value={settings.preferences[field.key]}
                                                    onChange={(e) => handleSelect('preferences', field.key, e.target.value)}
                                                    className="w-full appearance-none bg-[#0a1a13] p-4 pr-10 border border-white/10 rounded-xl focus:border-emerald-500 outline-none font-medium text-white transition-all cursor-pointer hover:border-white/30"
                                                >
                                                    {field.options.map(o => (
                                                        <option key={o.v} value={o.v}>{o.t}</option>
                                                    ))}
                                                </select>
                                                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-xs group-hover:text-emerald-500 transition-colors"></i>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        )}
                    </div>

                    {/* --- FOOTER (SAVE BUTTON) --- */}
                    <div className="bg-[#0a1a13]/40 p-6 border-t border-white/10 flex justify-between md:justify-end items-center gap-4">
                        <span className="text-xs text-gray-600 italic hidden sm:block">
                            <i className="fa-regular fa-clock mr-1"></i> Auto-saved draft
                        </span>
                        <button
                            onClick={saveSettings}
                            disabled={isSaving}
                            className="w-full md:w-auto px-8 py-3 bg-white text-[#0a1a13] rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-500 hover:text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</>
                            ) : (
                                <>Save Changes <i className="fa-solid fa-check ml-1"></i></>
                            )}
                        </button>
                    </div>

                </div>
            </main>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;