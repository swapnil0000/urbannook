import { useState, useEffect, useRef } from 'react';
import { useResendOtpMutation, useVerifyOtpMutation } from '../../../store/api/authApi';
import { useUI } from '../../../hooks/useRedux';
import { useDispatch } from 'react-redux';

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
      // Calling API with email - backend will return token after verification
      const result = await verifyOtp({
        email: email,
        emailOtp: otpString
      }).unwrap();

      // Show success notification with backend message
      showNotification(result?.message || 'Email verified successfully!', 'success');

      // The authApi onQueryStarted already handles setCredentials with the token
      // No need for sessionStorage logic anymore

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
      const result = await resendOtp({ email: email }).unwrap();
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
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] sm:p-4 font-inter text-ink">
      <div className="bg-paper p-8 sm:p-12 w-full sm:max-w-[460px] shadow-2xl relative overflow-hidden auth-sheet max-h-[94dvh]">
        {/* Mobile grab handle */}
        <div className="sm:hidden absolute top-2.5 inset-x-0 z-30 flex justify-center pointer-events-none">
          <span className="h-1.5 w-11 rounded-full bg-hair"></span>
        </div>

        <button className="absolute top-6 right-6 text-faint hover:text-ink transition-colors" onClick={onClose}>
          <i className="fa-solid fa-xmark text-xl"></i>
        </button>

        <button className="absolute top-6 left-6 text-faint hover:text-ink transition-colors" onClick={onBack}>
          <i className="fa-solid fa-arrow-left text-xl"></i>
        </button>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-envelope-open-text text-brand text-2xl"></i>
          </div>

          <h2 className="text-3xl font-archivo font-bold text-ink mb-2">Verify Your Email</h2>
          <p className="text-muted text-sm">We&apos;ve sent a 6-digit code to</p>
          <p className="text-ink font-semibold">{email}</p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center gap-2 md:gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-10 h-12 md:w-12 md:h-12 text-center text-xl font-bold text-ink border-2 rounded-xl focus:outline-none transition-all ${
                  error ? 'border-red-500 bg-red-50' : 'border-hair focus:border-brand'
                }`}
              />
            ))}
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            onClick={handleVerify}
            disabled={isVerifying || otp.join('').length !== 6}
            className="w-full py-4 bg-brand text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-brandHi transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
          >
            {isVerifying ? 'Verifying...' : 'Verify OTP'}
          </button>

          <div className="text-center">
            {canResend ? (
              <button onClick={handleResend} className="text-brand font-semibold hover:underline">
                Resend Code
              </button>
            ) : (
              <p className="text-muted text-sm">
                Resend code in <span className="font-semibold text-ink">{timer}s</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
