import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { ThemeProvider } from './component/ThemeProvider';
import AppRoutes from './component/AppRoutes';
import NewHeader from './component/layout/NewHeader';
import ApiDebugger from './component/ApiDebugger';
import { useCartSync } from './hooks/useCartSync';
import SocialMediaFAB from './component/WhatsAppButton';

// Component to handle cart sync
const CartSyncProvider = ({ children }) => {
  useCartSync();
  return children;
};

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <Router> 
          <CartSyncProvider>
            <NewHeader/>
            <AppRoutes />
            <SocialMediaFAB />
            <ApiDebugger />
          </CartSyncProvider>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
