
import { ThemeProvider } from './component/ThemeProvider';
import NewHeader from './component/layout/NewHeader';
import NewBanner from './component/layout/NewBanner';
import LoginForm from './component/layout/LoginForm';
import SignupForm from './component/layout/SignupForm';
import HomePage from './pages/HomePage';

function App() {
  // const [showLogin, setShowLogin] = useState(false);
  // const [showSignup, setShowSignup] = useState(false);

  return (
    
    <ThemeProvider>
      <NewHeader />
      <HomePage/>
      {/* <div className="min-h-screen bg-bgPrimary">
        <NewHeader />
        <NewBanner />
        
        {showLogin && (
          <LoginForm 
            onClose={() => setShowLogin(false)}
            onSwitchToSignup={() => {
              setShowLogin(false);
              setShowSignup(true);
            }}
          />
        )}
        
        {showSignup && (
          <SignupForm 
            onClose={() => setShowSignup(false)}
            onSwitchToLogin={() => {
              setShowSignup(false);
              setShowLogin(true);
            }}
          />
        )}
      </div> */}
    </ThemeProvider>
  );
}

export default App
