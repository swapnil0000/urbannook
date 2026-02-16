import { useState } from 'react';
import { useForgotPasswordRequestMutation, useForgotPasswordResetMutation } from '../../../store/api/authApi';
import { useUI } from '../../../hooks/useRedux';

const ForgotPassword = ({ onClose, onBackToLogin }) => {
  const [step, setStep] = useState('email'); // email, otp, success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [forgotPasswordRequest, { isLoading: isRequestingOTP }] = useForgotPasswordRequestMutation();
  const [forgotPasswordReset, { isLoading: isResetting }] = useForgotPasswordResetMutation();
  const { showNotification } = useUI();

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      const result = await forgotPasswordRequest({ email }).unwrap();
      // Show success notification with backend message
      showNotification(result?.message || 'OTP sent successfully!', 'success');
      setStep('otp');
    } catch (err) {
      const errorMessage = err.data?.message || 'Failed to send OTP. Please try again.';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const result = await forgotPasswordReset({ email, otp, newPassword }).unwrap();
      // Show success notification with backend message
      showNotification(result?.message || 'Password reset successful!', 'success');
      setStep('success');
    } catch (err) {
      const errorMessage = err.data?.message || 'Failed to reset password. Please try again.';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    }
  };

  const handleResendOTP = async () => {
    setError('');
    try {
      const result = await forgotPasswordRequest({ email }).unwrap();
      // Show success notification with backend message
      showNotification(result?.message || 'OTP resent successfully!', 'success');
    } catch (err) {
      const errorMessage = err.data?.message || 'Failed to resend OTP';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    }
  };

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 w-full max-w-[480px] shadow-2xl relative animate-in fade-in zoom-in duration-300">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-check text-green-600 text-2xl"></i>
            </div>
            
            <h2 className="text-3xl font-serif text-slate-900 mb-4">Password Reset Successful!</h2>
            <p className="text-slate-600 mb-8">
              Your password has been reset successfully. You can now login with your new password.
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

  if (step === 'otp') {
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
            onClick={() => setStep('email')}
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>

          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-shield-halved text-blue-600 text-2xl"></i>
            </div>
            
            <h2 className="text-3xl font-serif text-slate-900 mb-2">Enter OTP & New Password</h2>
            <p className="text-slate-500 text-sm">
              We've sent a 6-digit code to <span className="font-bold text-slate-700">{email}</span>
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                OTP Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                className={`w-full p-4 bg-slate-50 border rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-slate-900 text-center text-2xl tracking-widest font-mono ${
                  error ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="000000"
                maxLength="6"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError('');
                  }}
                  className={`w-full p-4 bg-slate-50 border rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-slate-900 text-sm pr-12 ${
                    error ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="At least 8 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-700 transition-colors"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  className={`w-full p-4 bg-slate-50 border rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-slate-900 text-sm pr-12 ${
                    error ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Re-enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-700 transition-colors"
                >
                  <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-xs ml-1">{error}</p>}

            <button 
              type="submit"
              disabled={isResetting}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
            >
              {isResetting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Resetting...
                </div>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <button 
              onClick={handleResendOTP}
              disabled={isRequestingOTP}
              className="text-sm text-emerald-700 font-bold hover:underline transition-all disabled:opacity-50"
            >
              Didn't receive code? Resend OTP
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
            No worries! Enter your email and we'll send you an OTP to reset your password.
          </p>
        </div>

        <form onSubmit={handleRequestOTP} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              className={`w-full p-4 bg-slate-50 border rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-slate-900 text-sm ${
                error ? 'border-red-500' : 'border-slate-300'
              }`}
              placeholder="name@example.com"
              required
            />
            {error && <p className="text-red-500 text-xs ml-1">{error}</p>}
          </div>

          <button 
            type="submit"
            disabled={isRequestingOTP}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
          >
            {isRequestingOTP ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sending OTP...
              </div>
            ) : (
              'Send OTP'
            )}
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