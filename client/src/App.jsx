import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { ThemeProvider } from './component/ThemeProvider';
import AppRoutes from './component/AppRoutes';
import NewHeader from './component/layout/NewHeader';
import ApiDebugger from './component/ApiDebugger';

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <Router> 
          <NewHeader/>
          <AppRoutes />
          {/* <WhatsAppButton /> */}
          <ApiDebugger />
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
