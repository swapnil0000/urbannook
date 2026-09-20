import { useEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useGoogleLoginMutation } from '../../../store/api/authApi';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../../../store/slices/authSlice';
import { clearLoginCallback } from '../../../store/slices/uiSlice';
import { useNavigate } from 'react-router-dom';
import { trackLogin } from '../../../utils/analytics';

export default function GoogleLoginButton({ 
  onSuccess, 
  onError, 
  useOneTap = true,
  theme = "outline",
  size = "large", 
  text = "continue_with",
  shape = "rectangular"
}) {
  /* Google renders this button inside an iframe it lays out itself, at the
     width IT is told. Stretching that iframe with CSS does not widen the
     button — it widens the box around a button that is still laid out for the
     old width, which is what tore the logo away from the label. The supported
     way is to hand Google a pixel width, so the wrapper is measured and the
     number passed down; 400 is the widest Google accepts. */
  const holderRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;

    const measure = () => {
      const w = Math.floor(el.getBoundingClientRect().width);
      if (w > 0) setWidth(Math.min(w, 400));
    };

    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [googleLogin, { isLoading }] = useGoogleLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loginCallback } = useSelector((state) => state.ui);

  const handleSuccess = async (credentialResponse) => {
    try {
      const result = await googleLogin({
        credential: credentialResponse.credential
      }).unwrap();

      if (result.success && result.data) {
        const token = result.data.userAccessToken;
        
        // Dispatch setCredentials action with user data and token
        dispatch(setCredentials({
          user: {
            email: result.data.email,
            name: result.data.name,
            role: result.data.role,
            userId: result.data.userId,
          },
          token,
        }));

        trackLogin({ method: 'google', userId: result.data.userId, email: result.data.email, name: result.data.name });

        // Call optional onSuccess callback
        if (onSuccess) {
          onSuccess(result.data);
        }

        // Navigate to intended destination or stay on current page
        if (loginCallback && loginCallback.startsWith('navigate:')) {
          const path = loginCallback.replace('navigate:', '');
          dispatch(clearLoginCallback());
          navigate(path);
        }
      }
    } catch (error) {
      console.error('[Google Login] Error:', error);
      
      const errorMessage = error?.data?.message || 'Google login failed. Please try again.';
      
      // Call optional onError callback with error details
      if (onError) {
        onError(error);
      }
    }
  };

  const handleError = (error) => {
    // Log error to console for debugging
    console.error('Google login error:', error);
    
    // Handle user cancellation silently (no error message)
    // Only call onError callback for actual errors, not cancellations
    if (error && error !== 'popup_closed_by_user' && onError) {
      onError(error);
    }
  };

  return (
    // Full width so there is something to measure; the button itself is drawn
    // at the measured width and centred, never stretched.
    <div ref={holderRef} className="w-full flex justify-center">
      {width > 0 && (
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          useOneTap={useOneTap}
          theme={theme}
          size={size}
          text={text}
          shape={shape}
          width={width}
        />
      )}
    </div>
  );
}