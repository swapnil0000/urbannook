import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import NewHeader from './component/layout/NewHeader';
import Footer from './component/layout/Footer';
import Notification from './component/Notification';
import { useCartSync } from './hooks/useCartSync';
import { useWishlistSync } from './hooks/useWishlistSync';
import SocialMediaFAB from './component/layout/WhatsAppButton';
import AppRoutes from './store/AppRoutes';

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
          <SyncProvider>
            <NewHeader/>
            <AppRoutes />
            <Footer />
            <SocialMediaFAB />
            <Notification />
          </SyncProvider>
        </Router>
    </Provider>
  );
}

export default App;
