import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { useEffect, useRef, lazy, Suspense } from 'react';
import { useDispatch } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { store } from './store/store';
import { useCartSync } from './hooks/useCartSync';
import { useWishlistSync } from './hooks/useWishlistSync';
import ErrorBoundary from './component/ErrorBoundary';
import { setCredentials, logout } from './store/slices/authSlice';
import { fetchCsrfToken } from './store/api/apiSlice';
import AppRoutes from './store/AppRoutes';
import NewsTicker from './pages/home/NewsTicker';
import SEOHead from './component/SEOHead';
import { trackPageView, setUserId, captureAttribution, setMetaAdvancedMatching } from './utils/analytics';
// check
const ORG_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'UrbanNook',
  url: 'https://www.urbannook.in',
  logo: 'https://www.urbannook.in/assets/logo_with_text.webp',
  sameAs: [
    'https://www.instagram.com/urbannook.store',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+91-82996-38749',
    contactType: 'customer service',
    areaServed: 'IN',
    availableLanguage: ['English', 'Hindi'],
  },
};

// Only lazy load non-critical components
const NewHeader = lazy(() => import('./component/layout/NewHeader'));
const Footer = lazy(() => import('./component/layout/Footer'));
const Notification = lazy(() => import('./component/Notification'));
const SocialMediaFAB = lazy(() => import('./component/layout/WhatsAppButton'));
const OpenInBrowserBanner = lazy(() => import('./component/OpenInBrowserBanner'));
const GoogleOneTap = lazy(() => import('./component/GoogleOneTap'));

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

        // Stitch identity into analytics (GA4 user_id) on session restore
        setUserId(user?.userId || user?.id || user?._id);
        // Feed Meta Advanced Matching (email/phone/name) for all browser events
        setMetaAdvancedMatching({
          email: user?.email,
          phone: user?.mobile,
          firstName: user?.name ? user.name.split(' ')[0] : undefined,
          lastName: user?.name ? user.name.split(' ').slice(1).join(' ') : undefined,
          userId: user?.userId || user?.id || user?._id,
        });
        
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

// Fires a GA4 page_view on every SPA route change and locks first-touch
// attribution (utm/gclid/fbclid) before the landing query string is lost.
const RouteTracker = () => {
  const location = useLocation();
  const firstLoad = useRef(true);

  // Capture first-touch UTMs immediately, before any client-side navigation wipes them.
  useEffect(() => {
    captureAttribution();
  }, []);

  useEffect(() => {
    // The on-page Google tag already counts the landing page_view, so skip the
    // initial mount and only fire on subsequent SPA navigations (avoids double-count).
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    trackPageView({ pagePath: location.pathname + location.search });
  }, [location.pathname, location.search]);

  return null;
};

// Component to handle cart and wishlist sync
const SyncProvider = ({ children }) => {
  useCartSync();
  useWishlistSync();
  return children;
};

function App() {
  useEffect(() => {
    console.log("%c URBAN NOOK CLIENT ACTIVE - VERSION 2.1.1 (STRICT VARIANT) ", "background: #2e443c; color: #F5DEB3; font-weight: bold; font-size: 14px; padding: 10px; border-radius: 5px;");
  }, []);

  return (
    <HelmetProvider>
    <Provider store={store}>
        <Router> 
          <SEOHead structuredData={ORG_STRUCTURED_DATA} />
          <RouteTracker />
          <SessionManager>
            <SyncProvider>
              <ErrorBoundary>
                <NewsTicker/>
                <NewHeader/>
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
                {/* Global Google One Tap for logged-out visitors (boosts Meta EMQ) */}
                <ErrorBoundary>
                  <GoogleOneTap />
                </ErrorBoundary>
              </Suspense>
            </SyncProvider>
          </SessionManager>
        </Router>
    </Provider>
    </HelmetProvider>
  );
}

export default App;


// trigger build