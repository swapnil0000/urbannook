import { GoogleLogin } from '@react-oauth/google';
import { useGoogleLoginMutation } from '../../../store/api/authApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

export default function GoogleLoginButton({ 
  onSuccess, 
  onError, 
  useOneTap = true,
  theme = "outline",
  size = "large", 
  text = "continue_with",
  shape = "rectangular"
}) {
  const [googleLogin, { isLoading }] = useGoogleLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

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

        // Call optional onSuccess callback
        if (onSuccess) {
          onSuccess(result.data);
        }

        // Navigate to home page
        navigate('/');
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
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={handleError}
      useOneTap={useOneTap}
      theme={theme}
      size={size}
      text={text}
      shape={shape}
    />
  );
}