import { Routes, Route, Navigate } from "react-router-dom";
import {
  HomePage,
  ContactPage,
  AllProductsPage,
  CategoryProductsPage,
  ProductDetailPage,
  CheckoutPage,
  ProductDetails,
  RegisterPage,
  MyProfilePage,
  MyOrdersPage,
  WishlistPage,
  CustomerSupportPage,
  RewardsPage,
  SettingsPage,
  TermsConditions,
  CancellationPolicy,
  PrivacyPolicy,
  Faq,
  Return,
  AboutPage,
} from "../pages/index.js";
import WaitListMobile from "../pages/WaitListMobile.jsx";

const AppRoutes = () => {
  return (
    <Routes>
      {/* <Route path="/" element={<HomePage />} /> */}
       <Route path="/" element={<Navigate to="/wait-list" replace />} />
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
      <Route path="/terms-conditions" element={<TermsConditions />} />
      <Route path="/cancellation-refund" element={<CancellationPolicy />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/faqs" element={<Faq />} />
      <Route path="/return-policy" element={<Return />} />
      <Route path="/wait-list" element={<WaitListMobile />} />
      <Route path="*" element={<Navigate to="/wait-list" replace />} />
    </Routes>
  );
};

export default AppRoutes;
