import React, { useState, useRef } from 'react';
import { useOtpSentMutation, useRegisterMutation } from '../../store/api/authApi';
import { useUI } from '../../hooks/useRedux';
import OTPVerification from './OTPVerification';

const SignupForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: '', email: '', mobile: '', password: '', confirmPassword: '', address: '', pinCode: ''
  });
  const [showOTP, setShowOTP] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Password visibility states
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const scrollContainerRef = useRef(null);

  // API Hooks
  const [register, { isLoading: isRegistering }] = useRegisterMutation();
  const [otpSent, { isLoading: isSendingOtp }] = useOtpSentMutation();
  
  const { showNotification } = useUI();

  // Auto-scroll focused element into view
  const handleAutoScroll = (e) => {
    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let cleanValue = value;

    // 1. Force Numeric only for Mobile and PinCode
    if (name === 'mobile' || name === 'pinCode') {
      cleanValue = value.replace(/\D/g, '');
    }

    // 2. Strict Mobile Logic: Must start with 6, 7, 8, or 9
    if (name === 'mobile' && cleanValue.length > 0) {
      if (!/^[6-9]/.test(cleanValue)) {
        setErrors(prev => ({ ...prev, mobile: 'Mobile number must start with 6-9' }));
        return; // Prevent typing if invalid first digit
      }
    }

    setFormData({ ...formData, [name]: cleanValue });
    
    // Clear error when user types
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Name & Email
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email address is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';

    // Mobile: 10 digits and starts with 6-9
    if (!formData.mobile) {
      newErrors.mobile = 'Mobile number is required';
    } else if (formData.mobile.length !== 10) {
      newErrors.mobile = 'Must be exactly 10 digits';
    }

    // Strong Password Validation
    // Min 8 chars, 1 Uppercase, 1 Lowercase, 1 Number, 1 Special Char
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!strongPasswordRegex.test(formData.password)) {
      newErrors.password = 'Use 8+ chars with Uppercase, Lowercase, Number & Symbol';
    }

    // Confirm Password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Address & Pin
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.pinCode.trim()) newErrors.pinCode = 'Pin code is required';
    else if (formData.pinCode.length !== 6) newErrors.pinCode = 'Must be 6 digits';

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Optional: scroll to the first error field
      return;
    }

    try {
      // Step 1: Register User
      const result = await register({
        userName: formData.name,
        userEmail: formData.email,
        userPassword: formData.password,
        userAddress: formData.address,
        userPinCode: formData.pinCode,
        userMobileNumber: formData.mobile,
      }).unwrap();

      // Step 2: Save metadata to Cookies & LocalStorage
      if (result.userAccessToken) {
        document.cookie = `userAccessToken=${result.userAccessToken}; path=/; max-age=2592000`;
      }

      const userData = {
        name: result.user?.userName || formData.name,
        email: result.user?.userEmail || formData.email,
        mobile: result.user?.userMobileNumber || formData.mobile
      };
      localStorage.setItem('user', JSON.stringify(userData));

      // Step 3: Trigger OTP to Email
      try {
        const response = await otpSent({ userEmail: userData.email }).unwrap();
        if (response.success) {
          showNotification('OTP sent to your email!');
          setShowOTP(true);
        }
      } catch (otpError) {
        showNotification('Account created, but failed to send OTP. Please try Resend.',otpError);
        setShowOTP(true);
      }

    } catch (error) {
      showNotification(error.data?.message || 'Registration failed.');
      setErrors({ submit: error.data?.message || 'Registration failed' });
    }
  };

  // Final success handler passed to OTP component
  const handleVerifySuccess = () => {
    showNotification('Account verified successfully!');
    onClose();
  };

  if (showOTP) {
    return (
      <OTPVerification
        mobile={formData.mobile}
        email={formData.email}
        onClose={onClose}
        onBack={() => setShowOTP(false)}
        onSuccess={handleVerifySuccess}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-2 md:p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-[2rem] md:rounded-3xl w-full max-w-6xl shadow-2xl relative max-h-[92vh] md:max-h-[95vh] overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Branding - Hidden on Mobile */}
        <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-emerald-600 to-emerald-800 p-12 flex-col justify-center items-center text-white relative">
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-leaf text-2xl"></i>
            </div>
            <h1 className="text-3xl font-serif mb-4">UrbanNook</h1>
            <p className="text-emerald-100 text-sm">Join our community for sustainable living.</p>
          </div>
        </div>

        {/* Form Section */}
        <div ref={scrollContainerRef} className="w-full lg:w-7/12 overflow-y-auto px-6 py-8 md:p-12">
          <button className="absolute top-6 right-6 text-slate-400 hover:text-slate-900" onClick={onClose}>
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>

          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-serif text-slate-900 mb-1">Create Account</h2>
              <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Safe & Secure Registration</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Full Name</label>
                  <input
                    type="text" name="name" value={formData.name} onChange={handleInputChange} onFocus={handleAutoScroll}
                    className={`w-full p-4 bg-slate-50 border rounded-2xl text-sm focus:border-emerald-500 outline-none ${errors.name ? 'border-red-400' : 'border-slate-200'}`}
                    placeholder="Enter full name"
                  />
                  {errors.name && <p className="text-[10px] text-red-500 ml-2">{errors.name}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Email</label>
                  <input
                    type="email" name="email" value={formData.email} onChange={handleInputChange} onFocus={handleAutoScroll}
                    className={`w-full p-4 bg-slate-50 border rounded-2xl text-sm focus:border-emerald-500 outline-none ${errors.email ? 'border-red-400' : 'border-slate-200'}`}
                    placeholder="email@example.com"
                  />
                  {errors.email && <p className="text-[10px] text-red-500 ml-2">{errors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Mobile</label>
                  <input
                    type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} onFocus={handleAutoScroll} maxLength="10"
                    className={`w-full p-4 bg-slate-50 border rounded-2xl text-sm focus:border-emerald-500 outline-none ${errors.mobile ? 'border-red-400' : 'border-slate-200'}`}
                    placeholder="Starts with 6-9"
                  />
                  {errors.mobile && <p className="text-[10px] text-red-500 ml-2">{errors.mobile}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Pin Code</label>
                  <input
                    type="text" name="pinCode" value={formData.pinCode} onChange={handleInputChange} onFocus={handleAutoScroll} maxLength="6"
                    className={`w-full p-4 bg-slate-50 border rounded-2xl text-sm focus:border-emerald-500 outline-none ${errors.pinCode ? 'border-red-400' : 'border-slate-200'}`}
                    placeholder="6-digit code"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Full Address</label>
                <input
                  type="text" name="address" value={formData.address} onChange={handleInputChange} onFocus={handleAutoScroll}
                  className={`w-full p-4 bg-slate-50 border rounded-2xl text-sm focus:border-emerald-500 outline-none ${errors.address ? 'border-red-400' : 'border-slate-200'}`}
                  placeholder="Street name, Area, Landmark"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                       name="password" 
                       value={formData.password} 
                       onChange={handleInputChange}
                       placeholder='**********'
                      className={`w-full p-4 bg-slate-50 border rounded-2xl text-sm pr-12 outline-none ${errors.password ? 'border-red-400' : 'border-slate-200'}`}
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600">
                      <i className={`fa-solid ${showPwd ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                    </button>
                  </div>
                  {errors.password && <p className="text-[10px] text-red-500 leading-tight ml-2">{errors.password}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPwd ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange}
                      placeholder='**********'
                      className={`w-full p-4 bg-slate-50 border rounded-2xl text-sm pr-12 outline-none ${errors.confirmPassword ? 'border-red-400' : 'border-slate-200'}`}
                    />
                    <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600">
                      <i className={`fa-solid ${showConfirmPwd ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-[10px] text-red-500 ml-2">{errors.confirmPassword}</p>}
                </div>
              </div>

              <button
                type="submit" disabled={isRegistering || isSendingOtp}
                className="w-full h-12 bg-emerald-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-xl disabled:opacity-50 mt-4"
              >
                {isRegistering || isSendingOtp ? 'Please wait...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;