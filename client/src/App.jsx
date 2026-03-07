import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { useEffect, lazy, Suspense } from 'react';
import { useDispatch } from 'react-redux';
import { store } from './store/store';
import NewHeader from './component/layout/NewHeader';
import { useCartSync } from './hooks/useCartSync';
import { useWishlistSync } from './hooks/useWishlistSync';
import ErrorBoundary from './component/ErrorBoundary';
import { setCredentials } from './store/slices/authSlice';
import { fetchCsrfToken } from './store/api/apiSlice';
// Import AppRoutes directly instead of lazy loading for faster initial render
import AppRoutes from './store/AppRoutes';

// Only lazy load non-critical components
const Footer = lazy(() => import('./component/layout/Footer'));
const Notification = lazy(() => import('./component/Notification'));
const SocialMediaFAB = lazy(() => import('./component/layout/WhatsAppButton'));

// Component to handle session restoration
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
              <ErrorBoundary>
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
              </Suspense>
            </SyncProvider>
          </SessionManager>
        </Router>
    </Provider>
  );
}

export default App;
