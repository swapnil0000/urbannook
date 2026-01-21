import React, { useState, useRef, useEffect } from 'react';
import { useVerifyOtpMutation, useResendOtpMutation } from '../../store/api/authApi';
import { useAuth, useUI } from '../../hooks/useRedux';

const OTPVerificationScreen = ({ email, onClose, onVerified }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);
  
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();
  const { login } = useAuth();
  const { showNotification } = useUI();

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newOtp.every(digit => digit !== '') && index === 5) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split('');
    setOtp([...newOtp, ...Array(6 - newOtp.length).fill('')]);
    
    if (newOtp.length === 6) {
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (otpCode = otp.join('')) => {
    if (otpCode.length !== 6) {
      showNotification('Please enter complete OTP');
      return;
    }

    try {
      const result = await verifyOtp({
        userEmail: email,
        otp: otpCode
      }).unwrap();

      showNotification('Email verified successfully!');
      
      // Store token in cookie
      if (result.userAccessToken) {
        document.cookie = `userAccessToken=${result.userAccessToken}; path=/; max-age=2592000`;
        login(result.user, result.userAccessToken);
      }

      onVerified(result);
    } catch (error) {
      showNotification(error.data?.message || 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      await resendOtp({ userEmail: email }).unwrap();
      showNotification('OTP sent successfully!');
      setTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error) {
      showNotification(error.data?.message || 'Failed to resend OTP');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-[2.5rem] p-8 md:p-12 w-full max-w-[500px] shadow-2xl relative animate-in fade-in zoom-in duration-300" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
          onClick={onClose}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-envelope text-emerald-600 text-3xl"></i>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-serif text-slate-900 mb-2">
            Verify Your <span className="italic font-light text-emerald-700">Email</span>
          </h2>
          <p className="text-slate-500 text-sm">
            We've sent a 6-digit code to
          </p>
          <p className="text-emerald-700 font-semibold text-sm mt-1">{email}</p>
        </div>

        {/* OTP Input */}
        <div className="flex gap-3 justify-center mb-8" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none bg-slate-50"
            />
          ))}
        </div>

        {/* Timer / Resend */}
        <div className="text-center mb-6">
          {canResend ? (
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-emerald-700 font-semibold text-sm hover:underline disabled:opacity-50"
            >
              {isResending ? 'Sending...' : 'Resend OTP'}
            </button>
          ) : (
            <p className="text-slate-500 text-sm">
              Resend OTP in <span className="font-bold text-emerald-700">{timer}s</span>
            </p>
          )}
        </div>

        {/* Verify Button */}
        <button
          onClick={() => handleVerify()}
          disabled={isVerifying || otp.some(digit => !digit)}
          className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-bold tracking-widest uppercase hover:bg-emerald-700 transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Verifying...
            </div>
          ) : (
            'Verify Email'
          )}
        </button>

        <p className="text-xs text-slate-400 text-center mt-6">
          Didn't receive the code? Check your spam folder
        </p>
      </div>
    </div>
  );
};

export default OTPVerificationScreen;