import React, { useState } from 'react';
import OTPVerification from './OTPVerification';

const SignupForm = ({ onClose, onSwitchToLogin, onSignupSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });
  const [showOTP, setShowOTP] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.mobile.trim()) newErrors.mobile = 'Mobile number is required';
    if (formData.mobile && !/^[0-9]{10}$/.test(formData.mobile)) {
      newErrors.mobile = 'Please enter a valid 10-digit mobile number';
    }
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setShowOTP(true);
  };

  const handleOTPSuccess = () => {
    const userData = {
      name: formData.name,
      email: formData.email,
      mobile: formData.mobile
    };
    localStorage.setItem('user', JSON.stringify(userData));
    onSignupSuccess(userData);
    onClose();
  };

  if (showOTP) {
    return (
      <OTPVerification 
        mobile={formData.mobile}
        onClose={onClose}
        onSuccess={handleOTPSuccess}
        onBack={() => setShowOTP(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-[2.5rem] p-8 md:p-12 w-full max-w-[520px] shadow-2xl relative max-h-[95vh] overflow-y-auto animate-in fade-in zoom-in duration-300" 
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
            Join the <span className="italic font-light text-emerald-700 text-2xl md:text-3xl">Movement</span>
          </h2>
          <p className="text-slate-500 text-sm tracking-wide">Enter your details to get started</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full p-4 bg-slate-50 border rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-slate-900 text-sm ${
                errors.name ? 'border-red-500' : 'border-slate-300'
              }`}
              placeholder="John Doe"
              required
            />
            {errors.name && <p className="text-red-500 text-xs ml-1">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full p-4 bg-slate-50 border rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-slate-900 text-sm ${
                errors.email ? 'border-red-500' : 'border-slate-300'
              }`}
              placeholder="name@example.com"
              required
            />
            {errors.email && <p className="text-red-500 text-xs ml-1">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mobile Number</label>
            <input
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleInputChange}
              className={`w-full p-4 bg-slate-50 border rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-slate-900 text-sm ${
                errors.mobile ? 'border-red-500' : 'border-slate-300'
              }`}
              placeholder="9876543210"
              maxLength="10"
              required
            />
            {errors.mobile && <p className="text-red-500 text-xs ml-1">{errors.mobile}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full p-4 bg-slate-50 border rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-slate-900 text-sm ${
                  errors.password ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="••••••••"
                required
              />
              {errors.password && <p className="text-red-500 text-xs ml-1">{errors.password}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full p-4 bg-slate-50 border rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-slate-900 text-sm ${
                  errors.confirmPassword ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="••••••••"
                required
              />
              {errors.confirmPassword && <p className="text-red-500 text-xs ml-1">{errors.confirmPassword}</p>}
            </div>
          </div>

          <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold tracking-widest uppercase hover:bg-emerald-700 transition-all shadow-xl active:scale-[0.98] mt-6">
            Create Account
          </button>
        </form>

        <p className="text-sm text-center mt-8 text-slate-500">
          Already have an account?{' '}
          <span onClick={onSwitchToLogin} className="text-emerald-700 cursor-pointer font-bold hover:underline transition-all">
            Sign in
          </span>
        </p>
      </div>
    </div>
  );
};

export default SignupForm;