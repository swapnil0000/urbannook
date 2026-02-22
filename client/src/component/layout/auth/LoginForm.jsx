import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ForgotPassword from './ForgotPassword';
import OTPVerification from './OTPVerification';
import { useLoginMutation } from '../../../store/api/authApi';
import { useAuth, useUI } from '../../../hooks/useRedux';

const LoginForm = ({ onClose, onSwitchToSignup, onLoginSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [login, { isLoading }] = useLoginMutation();
  const { login: setAuthUser } = useAuth();
  const { showNotification } = useUI();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.identifier.trim()) {
      newErrors.identifier = 'Email or Username is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    try {
      const result = await login({
        email: formData.identifier, 
        password: formData.password,
      }).unwrap();
        
      showNotification('Login successful!');
      
      if (result.userAccessToken) {
        document.cookie = `userAccessToken=${result.userAccessToken}; path=/; max-age=2592000`;
        setAuthUser(result.user, result.userAccessToken);
      }

      console.log(result,"resultresultresultresult");

      
      const userData = {
        name: result.data?.name || result.user?.name || 'User',
        email: result.data?.email || result.user?.email || '',
        mobile: result.data?.mobileNumber || result.user?.mobile || ''
      };

      console.log(userData,"userDatauserDatauserDatauserData");
      
      localStorage.setItem('user', JSON.stringify(userData));
      
      onLoginSuccess(userData);
      onClose();
    } catch (error) {
      const errorData = error?.data?.data;
      const errorMessage = error?.data?.message || 'Login failed. Please check your credentials.';
      
      // If user needs to verify email, show OTP verification
      if (errorData?.requiresVerification) {
        showNotification(errorMessage);
        setShowOTPVerification(true);
      } else {
        showNotification(errorMessage);
        setErrors({ submit: errorMessage });
      }
    }
  };

  // Show OTP verification if user is unverified
  if (showOTPVerification) {
    return (
      <OTPVerification
        email={formData.identifier}
        onClose={() => {
          setShowOTPVerification(false);
          onClose();
        }}
        onBack={() => setShowOTPVerification(false)}
        onSuccess={() => {
          showNotification('Email verified! You are now logged in.');
          onClose();
          navigate('/');
        }}
      />
    );
  }

  if (showForgotPassword) {
    return (
      <ForgotPassword 
        onClose={onClose}
        onBackToLogin={() => setShowForgotPassword(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={onClose}>
      
      {/* Matches SignupForm Dimensions & Style */}
      <div 
        className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-300 h-[600px] md:h-[650px]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* --- LEFT SIDE (Visual) --- */}
        <div className="hidden md:flex w-5/12 bg-[#1c3026] p-10 flex-col justify-between relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-10">
                    {/* <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
                        <i className="fa-solid fa-leaf text-lg"></i>
                    </div> */}
                    <span className="text-white font-serif text-xl">UrbanNook</span>
                </div>
                
                <h2 className="text-4xl font-serif text-white mb-6 leading-tight">
                    Welcome <br/>
                    <span className="italic text-[#F5DEB3]">Back.</span>
                </h2>
                
                <p className="text-gray-300 text-sm leading-relaxed max-w-xs">
                    "Design is not just what it looks like and feels like. Design is how it works."
                </p>
            </div>

            {/* Decorative Stats/Badge */}
            <div className="relative z-10 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                        {[1,2,3].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full bg-[#0a110e] border-2 border-[#1c3026]"></div>
                        ))}
                    </div>
                    <div>
                        <p className="text-white text-xs font-bold">Join 500+ Members</p>
                        <p className="text-[#F5DEB3] text-[10px] uppercase tracking-widest">Community</p>
                    </div>
                </div>
            </div>
        </div>

        {/* --- RIGHT SIDE (Form) --- */}
        <div className="w-full md:w-7/12 overflow-y-auto px-8 py-10 md:p-12 relative flex flex-col justify-center">
          <button 
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-[#1c3026] transition-colors z-20"
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>

          <div className="max-w-md mx-auto w-full">
            <div className="mb-8 text-center md:text-left">
              <h2 className="text-3xl font-serif text-[#1c3026] mb-2">Sign In</h2>
              <p className="text-gray-500 text-sm">Continue to your curated space.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              
              {/* Identifier Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email or Username</label>
                <input
                  type="text"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleInputChange}
                  className={`w-full p-4 bg-white border rounded-2xl focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 transition-all outline-none text-[#1c3026] text-sm ${
                    errors.identifier ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="e.g. johndoe"
                />
                {errors.identifier && <p className="text-red-500 text-[10px] font-bold ml-2 uppercase">{errors.identifier}</p>}
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Password</label>
                  <button 
                    type="button" 
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[10px] font-bold text-emerald-600 hover:underline uppercase tracking-tighter"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full p-4 bg-white border rounded-2xl focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 transition-all outline-none text-[#1c3026] text-sm pr-12 ${
                      errors.password ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors"
                  >
                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-[10px] font-bold ml-2 uppercase">{errors.password}</p>}
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold tracking-widest uppercase hover:bg-emerald-700 transition-all shadow-xl active:scale-[0.98] mt-6 disabled:opacity-50 text-xs"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Verifying...
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
              
              {errors.submit && (
                <p className="text-red-500 text-xs text-center mt-2 font-semibold">{errors.submit}</p>
              )}
            </form>

            <p className="text-sm text-center mt-8 text-gray-500">
              New here?{' '}
              <span onClick={onSwitchToSignup} className="text-emerald-600 cursor-pointer font-bold hover:underline transition-all">
                Create an account
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;