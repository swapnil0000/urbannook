import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './component/ThemeProvider';
import NewHeader from './component/layout/NewHeader';
import HomePage from './pages/HomePage';
import ProductDetails from './feature/product/component/ProductDetails';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <NewHeader />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:id" element={<ProductDetails />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App
