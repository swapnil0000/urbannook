import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { useEffect, lazy, Suspense } from 'react';
import { useDispatch } from 'react-redux';
import { store } from './store/store';
import { useCartSync } from './hooks/useCartSync';
import { useWishlistSync } from './hooks/useWishlistSync';
import ErrorBoundary from './component/ErrorBoundary';
import { setCredentials, logout } from './store/slices/authSlice';
import { fetchCsrfToken } from './store/api/apiSlice';
// Import AppRoutes directly instead of lazy loading for faster initial render
import AppRoutes from './store/AppRoutes';
import NewsTicker from './pages/home/NewsTicker';

// Only lazy load non-critical components
const NewHeader = lazy(() => import('./component/layout/NewHeader'));
const Footer = lazy(() => import('./component/layout/Footer'));
const Notification = lazy(() => import('./component/Notification'));
const SocialMediaFAB = lazy(() => import('./component/layout/WhatsAppButton'));
const OpenInBrowserBanner = lazy(() => import('./component/OpenInBrowserBanner'));

// Component to handle session restoration and token removal detection
const SessionManager = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Check for existing session on app load
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        // Restore session in Redux
        dispatch(setCredentials({ user, token }));
        
        // Fetch CSRF token for authenticated user
        fetchCsrfToken().catch(err => {
          console.warn('[CSRF] Failed to fetch token on session restore:', err);
        });
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
      }
    }

    // Listen for manual token removal (storage events from same tab or other tabs)
    const handleStorageChange = (e) => {
      // Detect when authToken is removed
      if (e.key === 'authToken' && e.newValue === null) {
        console.log('[Auth] Token removed - logging out');
        dispatch(logout());
      }
      // Detect when user is removed
      if (e.key === 'user' && e.newValue === null) {
        console.log('[Auth] User data removed - logging out');
        dispatch(logout());
      }
    };

    // Periodic check for token removal (catches manual deletion in same tab)
    const checkAuthInterval = setInterval(() => {
      const currentToken = localStorage.getItem('authToken');
      const currentUser = localStorage.getItem('user');
      const reduxState = store.getState().auth;
      
      // If Redux thinks we're authenticated but tokens are missing, force logout
      if (reduxState.isAuthenticated && (!currentToken || !currentUser)) {
        console.log('[Auth] Token mismatch detected - forcing logout');
        dispatch(logout());
      }
    }, 1000); // Check every second

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(checkAuthInterval);
    };
  }, [dispatch]);

  return children;
};

// Component to handle cart and wishlist sync
const SyncProvider = ({ children }) => {
  useCartSync();
  useWishlistSync();
  return children;
};

function App() {
  return (
    <Provider store={store}>
        <Router> 
          <SessionManager>
            <SyncProvider>
              <Suspense fallback={null}>
                <OpenInBrowserBanner />
              </Suspense>
              <ErrorBoundary>
                <div style={{display:'flex',flexDirection:'column'}}>
                <NewsTicker/>
                <NewHeader/>
                </div>
              </ErrorBoundary>
              {/* AppRoutes loaded immediately - no lazy loading for critical routing */}
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
              {/* Only non-critical components are lazy loaded */}
              <Suspense fallback={null}>
                <ErrorBoundary>
                  <Footer />
                </ErrorBoundary>
                <SocialMediaFAB />
                <Notification />
              </Suspense>
            </SyncProvider>
          </SessionManager>
        </Router>
    </Provider>
  );
}

export default App;
