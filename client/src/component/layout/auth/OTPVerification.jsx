import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useResendOtpMutation, useVerifyOtpMutation } from '../../../store/api/authApi';
import { setCredentials } from '../../../store/slices/authSlice';
import { useUI } from '../../../hooks/useRedux';

const OTPVerification = ({ email, onClose, onSuccess, onBack }) => {
  const dispatch = useDispatch();
  const { showNotification } = useUI();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  
  // API Mutations
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
  const [resendOtp] = useResendOtpMutation();

  const inputRefs = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [canResend]); // Reset timer logic

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter complete OTP');
      return;
    }

    try {
      // Calling API with email
      const result = await verifyOtp({
        email: email,
        emailOtp: otpString
      }).unwrap();
      
      // Show success notification with backend message
      showNotification(result?.message || 'Email verified successfully!', 'success');
      
      // CRITICAL FIX: After successful OTP verification, NOW save credentials
      if (result.success) {
        // Get pending verification data from sessionStorage
        const pendingData = JSON.parse(sessionStorage.getItem('pendingVerification') || '{}');
        
        if (pendingData.token) {
          // NOW save the token and user data (OTP verified)
          document.cookie = `userAccessToken=${pendingData.token}; path=/; max-age=2592000`;
          localStorage.setItem('token', pendingData.token);
          
          const userData = {
            name: pendingData.name,
            email: pendingData.email,
            mobile: pendingData.mobile
          };
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Dispatch login action to Redux
          dispatch(setCredentials({
            user: userData,
            token: pendingData.token
          }));
          
          // Clear pending verification data
          sessionStorage.removeItem('pendingVerification');
          
          // Trigger window storage event to sync across components
          window.dispatchEvent(new Event('storage'));
        }
      }
      
      onSuccess(result);
    } catch (err) {
      const errorMessage = err.data?.message || 'Invalid OTP. Please try again.';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    try {
      const result = await resendOtp({ userEmail: email }).unwrap();
      // Show success notification with backend message
      showNotification(result?.message || 'OTP resent successfully!', 'success');
      setTimer(30);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      setError('');
    } catch (err) {
      const errorMessage = err.data?.message || 'Failed to resend code';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[2.5rem] p-8 md:p-12 w-full max-w-[480px] shadow-2xl relative animate-in fade-in zoom-in duration-300">
        <button className="absolute top-8 right-8 text-slate-400 hover:text-slate-900" onClick={onClose}>
          <i className="fa-solid fa-xmark text-xl"></i>
        </button>

        <button className="absolute top-8 left-8 text-slate-400 hover:text-slate-900" onClick={onBack}>
          <i className="fa-solid fa-arrow-left text-xl"></i>
        </button>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            {/* Changed icon to envelope */}
            <i className="fa-solid fa-envelope-open-text text-emerald-600 text-2xl"></i>
          </div>
          
          <h2 className="text-3xl font-serif text-slate-900 mb-2">Verify Your Email</h2>
          <p className="text-slate-500 text-sm">We've sent a 6-digit code to</p>
          <p className="text-slate-900 font-semibold">{email}</p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center gap-2 md:gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-10 h-12 md:w-12 md:h-12 text-center text-xl font-bold border-2 rounded-xl focus:outline-none transition-all ${
                  error ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:border-emerald-500'
                }`}
              />
            ))}
          </div>

          {error && <p className="text-red-500 text-sm text-center animate-shake">{error}</p>}

          <button
            onClick={handleVerify}
            disabled={isVerifying || otp.join('').length !== 6}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl disabled:opacity-50"
          >
            {isVerifying ? 'Verifying...' : 'Verify OTP'}
          </button>

          <div className="text-center">
            {canResend ? (
              <button onClick={handleResend} className="text-emerald-600 font-semibold hover:underline">
                Resend Code
              </button>
            ) : (
              <p className="text-slate-500 text-sm">
                Resend code in <span className="font-semibold text-slate-900">{timer}s</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;