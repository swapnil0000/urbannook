import { useGoogleOneTapLogin } from '@react-oauth/google';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useGoogleLoginMutation } from '../store/api/authApi';
import { setCredentials } from '../store/slices/authSlice';
import { fetchCsrfToken } from '../store/api/apiSlice';
import { trackLogin } from '../utils/analytics';
import { isGoogleAuthSupported } from '../utils/browserEnv';

const SUPPRESSED_PREFIXES = ['/checkout', '/admin', '/login', '/register', '/reset-password'];

export default function GoogleOneTap() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [googleLogin] = useGoogleLoginMutation();

  const suppressed = SUPPRESSED_PREFIXES.some((p) => location.pathname.startsWith(p));
  // In Instagram/Facebook in-app browsers Google One Tap can't render and Google
  // blocks OAuth — don't even attempt it there (OTP login is the path for that traffic).
  const disabled = isAuthenticated || suppressed || !isGoogleAuthSupported();

  useGoogleOneTapLogin({
    disabled,
    use_fedcm_for_prompt: true, // required by recent Chrome; without it One Tap won't render
    onSuccess: async (credentialResponse) => {
      try {
        const result = await googleLogin({ credential: credentialResponse.credential }).unwrap();
        if (result?.success && result.data) {
          dispatch(setCredentials({
            user: {
              email: result.data.email,
              name: result.data.name,
              role: result.data.role,
              userId: result.data.userId,
            },
            token: result.data.userAccessToken,
          }));
          // Feeds Meta Advanced Matching (email + name) for ALL subsequent browser events.
          trackLogin({
            method: 'google_one_tap',
            userId: result.data.userId,
            email: result.data.email,
            name: result.data.name,
          });
          fetchCsrfToken().catch(() => {});
        }
      } catch (err) {
        console.error('[Google One Tap] login failed:', err);
      }
    },
    onError: () => {
      // User dismissed the prompt or has no Google session — stay silent.
    },
  });

  return null;
}
