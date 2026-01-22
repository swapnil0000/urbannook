import React, { useState, useRef } from 'react';
import OTPVerification from './OTPVerification';
import { useOtpSentMutation, useRegisterMutation } from '../../../store/api/authApi';
import { useUI } from '../../../hooks/useRedux';

const SignupForm = ({ onClose, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: '', 
    email: '', 
    mobile: '', 
    password: '', 
    confirmPassword: ''
  });
  const [showOTP, setShowOTP] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const scrollContainerRef = useRef(null);

  const [register, { isLoading: isRegistering }] = useRegisterMutation();
  const [otpSent, { isLoading: isSendingOtp }] = useOtpSentMutation();
  const { showNotification } = useUI();

  const handleAutoScroll = (e) => {
    // Only scroll on mobile to avoid jarring movements on desktop
    if (window.innerWidth < 768) {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let cleanValue = value;

    if (name === 'mobile') cleanValue = value.replace(/\D/g, '');
    if (name === 'mobile' && cleanValue.length > 0) {
      if (!/^[6-9]/.test(cleanValue)) {
        setErrors(prev => ({ ...prev, mobile: 'Mobile number must start with 6-9' }));
        return; 
      }
    }

    setFormData({ ...formData, [name]: cleanValue });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';

    if (!formData.mobile) newErrors.mobile = 'Mobile number is required';
    else if (formData.mobile.length !== 10) newErrors.mobile = 'Must be exactly 10 digits';

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!formData.password) newErrors.password = 'Password is required';
    else if (!strongPasswordRegex.test(formData.password)) newErrors.password = '8+ chars, Upper, Lower, Number & Symbol';

    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        mobileNumber: formData.mobile,
      }).unwrap();

      if (result.userAccessToken) {
        document.cookie = `userAccessToken=${result.userAccessToken}; path=/; max-age=2592000`;
        // Also store in localStorage for backup
        localStorage.setItem('token', result.userAccessToken);
      }

      const userData = {
        name: result.user?.userName || formData.name,
        email: result.user?.userEmail || formData.email,
        mobile: result.user?.userMobileNumber || formData.mobile
      };
      localStorage.setItem('user', JSON.stringify(userData));

      try {
        const response = await otpSent({ email: userData.email }).unwrap();
        if (response.success) {
          showNotification('OTP sent to your email!');
          setShowOTP(true);
        }
      } catch (otpError) {
        showNotification('Account created, but OTP failed. Please login.',otpError);
        onSwitchToLogin();
      }

    } catch (error) {
      showNotification(error.data?.message || 'Registration failed.');
      setErrors({ submit: error.data?.message || 'Registration failed' });
    }
  };

  if (showOTP) {
    return (
      <OTPVerification
        mobile={formData.mobile}
        email={formData.email}
        onClose={onClose}
        onBack={() => setShowOTP(false)}
        onSuccess={() => { showNotification('Account verified!'); onClose(); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={onClose}>
      
      {/* CHANGED: w-[96%] to make it wider on mobile.
      */}
      <div 
        className="bg-white rounded-[2rem] w-[96%] md:w-full md:max-w-4xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-300 max-h-[90vh] md:h-[650px]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* --- LEFT SIDE (Hidden on Mobile) --- */}
        <div className="hidden md:flex w-5/12 bg-slate-900 p-10 flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
                        <i className="fa-solid fa-leaf text-lg"></i>
                    </div>
                    <span className="text-white font-serif text-xl">UrbanNook</span>
                </div>
                
                <h2 className="text-3xl font-serif text-white mb-6 leading-tight">
                    Design your <br/>
                    <span className="italic text-emerald-500">dream space.</span>
                </h2>

                <ul className="space-y-5">
                    {[
                        { icon: 'fa-truck-fast', text: 'Free Shipping on first order' },
                        { icon: 'fa-shield-heart', text: 'Secure checkout guaranteed' },
                        { icon: 'fa-star', text: 'Access exclusive collections' },
                    ].map((item, idx) => (
                        <li key={idx} className="flex items-center gap-4 text-slate-300 text-sm">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                <i className={`fa-solid ${item.icon} text-emerald-400 text-xs`}></i>
                            </div>
                            {item.text}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="relative z-10">
                <p className="text-xs text-slate-500 leading-relaxed">
                    By creating an account, you agree to our <span className="text-slate-300 underline cursor-pointer">Terms</span> and <span className="text-slate-300 underline cursor-pointer">Privacy Policy</span>.
                </p>
            </div>
        </div>

        {/* --- RIGHT SIDE (Scrollable Form Area) --- */}
        <div ref={scrollContainerRef} className="w-full md:w-7/12 overflow-y-auto px-6 py-8 md:px-12 md:py-10 relative bg-white">
          <button className="absolute top-4 right-4 md:top-6 md:right-6 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors z-20" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>

          <div className="max-w-md mx-auto h-full flex flex-col justify-center">
            <div className="mb-2.5 md:mb-5 text-center md:text-left mt-2 md:mt-0">
              <h2 className="text-2xl md:text-3xl font-serif text-slate-900 mb-1">Create Account</h2>
              <p className="text-slate-500 text-xs md:text-sm">Join us for a curated shopping experience.</p>
            </div>

            <form className="space-y-3 md:space-y-4" onSubmit={handleSubmit}>
              
              {/* Name & Email */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Full Name</label>
                  <input
                    type="text" name="name" value={formData.name} onChange={handleInputChange} onFocus={handleAutoScroll}
                    className={`w-full p-2.5 md:p-4  border rounded-2xl text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all ${errors.name ? 'border-red-400' : 'border-slate-200'}`}
                    placeholder="John Doe"
                  />
                  {errors.name && <p className="text-[10px] text-red-500 ml-2 font-bold">{errors.name}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email Address</label>
                  <input
                    type="email" name="email" value={formData.email} onChange={handleInputChange} onFocus={handleAutoScroll}
                    className={`w-full p-2.5 md:p-4 bg-slate-50 border rounded-2xl text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all ${errors.email ? 'border-red-400' : 'border-slate-200'}`}
                    placeholder="john@example.com"
                  />
                  {errors.email && <p className="text-[10px] text-red-500 ml-2 font-bold">{errors.email}</p>}
                </div>
              </div>

              {/* Mobile */}
              <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Mobile Number</label>
                  <input
                    type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} onFocus={handleAutoScroll} maxLength="10"
                    className={`w-full p-2.5 md:p-4 bg-slate-50 border rounded-2xl text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all ${errors.mobile ? 'border-red-400' : 'border-slate-200'}`}
                    placeholder="9876543210"
                  />
                  {errors.mobile && <p className="text-[10px] text-red-500 ml-2 font-bold">{errors.mobile}</p>}
              </div>

              {/* Passwords Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} onFocus={handleAutoScroll}
                       placeholder='••••••••'
                      className={`w-full p-2.5 md:p-4 bg-slate-50 border rounded-2xl text-sm pr-10 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all ${errors.password ? 'border-red-400' : 'border-slate-200'}`}
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 p-1">
                      <i className={`fa-solid ${showPwd ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Confirm</label>
                  <div className="relative">
                    <input
                      type={showConfirmPwd ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} onFocus={handleAutoScroll}
                      placeholder='••••••••'
                      className={`w-full p-2.5 md:p-4 bg-slate-50 border rounded-2xl text-sm pr-10 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all ${errors.confirmPassword ? 'border-red-400' : 'border-slate-200'}`}
                    />
                    <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 p-1">
                      <i className={`fa-solid ${showConfirmPwd ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                    </button>
                  </div>
                </div>
              </div>
              
              {(errors.password || errors.confirmPassword) && (
                 <p className="text-[10px] text-red-500 font-bold text-center mt-1">
                    {errors.password || errors.confirmPassword}
                 </p>
              )}

              <button
                type="submit" disabled={isRegistering || isSendingOtp}
                className="w-full py-3 md:py-4 bg-emerald-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-lg active:scale-[0.98] mt-4 md:mt-6 disabled:opacity-50"
              >
                {isRegistering || isSendingOtp ? 'Processing...' : 'Sign Up'}
              </button>

              {/* CHANGED: Combined onto one line with ml-1 */}
              <div className="text-xs text-slate-500 mt-4 md:mt-6 pb-2">
                Already have an account?{' '}
                <span onClick={onSwitchToLogin} className="text-emerald-700 font-bold cursor-pointer underline ">
                    Login
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;