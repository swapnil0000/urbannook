import React, { useState } from 'react';
import ForgotPassword from './ForgotPassword';
import { useLoginMutation } from '../../../store/api/authApi';
import { useAuth, useUI } from '../../../hooks/useRedux';

const LoginForm = ({ onClose, onSwitchToSignup, onLoginSuccess }) => {
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
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
        userEmail: formData.identifier, 
        userPassword: formData.password,
      }).unwrap();
        
      showNotification('Login successful!');
      
      if (result.userAccessToken) {
        document.cookie = `userAccessToken=${result.userAccessToken}; path=/; max-age=2592000`;
        setAuthUser(result.user, result.userAccessToken);
      }

      
      const userData = {
        name: result.data?.userName || result.user?.name || 'User',
        email: result.data?.userEmail || result.user?.email || '',
        mobile: result.data?.userMobileNumber || result.user?.mobile || ''
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      onLoginSuccess(userData);
      onClose();
    } catch (error) {
      showNotification(error.data?.message || 'Login failed. Please check your credentials.');
      setErrors({ submit: error.data?.message || 'Login failed' });
    }
  };

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
        <div className="hidden md:flex w-5/12 bg-slate-900 p-10 flex-col justify-between relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
                        <i className="fa-solid fa-leaf text-lg"></i>
                    </div>
                    <span className="text-white font-serif text-xl">UrbanNook</span>
                </div>
                
                <h2 className="text-4xl font-serif text-white mb-6 leading-tight">
                    Welcome <br/>
                    <span className="italic text-emerald-500">Back.</span>
                </h2>
                
                <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                    "Design is not just what it looks like and feels like. Design is how it works."
                </p>
            </div>

            {/* Decorative Stats/Badge */}
            <div className="relative z-10 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                        {[1,2,3].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900"></div>
                        ))}
                    </div>
                    <div>
                        <p className="text-white text-xs font-bold">Join 10k+ Members</p>
                        <p className="text-emerald-500 text-[10px] uppercase tracking-widest">Community</p>
                    </div>
                </div>
            </div>
        </div>

        {/* --- RIGHT SIDE (Form) --- */}
        <div className="w-full md:w-7/12 overflow-y-auto px-8 py-10 md:p-12 relative flex flex-col justify-center">
          <button 
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors z-20"
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>

          <div className="max-w-md mx-auto w-full">
            <div className="mb-8">
              <h2 className="text-3xl font-serif text-slate-900 mb-2">Sign In</h2>
              <p className="text-slate-500 text-sm">Continue to your curated space.</p>
            </div>

            {/* Social Logins */}
            <div className="grid grid-cols-3 gap-3 mb-8">
                {['google', 'facebook', 'mobile'].map((provider) => (
                <button 
                    key={provider}
                    type="button"
                    className="h-12 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95"
                >
                    <img src={`/assets/onboardIcon-${provider === 'mobile' ? 'mail' : provider === 'google' ? 'gp' : 'fb'}.svg`} className="w-5 h-5" alt={provider} />
                </button>
                ))}
            </div>

            <div className="relative flex items-center justify-center mb-8">
                <div className="w-full border-t border-slate-100"></div>
                <span className="absolute bg-white px-4 text-[10px] uppercase font-bold text-slate-300 tracking-[0.2em]">Or using email</span>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              
              {/* Identifier Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email or Username</label>
                <input
                  type="text"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleInputChange}
                  className={`w-full p-4 bg-slate-50 border rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-slate-900 text-sm ${
                    errors.identifier ? 'border-red-500' : 'border-slate-200'
                  }`}
                  placeholder="e.g. johndoe"
                />
                {errors.identifier && <p className="text-red-500 text-[10px] font-bold ml-2 uppercase">{errors.identifier}</p>}
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</label>
                  <button 
                    type="button" 
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[10px] font-bold text-emerald-700 hover:underline uppercase tracking-tighter"
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
                    className={`w-full p-4 bg-slate-50 border rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-slate-900 text-sm pr-12 ${
                      errors.password ? 'border-red-500' : 'border-slate-200'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-700 transition-colors"
                  >
                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-[10px] font-bold ml-2 uppercase">{errors.password}</p>}
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold tracking-widest uppercase hover:bg-emerald-700 transition-all shadow-xl active:scale-[0.98] mt-6 disabled:opacity-50 text-xs"
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

            <p className="text-sm text-center mt-8 text-slate-500">
              New here?{' '}
              <span onClick={onSwitchToSignup} className="text-emerald-700 cursor-pointer font-bold hover:underline transition-all">
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