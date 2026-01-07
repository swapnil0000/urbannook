import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useRedux';

const MyProfilePage = () => {
  
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [vibe, setVibe] = useState('minimal'); // New Feature: Site Mood
  const [formData, setFormData] = useState({
    name: user?.name || 'Alexander Nook',
    email: user?.email || 'alex@urbannook.in',
    phone: user?.phone || '+91 98765 43210',
    address: user?.address || 'Sector 44, Gurgaon, India'
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    // API logic here
    setIsEditing(false);
  };

    useEffect(() => {
        window.scrollTo(0, 0);
      }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] pt-32 pb-20 px-6 font-sans relative overflow-hidden">
      
      {/* FIXED STUDIO BACKGROUND EFFECT */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] bg-[radial-gradient(circle,rgba(16,185,129,0.05)_0%,rgba(255,255,255,0)_70%)] blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] bg-[radial-gradient(circle,rgba(59,130,246,0.03)_0%,rgba(255,255,255,0)_70%)] blur-[100px]"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
           <div className="max-w-xl">
              <span className="inline-block px-3 py-1 mb-4 text-[10px] font-black tracking-[0.3em] text-emerald-800 uppercase bg-emerald-50 rounded-full border border-emerald-100">
                Member Command Center
              </span>
              <h1 className="text-5xl md:text-7xl font-serif text-slate-900 leading-[0.9]">
                Your <span className="italic font-light text-emerald-700">Sanctuary.</span>
              </h1>
           </div>
           <button 
             onClick={() => isEditing ? handleSave() : setIsEditing(true)}
             className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all shadow-xl active:scale-95"
           >
             {isEditing ? 'Commit Changes' : 'Refine Profile'}
           </button>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
          
          {/* PROFILE CARD (4 Cols) */}
          <div className="md:col-span-4 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] flex flex-col items-center text-center">
             <div className="relative mb-8 group cursor-pointer">
                <div className="w-32 h-32 rounded-full bg-slate-900 flex items-center justify-center text-white font-serif text-4xl shadow-2xl relative z-10 border-4 border-white transition-transform group-hover:scale-105">
                   {formData?.name?.charAt(0)}
                </div>
                {/* Loyalty Tier Ring */}
                <div className="absolute inset-[-8px] rounded-full border-2 border-dashed border-emerald-500/30 animate-spin-slow"></div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                   <i className="fa-solid fa-crown text-[10px]"></i>
                </div>
             </div>
             <h2 className="text-2xl font-serif text-slate-900 mb-1">{formData.name}</h2>
             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-6">Platinum Resident</p>
             <div className="w-full pt-6 border-t border-slate-50 space-y-4">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                   <span>Loyalty Points</span>
                   <span className="text-slate-900">2,450 XP</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                   <div className="w-[70%] h-full bg-emerald-500 rounded-full"></div>
                </div>
             </div>
          </div>

          {/* MAIN INFORMATION (8 Cols) */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
             
             {/* Bento Tiles for Info */}
             {[
               { label: 'Legal Name', name: 'name', value: formData.name, type: 'text', icon: 'fa-user' },
               { label: 'Digital Mail', name: 'email', value: formData.email, type: 'email', icon: 'fa-envelope' },
               { label: 'Mobile Protocol', name: 'phone', value: formData.phone, type: 'tel', icon: 'fa-phone' },
               { label: 'Primary Residence', name: 'address', value: formData.address, type: 'textarea', icon: 'fa-location-dot' },
             ].map((field, idx) => (
               <div key={idx} className={`bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm ${field.name === 'address' ? 'sm:col-span-2' : ''}`}>
                  <div className="flex items-center gap-3 mb-4">
                     <i className={`fa-solid ${field.icon} text-emerald-500 text-xs`}></i>
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{field.label}</label>
                  </div>
                  {isEditing ? (
                    field.type === 'textarea' ? (
                      <textarea
                        name={field.name}
                        value={field.value}
                        onChange={handleInputChange}
                        className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:border-emerald-500 outline-none transition-all text-sm font-medium"
                        rows="3"
                      />
                    ) : (
                      <input
                        type={field.type}
                        name={field.name}
                        value={field.value}
                        onChange={handleInputChange}
                        className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:border-emerald-500 outline-none transition-all text-sm font-medium"
                      />
                    )
                  ) : (
                    <p className="text-lg font-medium text-slate-900">{field.value}</p>
                  )}
               </div>
             ))}

             {/* NEW FEATURE: ATMOSPHERIC PREFERENCE */}
             <div className="sm:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 lg:p-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                   <h3 className="text-white font-serif text-xl mb-1 tracking-tight">Atmospheric Preference</h3>
                   <p className="text-slate-400 text-xs font-medium">Customize how Urban Nook responds to your presence.</p>
                </div>
                <div className="flex gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
                   {['minimal', 'serene', 'vibrant'].map((option) => (
                     <button 
                       key={option}
                       onClick={() => setVibe(option)}
                       className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                       ${vibe === option ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
                     >
                       {option}
                     </button>
                   ))}
                </div>
             </div>

          </div>

        </div>

        {/* RECENT ACQUISITIONS (Similar to a Mini Order History) */}
        <div className="mt-8 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-serif text-slate-900">Recent Acquisitions</h3>
              <button className="text-[10px] font-black uppercase tracking-widest text-emerald-700 border-b border-emerald-700 pb-1">Archive</button>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[1, 2].map((item) => (
                <div key={item} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-white">
                   <div className="w-16 h-16 bg-slate-200 rounded-xl overflow-hidden shrink-0">
                      <img src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200" className="w-full h-full object-cover" alt="product" />
                   </div>
                   <div>
                      <p className="font-bold text-slate-900 text-sm">Aire Series G{item}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Delivered Jan 2026</p>
                   </div>
                </div>
              ))}
              <div className="flex items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-2xl">
                 <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">New Order available</p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default MyProfilePage;