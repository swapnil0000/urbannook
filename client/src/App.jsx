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

// Lazy load components
const Footer = lazy(() => import('./component/layout/Footer'));
const Notification = lazy(() => import('./component/Notification'));
const SocialMediaFAB = lazy(() => import('./component/layout/WhatsAppButton'));
const AppRoutes = lazy(() => import('./store/AppRoutes'));

// Helper function to get cookie
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

// Component to handle session restoration
const SessionManager = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Check for existing session on app load
    const token = getCookie('userAccessToken') || localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        // Restore session in Redux
        dispatch(setCredentials({ user, token }));
      } catch (error) {
        console.error('Failed to restore session:', error);
        // Clear invalid data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
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
              <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#2e443c]">
                  <div className="w-8 h-8 border-2 border-[#a89068] border-t-transparent rounded-full animate-spin"></div>
                </div>
              }>
                <ErrorBoundary>
                  <AppRoutes />
                </ErrorBoundary>
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
