import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { store } from './store/store';
import NewHeader from './component/layout/NewHeader';
import Footer from './component/layout/Footer';
import Notification from './component/Notification';
import { useCartSync } from './hooks/useCartSync';
import { useWishlistSync } from './hooks/useWishlistSync';
import SocialMediaFAB from './component/layout/WhatsAppButton';
import AppRoutes from './store/AppRoutes';
import ErrorBoundary from './component/ErrorBoundary';
import { setCredentials } from './store/slices/authSlice';

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
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
              <ErrorBoundary>
                <Footer />
              </ErrorBoundary>
              <SocialMediaFAB />
              <Notification />
            </SyncProvider>
          </SessionManager>
        </Router>
    </Provider>
  );
}

export default App;
