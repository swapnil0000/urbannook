import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./component/ThemeProvider";
import NewHeader from "./component/layout/NewHeader";
import HomePage from "./pages/HomePage";
import ContactPage from "./pages/ContactPage";
import AllProductsPage from "./pages/AllProductsPage";
import CategoryProductsPage from "./pages/CategoryProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import ProductDetails from "./feature/product/component/ProductDetails";
import AboutPage from "./feature/product/component/AboutPage";
import CheckChanges from "./pages/CheckChanges";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <NewHeader />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about-us" element={<AboutPage />} />
          <Route path="/contact-us" element={<ContactPage />} />
          <Route path="/products" element={<AllProductsPage />} />
          <Route path="/product/:category" element={<CategoryProductsPage />} />
          <Route
            path="/product/:category/:slug"
            element={<ProductDetailPage />}
          />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/check-changes" element={<CheckChanges />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
