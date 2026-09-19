import { useState } from 'react';
import { useForgotPasswordRequestMutation, useForgotPasswordResetMutation } from '../../../store/api/authApi';
import { useUI } from '../../../hooks/useRedux';
import useFormValidation from '../../../hooks/useFormValidation';

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

  // Use validation hook for password reset
  const {
    errors,
    validateField,
    clearFieldError
  } = useFormValidation();

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

    // Validate new password with strict requirements
    const isPasswordValid = validateField('password', newPassword);
    if (!isPasswordValid) {
      return;
    }

    // Validate confirm password
    const isConfirmPasswordValid = validateField('confirmPassword', confirmPassword, { password: newPassword });
    if (!isConfirmPasswordValid) {
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

  // Shared chrome classes — bottom-sheet on mobile, centered dialog on desktop
  const overlayCls = 'fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] sm:p-4 font-inter text-ink';
  const cardCls = 'bg-paper p-8 sm:p-12 w-full sm:max-w-[460px] shadow-2xl relative overflow-hidden auth-sheet max-h-[94dvh]';
  const Handle = () => (
    <div className="sm:hidden absolute top-2.5 inset-x-0 z-30 flex justify-center pointer-events-none">
      <span className="h-1.5 w-11 rounded-full bg-hair"></span>
    </div>
  );

  if (step === 'success') {
    return (
      <div className={overlayCls}>
        <div className={cardCls}>
          <Handle />
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-check text-green-600 text-2xl"></i>
            </div>

            <h2 className="text-3xl font-archivo font-bold text-ink mb-4">Password Reset Successful!</h2>
            <p className="text-muted mb-8">
              Your password has been reset successfully. You can now login with your new password.
            </p>

            <button
              onClick={onBackToLogin}
              className="w-full py-4 bg-brand text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-brandHi transition-all shadow-xl"
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
      <div className={overlayCls} onClick={onClose}>
        <div className={cardCls} onClick={(e) => e.stopPropagation()}>
          <Handle />
          <button
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-surface text-faint hover:text-ink transition-colors"
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>

          <button
            className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-surface text-faint hover:text-ink transition-colors"
            onClick={() => setStep('email')}
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>

          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-shield-halved text-brand text-2xl"></i>
            </div>

            <h2 className="text-3xl font-archivo font-bold text-ink mb-2">Enter OTP &amp; New Password</h2>
            <p className="text-muted text-sm">
              We&apos;ve sent a 6-digit code to <span className="font-bold text-ink">{email}</span>
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-faint ml-1">
                OTP Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                className={`w-full p-4 bg-white border rounded-2xl focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all outline-none text-ink text-center text-2xl tracking-widest font-mono ${
                  error ? 'border-red-500' : 'border-hair'
                }`}
                placeholder="000000"
                maxLength="6"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-faint ml-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError('');
                    clearFieldError('password');
                  }}
                  className={`w-full p-4 bg-white border rounded-2xl focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all outline-none text-ink text-sm pr-12 ${
                    errors.password ? 'border-red-500' : 'border-hair'
                  }`}
                  placeholder="At least 8 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-faint hover:text-brand transition-colors"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-[10px] font-bold ml-2 uppercase">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-faint ml-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                    clearFieldError('confirmPassword');
                  }}
                  className={`w-full p-4 bg-white border rounded-2xl focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all outline-none text-ink text-sm pr-12 ${
                    errors.confirmPassword ? 'border-red-500' : 'border-hair'
                  }`}
                  placeholder="Re-enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-faint hover:text-brand transition-colors"
                >
                  <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-[10px] font-bold ml-2 uppercase">{errors.confirmPassword}</p>}
            </div>

            {error && <p className="text-red-500 text-xs ml-1">{error}</p>}

            <button
              type="submit"
              disabled={isResetting}
              className="w-full py-4 bg-brand text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-brandHi transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
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
              className="text-sm text-brand font-bold hover:underline transition-all disabled:opacity-50"
            >
              Didn&apos;t receive code? Resend OTP
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={overlayCls} onClick={onClose}>
      <div className={cardCls} onClick={(e) => e.stopPropagation()}>
        <Handle />
        <button
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-surface text-faint hover:text-ink transition-colors"
          onClick={onClose}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        <button
          className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-surface text-faint hover:text-ink transition-colors"
          onClick={onBackToLogin}
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-key text-brand text-2xl"></i>
          </div>

          <h2 className="text-3xl font-archivo font-bold text-ink mb-2">Forgot Password?</h2>
          <p className="text-muted text-sm">
            No worries! Enter your email and we&apos;ll send you an OTP to reset your password.
          </p>
        </div>

        <form onSubmit={handleRequestOTP} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-faint ml-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              className={`w-full p-4 bg-white border rounded-2xl focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all outline-none text-ink text-sm ${
                error ? 'border-red-500' : 'border-hair'
              }`}
              placeholder="name@example.com"
              required
            />
            {error && <p className="text-red-500 text-xs ml-1">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isRequestingOTP}
            className="w-full py-4 bg-brand text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-brandHi transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
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

        <p className="text-sm text-center mt-6 text-muted">
          Remember your password?{' '}
          <span onClick={onBackToLogin} className="text-brand cursor-pointer font-bold hover:underline transition-all">
            Back to Login
          </span>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
