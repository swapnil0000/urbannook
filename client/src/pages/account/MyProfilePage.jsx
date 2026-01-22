import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // Added animations
import { useAuth } from '../../hooks/useRedux';
import { useGetUserProfileQuery, useUpdateUserProfileMutation } from '../../store/api/userApi';
import Footer from '../../component/layout/Footer';
import NewHeader from '../../component/layout/NewHeader';

const MyProfilePage = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [vibe, setVibe] = useState('minimal');
  
  const { data: userProfileData, isLoading: profileLoading, refetch: refetchProfile } = useGetUserProfileQuery();
  const [updateUserProfile, { isLoading: updating }] = useUpdateUserProfileMutation();
  
  const [formData, setFormData] = useState(() => {
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    return {
      userName: localUser.name || localUser.userName || '',
      userEmail: localUser.email || localUser.userEmail || '',
      userMobileNumber: localUser.mobile || localUser.userMobileNumber || '',
      userAddress: localUser.address || localUser.userAddress || '',
      userPinCode: localUser.pincode || localUser.userPinCode || ''
    };
  });

  const loadProfile = React.useCallback(async () => {
    try {
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userEmail = user?.email || localUser?.email;
      if (!userEmail) return;
      const result = await refetchProfile();
      const profileData = result.data?.data || result.data;
      
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
  }, [refetchProfile, user]);

  useEffect(() => {
    if (userProfileData?.data) {
      const profileData = userProfileData.data;
      setFormData(prev => ({
        userName: profileData?.userName || prev.userName,
        userEmail: profileData?.userEmail || prev.userEmail,
        userMobileNumber: profileData?.mobileNumber || prev.mobileNumber,
        userAddress: profileData?.userAddress || prev.userAddress,
        userPinCode: profileData?.userPinCode || prev.userPinCode
      }));
    } else if (!profileLoading && (user?.email || JSON.parse(localStorage.getItem('user') || '{}')?.email)) {
      loadProfile();
    }
  }, [user, loadProfile, userProfileData, profileLoading]);

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
      // Optional: Add toast notification here
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile');
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-[#1c3026] min-h-screen font-sans text-[#e8e6e1] selection:bg-[#F5DEB3] selection:text-[#1c3026]">
      <NewHeader />

      {/* --- AMBIENT BACKGROUND --- */}
      <div className="fixed top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#2a4538] to-[#1c3026] pointer-events-none opacity-60"></div>
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#F5DEB3] rounded-full blur-[200px] opacity-[0.03] pointer-events-none"></div>

      <main className="max-w-7xl mx-auto pt-32 pb-20 px-4 lg:px-8 relative z-10">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6 border-b border-white/5 pb-8 lg:pb-12">
           <div className="max-w-2xl text-center md:text-left w-full md:w-auto">
              <span className="inline-block px-3 py-1 mb-6 text-[10px] font-bold tracking-[0.3em] text-[#F5DEB3] uppercase bg-[#F5DEB3]/5 border border-[#F5DEB3]/20 rounded-full">
                Member Command Center
              </span>
              <h1 className="text-4xl md:text-7xl font-serif text-white leading-[0.9] tracking-tight">
                Your <span className="italic font-light text-[#F5DEB3]">Sanctuary.</span>
              </h1>
           </div>
           
           <button 
             onClick={() => isEditing ? handleSave() : setIsEditing(true)}
             disabled={updating}
             className={`px-8 py-3 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all duration-300 shadow-lg active:scale-95 flex items-center justify-center gap-2 w-full md:w-auto ${
               isEditing 
               ? 'bg-[#F5DEB3] text-[#1c3026] hover:bg-white' 
               : 'bg-white/5 border border-white/10 text-white hover:bg-[#F5DEB3] hover:text-[#1c3026] hover:border-[#F5DEB3]'
             } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
           >
             {updating ? (
               <><div className="w-3 h-3 border-2 border-[#1c3026] border-t-transparent rounded-full animate-spin"></div> Saving...</>
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
          <div className="lg:col-span-4 bg-[#e8e6e1]/5 backdrop-blur-md rounded-[2.5rem] p-8 md:p-10 border border-white/5 flex flex-col items-center text-center relative overflow-hidden group hover:border-[#F5DEB3]/30 transition-colors">
             
             {/* Profile Image / Initials */}
             <div className="relative mb-6 mt-4 group-hover:scale-105 transition-transform duration-500">
                <div className="w-32 h-32 rounded-full p-1 border border-white/10 bg-[#1c3026]">
                    <div className="w-full h-full rounded-full bg-[#111f18] flex items-center justify-center text-[#F5DEB3] font-serif text-5xl italic overflow-hidden shadow-inner">
                        {profileLoading ? '...' : formData.userName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                </div>
                {/* Crown Badge */}
                <div className="absolute bottom-0 right-0 bg-[#1c3026] p-1.5 rounded-full border border-white/10">
                   <div className="w-8 h-8 bg-[#F5DEB3] rounded-full flex items-center justify-center text-[#1c3026] shadow-lg">
                        <i className="fa-solid fa-crown text-[10px]"></i>
                   </div>
                </div>
             </div>

             <h2 className="text-2xl font-serif text-white mb-1">{formData.userName || 'Guest User'}</h2>
             <p className="text-[10px] font-bold text-[#F5DEB3] uppercase tracking-widest mb-8 bg-[#F5DEB3]/10 px-3 py-1 rounded-full">Platinum Resident</p>

             {/* Stats / XP */}
             <div className="w-full bg-black/20 rounded-2xl p-6 border border-white/5">
                <div className="flex justify-between items-end mb-2">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Nook Points</span>
                   <span className="text-xl font-serif text-white">2,450</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                   <div className="w-[70%] h-full bg-[#F5DEB3] rounded-full shadow-[0_0_10px_rgba(245,222,179,0.5)]"></div>
                </div>
                <p className="text-[9px] text-gray-500 mt-3 text-left">50 points to next tier.</p>
             </div>
          </div>

          {/* 2. DETAILS & PREFERENCES (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
             
             {/* Personal Info Grid */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                {[
                  { label: 'Full Name', name: 'userName', value: formData.userName, type: 'text', icon: 'fa-user' },
                  { label: 'Email Address', name: 'userEmail', value: formData.userEmail, type: 'email', icon: 'fa-envelope', disabled: true },
                  { label: 'Mobile Number', name: 'userMobileNumber', value: formData.userMobileNumber, type: 'tel', icon: 'fa-phone', disabled: true },
                  { label: 'Pin Code', name: 'userPinCode', value: formData.userPinCode, type: 'text', icon: 'fa-map-pin' },
                  { label: 'Shipping Address', name: 'userAddress', value: formData.userAddress, type: 'textarea', icon: 'fa-location-dot', fullWidth: true },
                ].map((field, idx) => (
                  <div key={idx} className={`bg-[#e8e6e1]/5 backdrop-blur-md rounded-[2rem] p-6 border border-white/5 hover:bg-white/10 transition-colors ${field.fullWidth ? 'md:col-span-2' : ''}`}>
                     <div className="flex items-center gap-3 mb-3">
                        <div className="w-6 h-6 rounded-full bg-[#F5DEB3]/10 flex items-center justify-center text-[#F5DEB3]">
                            <i className={`fa-solid ${field.icon} text-[10px]`}></i>
                        </div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{field.label}</label>
                     </div>
                     
                     <AnimatePresence mode="wait">
                     {(isEditing && !field.disabled) ? (
                        field.type === 'textarea' ? (
                          <motion.textarea
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            name={field.name}
                            value={field.value}
                            onChange={handleInputChange}
                            className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:border-[#F5DEB3] outline-none transition-all text-sm font-medium text-white resize-none placeholder-white/20"
                            rows="2"
                          />
                        ) : (
                          <motion.input
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            type={field.type}
                            name={field.name}
                            value={field.value}
                            onChange={handleInputChange}
                            className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:border-[#F5DEB3] outline-none transition-all text-sm font-medium text-white placeholder-white/20"
                          />
                        )
                     ) : (
                        <motion.p 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className={`font-serif text-lg text-[#e8e6e1] ${field.name === 'userEmail' ? 'truncate' : ''}`}
                        >
                            {field.value || <span className="text-white/20 text-sm italic">Not set</span>}
                        </motion.p>
                     )}
                     </AnimatePresence>
                  </div>
                ))}
             </div>

             {/* Atmospheric Preference (Vibe Selector) */}
             <div className="bg-gradient-to-r from-[#111f18] to-[#1c3026] rounded-[2.5rem] p-8 md:p-10 border border-white/10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
                 
                 {/* Decorative Glow */}
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5DEB3]/10 rounded-full blur-2xl"></div>

                 <div className="relative z-10 text-center md:text-left">
                     <h3 className="text-2xl font-serif text-white mb-2">Space Vibe</h3>
                     <p className="text-gray-400 text-xs font-medium max-w-xs mx-auto md:mx-0">
                         Customize your mood. We curate recommendations based on this setting.
                     </p>
                 </div>
                 
                 <div className="relative z-10 flex gap-2 bg-black/20 p-1.5 rounded-2xl backdrop-blur-md border border-white/5">
                     {['Minimal', 'Boho', 'Luxe'].map((mood) => (
                         <button
                             key={mood}
                             onClick={() => setVibe(mood.toLowerCase())}
                             className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                                 vibe === mood.toLowerCase() 
                                 ? 'bg-[#F5DEB3] text-[#1c3026] shadow-lg' 
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

      </main>
      
      <Footer />
    </div>
  );
};

export default MyProfilePage;