import React, { useState } from 'react';
import { useLoginMutation } from '../../store/api/authApi';
import { useAuth, useUI } from '../../hooks/useRedux';
import ForgotPassword from './ForgotPassword';

const LoginForm = ({ onClose, onSwitchToSignup, onLoginSuccess }) => {
  // Changed 'email' to 'identifier' to handle both email and username
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Toggle state
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
      // The backend should be configured to check the 'identifier' 
      // against both userEmail and userName columns
      const result = await login({
        userIdentifier: formData.identifier, 
        userPassword: formData.password,
      }).unwrap();
        
      showNotification('Login successful!');
      
      if (result.userAccessToken) {
        document.cookie = `userAccessToken=${result.userAccessToken}; path=/; max-age=2592000`;
        setAuthUser(result.user, result.userAccessToken);
      }
      
      const userData = {
        name: result.user?.userName || result.user?.name || 'User',
        email: result.user?.userEmail || result.user?.email || '',
        mobile: result.user?.userMobileNumber || result.user?.mobile || ''
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
      <div 
        className="bg-white rounded-[2.5rem] p-8 md:p-12 w-full max-w-[480px] shadow-2xl relative animate-in fade-in zoom-in duration-300" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
          onClick={onClose}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-serif text-slate-900 mb-2">
            Welcome <span className="italic font-light text-emerald-700 text-2xl md:text-3xl">Back</span>
          </h2>
          <p className="text-slate-500 text-sm tracking-wide">Sign in to your Urban Nook account</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Social Logins */}
          <div className="flex gap-3 mb-8">
            {['google', 'facebook', 'mobile'].map((provider) => (
              <button 
                key={provider}
                type="button"
                className="flex-1 h-12 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95"
              >
                <img src={`/assets/onboardIcon-${provider === 'mobile' ? 'mail' : provider === 'google' ? 'gp' : 'fb'}.svg`} className="w-5 h-5" alt={provider} />
              </button>
            ))}
          </div>

          <div className="relative flex items-center justify-center mb-8">
            <div className="w-full border-t border-slate-100"></div>
            <span className="absolute bg-white px-4 text-[10px] uppercase font-bold text-slate-300 tracking-[0.2em]">Or use account details</span>
          </div>

          {/* Email or Username Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email or Username</label>
            <input
              type="text"
              name="identifier"
              value={formData.identifier}
              onChange={handleInputChange}
              className={`w-full p-4 bg-slate-50 border rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-slate-900 text-sm ${
                errors.identifier ? 'border-red-500' : 'border-slate-300'
              }`}
              placeholder="e.g. johndoe or john@example.com"
            />
            {errors.identifier && <p className="text-red-500 text-[10px] font-bold ml-1 uppercase">{errors.identifier}</p>}
          </div>

          {/* Password Input with Visibility Toggle */}
          <div className="space-y-2">
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
                  errors.password ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-700 transition-colors"
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-[10px] font-bold ml-1 uppercase">{errors.password}</p>}
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold tracking-widest uppercase hover:bg-emerald-700 transition-all shadow-xl active:scale-[0.98] mt-4 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Signing In...
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
  );
};

export default LoginForm;