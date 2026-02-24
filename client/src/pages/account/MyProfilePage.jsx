import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, useUI } from '../../hooks/useRedux';
import { useGetUserProfileQuery, useUpdateUserProfileMutation } from '../../store/api/userApi';

const MyProfilePage = () => {
  const { user } = useAuth();
  const { showNotification } = useUI();
  const [isEditing, setIsEditing] = useState(false);

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

  // Load Profile Logic (Kept Original)
  const loadProfile = useCallback(async () => {
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
        userMobileNumber: profileData?.userMobileNumber || prev.userMobileNumber,
        userAddress: profileData?.userAddress || prev.userAddress,
        userPinCode: profileData?.userPinCode || prev.userPinCode
      }));
    } else if (!profileLoading && (user?.email || JSON.parse(localStorage.getItem('user') || '{}')?.email)) {
      loadProfile();
    }
  }, [user, loadProfile, userProfileData, profileLoading]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Validation for pin code - only allow 6 digits
    if (name === 'userPinCode') {
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 6) {
        setFormData({ ...formData, [name]: numericValue });
      }
      return;
    }
    
    setFormData({ ...formData, [name]: value });  };

  const handleSave = async () => {
  try {
    // Filter out empty strings and whitespace-only values
    const updateData = Object.entries(formData).reduce((acc, [key, value]) => {
      if (value && value.trim() !== '') {
        acc[key] = value;
      }
      return acc;
    }, {});

    await updateUserProfile(updateData).unwrap();
    showNotification('Profile updated successfully', 'success');
    setIsEditing(false);
    refetchProfile();
  } catch (error) {
    showNotification(error?.data?.message || 'Failed to update profile', 'error');
  }
};


  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const profileFields = [
    { label: 'Full Name', name: 'userName', value: formData.userName, type: 'text', icon: 'fa-user' },
    { label: 'Email Address', name: 'userEmail', value: formData.userEmail, type: 'email', icon: 'fa-envelope', disabled: true },
    { label: 'Mobile Number', name: 'userMobileNumber', value: formData.userMobileNumber, type: 'tel', icon: 'fa-phone', disabled: true },
    { label: 'Pin Code', name: 'userPinCode', value: formData.userPinCode, type: 'text', icon: 'fa-map-pin' },
    // { label: 'Shipping Address', name: 'userAddress', value: formData.userAddress, type: 'textarea', icon: 'fa-location-dot', fullWidth: true }
  ];

  return (
    <div className="bg-[#2e443c] min-h-screen font-sans text-gray-200 selection:bg-[#a89068] selection:text-white">

      {/* --- AMBIENT BACKGROUND --- */}
      <div className="fixed top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#1a2822] to-[#2e443c] pointer-events-none opacity-60"></div>
      <div className="fixed -bottom-40 -left-40 w-[600px] h-[600px] bg-[#a89068] rounded-full blur-[200px] opacity-[0.05] pointer-events-none"></div>

      <main className="max-w-5xl mx-auto pt-28 pb-20 px-4 md:px-8 relative z-10">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#a89068]/20 pb-8 lg:pb-12">
           <div>
             <div className="flex items-center gap-3 mb-2">
                 <span className="h-[1px] w-8 bg-[#F5DEB3]"></span>
                 <span className="text-[#F5DEB3] font-bold tracking-[0.2em] uppercase text-[10px]">Profile</span>
             </div>
             <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white leading-tight">
               Your <span className="italic text-[#F5DEB3] ">Sanctuary.</span>
             </h1>
           </div>
           
           <button 
             onClick={() => isEditing ? handleSave() : setIsEditing(true)}
             disabled={updating}
             className={`px-6 md:px-8 py-2.5 md:py-3 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all duration-300 shadow-lg active:scale-95 flex items-center justify-center gap-2 w-full md:w-auto ${
               isEditing 
                 ? 'bg-[#a89068] text-white hover:bg-[#2e443c]' 
                 : 'bg-white/5 border border-white/10 text-white hover:bg-[#a89068] hover:text-white hover:border-[#a89068]'
             } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
           >
             {updating ? (
               <>
                 <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> 
                 Saving...
               </>
             ) : isEditing ? (
               <>
                 <i className="fa-solid fa-check"></i> Save Changes
               </>
             ) : (
               <>
                 <i className="fa-solid fa-pen"></i> Edit Profile
               </>
             )}
           </button>
        </div>

        {/* --- PROFILE LAYOUT --- */}
        <div className="grid grid-cols-1 gap-6">
          
          {/* Personal Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {profileFields.map((field, idx) => (
              <div 
                key={idx} 
                className={`bg-[#f5f7f8] rounded-[24px] p-5 md:p-6 border border-transparent shadow-md hover:shadow-lg transition-all duration-300 group ${
                  field.fullWidth ? 'md:col-span-2' : ''
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#a89068]/10 flex items-center justify-center text-[#a89068] group-hover:bg-[#a89068] group-hover:text-white transition-all">
                    <i className={`fa-solid ${field.icon} text-[12px]`}></i>
                  </div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#a89068]">
                    {field.label}
                  </label>
                </div>
                
                <AnimatePresence mode="wait">
                  {(isEditing && !field.disabled) ? (
                    field.type === 'textarea' ? (
                      <motion.textarea
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        name={field.name}
                        value={field.value}
                        onChange={handleInputChange}
                        className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:border-[#a89068] outline-none transition-all text-sm font-medium text-[#2e443c] resize-none placeholder-gray-400 shadow-inner"
                        rows="3"
                      />
                    ) : (
                      <motion.input
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        type={field.type}
                        name={field.name}
                        value={field.value}
                        onChange={handleInputChange}
                        className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:border-[#a89068] outline-none transition-all text-sm font-medium text-[#2e443c] placeholder-gray-400 shadow-inner"
                      />
                    )
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      className="min-h-[2.5rem] flex items-center"
                    >
                      <p className={`font-serif text-base md:text-lg text-[#2e443c] ${field.name === 'userEmail' ? 'truncate' : ''}`}>
                        {field.value || <span className="text-gray-400 text-sm italic">Not set</span>}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyProfilePage;