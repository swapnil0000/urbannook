import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { PageLoader } from "../component/layout/LoadingSpinner.jsx";
import {
  HomePage,
  ContactPage,
  AllProductsPage,
  CategoryProductsPage,
  ProductDetailPage,
  CheckoutPage,
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

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about-us" element={<AboutPage />} />
        <Route path="/contact-us" element={<ContactPage />} />
        <Route path="/products" element={<AllProductsPage />} />
        <Route path="/product/:productId" element={<ProductDetailPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/profile" element={<MyProfilePage />} />
        <Route path="/orders" element={<MyOrdersPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/customer-support" element={<CustomerSupportPage />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/terms-conditions" element={<TermsConditions />} />
        <Route path="/cancellation-refund" element={<CancellationPolicy />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/faqs" element={<Faq />} />
        <Route path="/return-policy" element={<Return />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
