import React, { useState } from 'react';
import OTPVerification from './OTPVerification';

const ForgotPassword = ({ onClose, onBackToLogin }) => {
  const [step, setStep] = useState('input'); // input, otp, success
  const [method, setMethod] = useState('email'); // email or mobile
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!contact.trim()) {
      setError(`Please enter your ${method}`);
      return;
    }

    if (method === 'email' && !/\S+@\S+\.\S+/.test(contact)) {
      setError('Please enter a valid email address');
      return;
    }

    if (method === 'mobile' && !/^[0-9]{10}$/.test(contact)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setStep('otp');
  };

  const handleOTPSuccess = () => {
    setStep('success');
  };

  if (step === 'otp') {
    return (
      <OTPVerification
        mobile={method === 'mobile' ? contact : '9876543210'}
        onClose={onClose}
        onSuccess={handleOTPSuccess}
        onBack={() => setStep('input')}
      />
    );
  }

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 w-full max-w-[480px] shadow-2xl relative animate-in fade-in zoom-in duration-300">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-check text-green-600 text-2xl"></i>
            </div>
            
            <h2 className="text-3xl font-serif text-slate-900 mb-4">Password Reset Sent!</h2>
            <p className="text-slate-600 mb-8">
              We've sent password reset instructions to your {method}.
            </p>
            
            <button
              onClick={onBackToLogin}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
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

        <button 
          className="absolute top-8 left-8 w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
          onClick={onBackToLogin}
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-key text-blue-600 text-2xl"></i>
          </div>
          
          <h2 className="text-3xl font-serif text-slate-900 mb-2">Forgot Password?</h2>
          <p className="text-slate-500 text-sm">
            No worries! Enter your details and we'll send you reset instructions.
          </p>
        </div>

        {/* Method Selection */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMethod('email')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              method === 'email' 
                ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-200' 
                : 'bg-gray-100 text-gray-600 border-2 border-transparent'
            }`}
          >
            <i className="fa-solid fa-envelope mr-2"></i>
            Email
          </button>
          <button
            onClick={() => setMethod('mobile')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              method === 'mobile' 
                ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-200' 
                : 'bg-gray-100 text-gray-600 border-2 border-transparent'
            }`}
          >
            <i className="fa-solid fa-mobile mr-2"></i>
            Mobile
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              {method === 'email' ? 'Email Address' : 'Mobile Number'}
            </label>
            <input
              type={method === 'email' ? 'email' : 'tel'}
              value={contact}
              onChange={(e) => {
                setContact(e.target.value);
                setError('');
              }}
              className={`w-full p-4 bg-slate-50 border rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-slate-900 text-sm ${
                error ? 'border-red-500' : 'border-slate-300'
              }`}
              placeholder={method === 'email' ? 'name@example.com' : '9876543210'}
              maxLength={method === 'mobile' ? '10' : undefined}
              required
            />
            {error && <p className="text-red-500 text-xs ml-1">{error}</p>}
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl active:scale-[0.98]"
          >
            Send Reset Instructions
          </button>
        </form>

        <p className="text-sm text-center mt-6 text-slate-500">
          Remember your password?{' '}
          <span onClick={onBackToLogin} className="text-emerald-700 cursor-pointer font-bold hover:underline transition-all">
            Back to Login
          </span>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;