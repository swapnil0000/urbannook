import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useRedux';
import { useGetUserProfileMutation, useUpdateUserProfileMutation } from '../../store/api/userApi';

const MyProfilePage = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [vibe, setVibe] = useState('minimal');
  const [getUserProfile, { isLoading: profileLoading }] = useGetUserProfileMutation();
  const [updateUserProfile, { isLoading: updating }] = useUpdateUserProfileMutation();
  
  const [formData, setFormData] = useState({
    userName: '',
    userEmail: '',
    userMobileNumber: '',
    userAddress: '',
    userPinCode: ''
  });

  const loadProfile = React.useCallback(async () => {
    try {
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userEmail = user?.email || localUser?.email;
      
      if (!userEmail) return;
      
      const result = await getUserProfile({ userEmail })?.unwrap();
      const profileData = result?.data;
      
      // Merge API data with existing localStorage data
      setFormData(prev => ({
        userName: profileData?.userName || prev.userName,
        userEmail: profileData?.userEmail || prev.userEmail,
        userMobileNumber: profileData?.userMobileNumber || prev.userMobileNumber,
        userAddress: profileData?.userAddress || prev.userAddress,
        userPinCode: profileData?.userPinCode || prev.userPinCode
      }));
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }, [getUserProfile, user]);

  useEffect(() => {
    // First, load data from localStorage immediately
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (localUser) {
      setFormData({
        userName: localUser.name || localUser.userName || '',
        userEmail: localUser.email || localUser.userEmail || '',
        userMobileNumber: localUser.mobile || localUser.userMobileNumber || '',
        userAddress: localUser.address || localUser.userAddress || '',
        userPinCode: localUser.pincode || localUser.userPinCode || ''
      });
    }
    
    // Then load from API if user email is available
    if (user?.email || localUser?.email) {
      loadProfile();
    }
  }, [user, loadProfile]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      await updateUserProfile({
        userName: formData.userName,
        userAddress: formData.userAddress,
        userPinCode: formData.userPinCode
      }).unwrap();
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile');
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-[#0a1a13] min-h-screen font-sans text-gray-300 selection:bg-emerald-500 selection:text-white pt-32 pb-20 md:pt-40 px-4 md:px-8 relative overflow-hidden">
      
      {/* --- BACKGROUND GLOW EFFECTS --- */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6 border-b border-white/10 pb-12">
           <div className="max-w-2xl">
              <span className="inline-block px-3 py-1 mb-6 text-[10px] font-bold tracking-[0.3em] text-emerald-400 uppercase bg-white/5 border border-white/10 rounded-full">
                Member Command Center
              </span>
              <h1 className="text-5xl md:text-7xl font-serif text-white leading-[0.9] tracking-tight">
                Your <span className="italic font-light text-emerald-500">Sanctuary.</span>
              </h1>
           </div>
           
           <button 
             onClick={() => isEditing ? handleSave() : setIsEditing(true)}
             disabled={updating}
             className={`px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all duration-300 shadow-lg active:scale-95 flex items-center gap-2 ${
               isEditing 
               ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
               : 'bg-white text-[#0a1a13] hover:bg-emerald-500 hover:text-white'
             } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
           >
             {updating ? (
               <><i className="fa-solid fa-spinner animate-spin"></i> Saving...</>
             ) : isEditing ? (
               <><i className="fa-solid fa-check"></i> Commit Changes</>
             ) : (
               <><i className="fa-solid fa-pen"></i> Refine Profile</>
             )}
           </button>
        </div>

        {/* --- BENTO GRID LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 1. IDENTITY CARD (4 Cols) */}
          <div className="lg:col-span-4 bg-white/5 rounded-[2.5rem] p-8 md:p-10 border border-white/10 flex flex-col items-center text-center relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
             
             {/* Profile Image / Initials */}
             <div className="relative mb-6 mt-4 group-hover:scale-105 transition-transform duration-500">
                <div className="w-32 h-32 rounded-full p-1 border border-white/20">
                    <div className="w-full h-full rounded-full bg-[#050f0b] flex items-center justify-center text-emerald-500 font-serif text-5xl italic overflow-hidden">
                        {profileLoading ? '...' : formData.userName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                </div>
                {/* Crown Badge */}
                <div className="absolute bottom-0 right-0 bg-[#0a1a13] p-1.5 rounded-full border border-white/10">
                   <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                        <i className="fa-solid fa-crown text-[10px]"></i>
                   </div>
                </div>
             </div>

             <h2 className="text-2xl font-serif text-white mb-1">{formData.userName || 'Loading...'}</h2>
             <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-8">Platinum Resident</p>

             {/* Stats / XP */}
             <div className="w-full bg-[#0a1a13] rounded-2xl p-6 border border-white/10">
                <div className="flex justify-between items-end mb-2">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Nook Points</span>
                   <span className="text-xl font-serif text-white">2,450</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                   <div className="w-[70%] h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                </div>
                <p className="text-[9px] text-gray-500 mt-3 text-left">50 points to next tier.</p>
             </div>
          </div>

          {/* 2. DETAILS & PREFERENCES (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
             
             {/* Personal Info Grid */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: 'Full Name', name: 'userName', value: formData.userName, type: 'text', icon: 'fa-user' },
                  { label: 'Email Address', name: 'userEmail', value: formData.userEmail, type: 'email', icon: 'fa-envelope', disabled: true },
                  { label: 'Mobile Number', name: 'userMobileNumber', value: formData.userMobileNumber, type: 'tel', icon: 'fa-phone', disabled: true },
                  { label: 'Shipping Address', name: 'userAddress', value: formData.userAddress, type: 'textarea', icon: 'fa-location-dot' },
                  { label: 'Pin Code', name: 'userPinCode', value: formData.userPinCode, type: 'text', icon: 'fa-map-pin' },
                ].map((field, idx) => (
                  <div key={idx} className={`bg-white/5 rounded-[2rem] p-6 border border-white/10 hover:bg-white/10 transition-colors ${field.name === 'userAddress' ? 'md:col-span-2' : ''}`}>
                     <div className="flex items-center gap-3 mb-4">
                        <i className={`fa-solid ${field.icon} text-emerald-500 text-sm`}></i>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{field.label}</label>
                     </div>
                     
                     {(isEditing && !field.disabled) ? (
                        field.type === 'textarea' ? (
                          <textarea
                            name={field.name}
                            value={field.value}
                            onChange={handleInputChange}
                            className="w-full p-3 bg-[#0a1a13] border border-white/20 rounded-xl focus:border-emerald-500 outline-none transition-all text-sm font-medium text-white resize-none placeholder-white/20"
                            rows="2"
                          />
                        ) : (
                          <input
                            type={field.type}
                            name={field.name}
                            value={field.value}
                            onChange={handleInputChange}
                            className="w-full p-3 bg-[#0a1a13] border border-white/20 rounded-xl focus:border-emerald-500 outline-none transition-all text-sm font-medium text-white placeholder-white/20"
                          />
                        )
                     ) : (
                        <p className={`font-serif text-lg text-white ${field.name === 'email' ? 'truncate' : ''}`}>
                            {field.value}
                        </p>
                     )}
                  </div>
                ))}
             </div>

             {/* Atmospheric Preference (Vibe Selector) */}
             <div className="bg-gradient-to-r from-emerald-900/40 to-white/5 rounded-[2.5rem] p-8 md:p-10 border border-white/10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
                 
                 <div className="relative z-10">
                     <h3 className="text-2xl font-serif text-white mb-2">Space Vibe</h3>
                     <p className="text-gray-400 text-xs font-medium max-w-xs">
                         Customize your mood. We curate recommendations based on this setting.
                     </p>
                 </div>
                 
                 <div className="relative z-10 flex gap-2 bg-[#0a1a13]/50 p-2 rounded-2xl backdrop-blur-md border border-white/10">
                     {['Minimal', 'Boho', 'Luxe'].map((mood) => (
                         <button
                             key={mood}
                             onClick={() => setVibe(mood.toLowerCase())}
                             className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                                 vibe === mood.toLowerCase() 
                                 ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                                 : 'text-gray-500 hover:text-white hover:bg-white/5'
                             }`}
                         >
                             {mood}
                         </button>
                     ))}
                 </div>
             </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default MyProfilePage;