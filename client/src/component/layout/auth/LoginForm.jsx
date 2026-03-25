import { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import ForgotPassword from './ForgotPassword';
import { useLoginMutation, useLoginVerifyOtpMutation } from '../../../store/api/authApi';
import { useAuth, useUI } from '../../../hooks/useRedux';
import { setShowLoginModal } from '../../../store/slices/uiSlice';
import GoogleLoginButton from './GoogleLoginButton';

const LoginForm = ({ onClose, onSwitchToSignup, onLoginSuccess }) => {
  const dispatch = useDispatch();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [emailError, setEmailError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const inputRefs = useRef([]);

  const [sendOtp, { isLoading: isSending }] = useLoginMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useLoginVerifyOtpMutation();
  const { login: setAuthUser } = useAuth();
  const { showNotification } = useUI();

  useEffect(() => {
    if (step !== 2) return;
    setTimer(30);
    setCanResend(false);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) { clearInterval(interval); setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const handleClose = () => {
    dispatch(setShowLoginModal(false));
    onClose();
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setEmailError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('Please enter a valid email'); return; }
    setEmailError('');
    try {
      await sendOtp({ email: email.trim().toLowerCase() }).unwrap();
      showNotification('OTP sent to your email', 'success');
      setStep(2);
    } catch (err) {
      setEmailError(err?.data?.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpStr = otp.join('');
    if (otpStr.length !== 6) { setOtpError('Please enter the complete 6-digit OTP'); return; }
    try {
      const result = await verifyOtp({ email: email.trim().toLowerCase(), otp: otpStr }).unwrap();
      showNotification('Login successful!', 'success');
      const token = result.data?.userAccessToken;
      const userData = {
        name: result.data?.name || 'User',
        email: result.data?.email || email,
        mobile: result.data?.userMobileNumber || '',
      };
      if (token) setAuthUser(userData, token);
      localStorage.setItem('user', JSON.stringify(userData));
      if (onLoginSuccess) onLoginSuccess(userData);
      handleClose();
    } catch (err) {
      setOtpError(err?.data?.message || 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    try {
      await sendOtp({ email: email.trim().toLowerCase() }).unwrap();
      showNotification('OTP resent to your email', 'success');
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
      setTimer(30);
      setCanResend(false);
    } catch (err) {
      showNotification(err?.data?.message || 'Failed to resend OTP', 'error');
    }
  };

  if (showForgotPassword) {
    return <ForgotPassword onClose={onClose} onBackToLogin={() => setShowForgotPassword(false)} />;
  }

  const LeftPanel = () => (
    <div className="hidden md:flex w-5/12 bg-[#1c3026] p-10 flex-col justify-between relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
      <div className="relative z-10">
        <span className="text-white font-serif text-xl">UrbanNook</span>
        <h2 className="text-4xl font-serif text-white mt-10 mb-6 leading-tight">
          Welcome <br /><span className="italic text-[#F5DEB3]">Back.</span>
        </h2>
        <p className="text-gray-300 text-sm leading-relaxed max-w-xs">
          "Design is not just what it looks like and feels like. Design is how it works."
        </p>
      </div>
      <div className="relative z-10 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-3">
            {[1, 2, 3].map(i => (
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
  );


  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-300 h-[600px] md:h-[650px]"
        onClick={(e) => e.stopPropagation()}
      >
        <LeftPanel />

        <div className="w-full md:w-7/12 overflow-y-auto px-8 py-10 md:p-12 relative flex flex-col justify-center">
          <button
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-[#1c3026] transition-colors z-20"
            onClick={handleClose}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>

          <div className="max-w-md mx-auto w-full">
            {step === 1 ? (
              <>
                <div className="mb-8 text-center md:text-left">
                  <h2 className="text-3xl font-serif text-[#1c3026] mb-2">Sign In</h2>
                  <p className="text-gray-500 text-sm">We'll send a one-time code to your email.</p>
                </div>

                <form className="space-y-5" onSubmit={handleSendOtp}>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                      className={`w-full p-4 bg-white border rounded-2xl focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 transition-all outline-none text-[#1c3026] text-sm ${emailError ? 'border-red-500' : 'border-gray-200'}`}
                      placeholder="you@example.com"
                    />
                    {emailError && <p className="text-red-500 text-[10px] font-bold ml-2 uppercase">{emailError}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isSending}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold tracking-widest uppercase hover:bg-emerald-700 transition-all shadow-xl active:scale-[0.98] mt-6 disabled:opacity-50 text-xs"
                  >
                    {isSending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Sending OTP...
                      </span>
                    ) : 'Send OTP'}
                  </button>
                </form>

                <div className="mt-6">
                  <div className="relative flex items-center justify-center my-6">
                    <div className="border-t border-gray-200 w-full"></div>
                    <span className="bg-white px-4 text-xs text-gray-400 font-bold uppercase tracking-widest">OR</span>
                    <div className="border-t border-gray-200 w-full"></div>
                  </div>
                  <div className="flex justify-center">
                    <GoogleLoginButton
                      useOneTap={true}
                      onSuccess={(userData) => {
                        showNotification('Google login successful!');
                        if (onLoginSuccess) onLoginSuccess(userData);
                        handleClose();
                      }}
                      onError={(error) => showNotification(error?.data?.message || 'Google login failed.', 'error')}
                    />
                  </div>
                </div>

                <p className="text-sm text-center mt-8 text-gray-500">
                  New here?{' '}
                  <span onClick={onSwitchToSignup} className="text-emerald-600 cursor-pointer font-bold hover:underline">
                    Create an account
                  </span>
                </p>
              </>
            ) : (
              <>
                <button
                  className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-[#1c3026] transition-colors z-20"
                  onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); setOtpError(''); }}
                >
                  <i className="fa-solid fa-arrow-left"></i>
                </button>

                <div className="mb-8 text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-envelope-open-text text-emerald-600 text-2xl"></i>
                  </div>
                  <h2 className="text-3xl font-serif text-[#1c3026] mb-2">Check your email</h2>
                  <p className="text-gray-500 text-sm">We sent a 6-digit code to</p>
                  <p className="text-[#1c3026] font-semibold text-sm mt-1">{email}</p>
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
                        className={`w-10 h-12 md:w-12 md:h-12 text-center text-xl font-bold border-2 rounded-xl focus:outline-none transition-all ${otpError ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:border-emerald-500'}`}
                      />
                    ))}
                  </div>

                  {otpError && <p className="text-red-500 text-sm text-center">{otpError}</p>}

                  <button
                    onClick={handleVerifyOtp}
                    disabled={isVerifying || otp.join('').length !== 6}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl disabled:opacity-50 text-xs"
                  >
                    {isVerifying ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Verifying...
                      </span>
                    ) : 'Verify & Sign In'}
                  </button>

                  <div className="text-center">
                    {canResend ? (
                      <button onClick={handleResend} className="text-emerald-600 font-semibold hover:underline text-sm">
                        Resend Code
                      </button>
                    ) : (
                      <p className="text-slate-500 text-sm">
                        Resend code in <span className="font-semibold text-slate-900">{timer}s</span>
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
