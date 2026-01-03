import React, { useState } from 'react';
import ForgotPassword from './ForgotPassword';

const LoginForm = ({ onClose, onSwitchToSignup, onLoginSuccess }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate login API call
    setTimeout(() => {
      const userData = {
        name: 'John Doe',
        email: formData.email,
        mobile: '9876543210'
      };
      localStorage.setItem('user', JSON.stringify(userData));
      onLoginSuccess(userData);
      onClose();
      setIsLoading(false);
    }, 1000);
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
            <span className="absolute bg-white px-4 text-[10px] uppercase font-bold text-slate-300 tracking-[0.2em]">Or use email</span>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-slate-900 text-sm"
              placeholder="name@example.com"
              required
            />
          </div>

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
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-slate-900 text-sm"
              placeholder="••••••••"
              required
            />
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