import { Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { logout } from '../store/slices/authSlice';
import { setShowLoginModal, setLoginCallback } from '../store/slices/uiSlice';

/**
 * ProtectedRoute Component
 *
 * Protects routes that require authentication.
 * If the user is NOT logged in, we open the login modal and remember where they
 * were headed (e.g. "Track Order" → /orders) so they land back there after login,
 * instead of silently bouncing to the home page.
 *
 * Authentication checks:
 * 1. Synchronously validates actual token presence in localStorage
 * 2. Validates Redux auth state (isAuthenticated)
 * 3. Forces logout if mismatch detected between Redux and localStorage
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  // CRITICAL: Synchronous validation of actual token presence
  const authToken = localStorage.getItem('authToken');
  const userToken = localStorage.getItem('user');

  // Detect mismatch: Redux thinks authenticated but tokens are missing
  const hasMismatch = isAuthenticated && (!authToken || !userToken);

  // Force immediate logout if mismatch detected
  useEffect(() => {
    if (hasMismatch) {
      console.log('[ProtectedRoute] Auth mismatch detected - forcing logout');
      dispatch(logout());
    }
  }, [hasMismatch, dispatch]);

  // Final validation: Both Redux state AND actual tokens must be present
  const isActuallyAuthenticated = isAuthenticated && authToken && userToken;

  // Not logged in → prompt login (modal) and remember the intended destination so
  // LoginForm's `navigate:<path>` callback returns the user here after they sign in.
  useEffect(() => {
    if (!isActuallyAuthenticated) {
      dispatch(setLoginCallback(`navigate:${location.pathname}${location.search}`));
      dispatch(setShowLoginModal(true));
    }
  }, [isActuallyAuthenticated, location.pathname, location.search, dispatch]);

  if (!isActuallyAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
