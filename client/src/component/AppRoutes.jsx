import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import ContactPage from '../pages/ContactPage';
import AllProductsPage from '../pages/AllProductsPage';
import CategoryProductsPage from '../pages/CategoryProductsPage';
import ProductDetailPage from '../pages/ProductDetailPage';
import CheckoutPage from '../pages/CheckoutPage';
import ProductDetails from '../feature/product/component/ProductDetails';
import AboutPage from '../feature/product/component/AboutPage';
import RegisterPage from '../pages/RegisterPage';
import MyProfilePage from '../pages/MyProfilePage';
import MyOrdersPage from '../pages/MyOrdersPage';
import WishlistPage from '../pages/WishlistPage';
import CustomerSupportPage from '../pages/CustomerSupportPage';
import RewardsPage from '../pages/RewardsPage';
import SettingsPage from '../pages/SettingsPage';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about-us" element={<AboutPage />} />
      <Route path="/contact-us" element={<ContactPage />} />
      <Route path="/products" element={<AllProductsPage />} />
      <Route path="/product/:category" element={<CategoryProductsPage />} />
      <Route path="/product/:category/:slug" element={<ProductDetailPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/product/:id" element={<ProductDetails />} />
      <Route path="/my-profile" element={<MyProfilePage />} />
      <Route path="/my-orders" element={<MyOrdersPage />} />
      <Route path="/wishlist" element={<WishlistPage />} />
      <Route path="/customer-support" element={<CustomerSupportPage />} />
      <Route path="/rewards" element={<RewardsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
};

export default AppRoutes;