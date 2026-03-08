import { Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { logout } from '../store/slices/authSlice';

/**
 * ProtectedRoute Component
 * 
 * Protects routes that require authentication.
 * Redirects unauthenticated users to home page.
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

  if (!isActuallyAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
