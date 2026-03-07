import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * ProtectedRoute Component
 * 
 * Protects routes that require authentication.
 * Redirects unauthenticated users to home page.
 * 
 * Authentication checks:
 * 1. Redux auth state (isAuthenticated)
 * 2. localStorage fallback (authToken) — covers the brief window before SessionManager runs
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Fallback: check localStorage in case Redux hasn't been hydrated yet
  const hasLocalToken = !!localStorage.getItem('authToken');

  const isLoggedIn = isAuthenticated || hasLocalToken;

  if (!isLoggedIn) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
