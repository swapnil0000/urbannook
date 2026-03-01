import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import {
  HomePage,
  ContactPage,
  AllProductsPage,
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

// Minimal loader for individual route transitions only
const MinimalLoader = () => (
  <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
    <div className="h-full bg-[#a89068] animate-pulse"></div>
  </div>
);

const AppRoutes = () => {
  return (
    <Routes>
      {/* HomePage loads immediately - no Suspense needed */}
      <Route path="/" element={<HomePage />} />
      <Route path="/about-us" element={
        <Suspense fallback={<MinimalLoader />}>
          <AboutPage />
        </Suspense>
      } />
      <Route path="/contact-us" element={
        <Suspense fallback={<MinimalLoader />}>
          <ContactPage />
        </Suspense>
      } />
      <Route path="/products" element={
        <Suspense fallback={<MinimalLoader />}>
          <AllProductsPage />
        </Suspense>
      } />
      <Route path="/product/:productId" element={
        <Suspense fallback={<MinimalLoader />}>
          <ProductDetailPage />
        </Suspense>
      } />
      <Route path="/checkout" element={
        <Suspense fallback={<MinimalLoader />}>
          <CheckoutPage />
        </Suspense>
      } />
      <Route path="/profile" element={
        <Suspense fallback={<MinimalLoader />}>
          <MyProfilePage />
        </Suspense>
      } />
      <Route path="/orders" element={
        <Suspense fallback={<MinimalLoader />}>
          <MyOrdersPage />
        </Suspense>
      } />
      <Route path="/wishlist" element={
        <Suspense fallback={<MinimalLoader />}>
          <WishlistPage />
        </Suspense>
      } />
      <Route path="/customer-support" element={
        <Suspense fallback={<MinimalLoader />}>
          <CustomerSupportPage />
        </Suspense>
      } />
      <Route path="/rewards" element={
        <Suspense fallback={<MinimalLoader />}>
          <RewardsPage />
        </Suspense>
      } />
      <Route path="/settings" element={
        <Suspense fallback={<MinimalLoader />}>
          <SettingsPage />
        </Suspense>
      } />
      <Route path="/terms-conditions" element={
        <Suspense fallback={<MinimalLoader />}>
          <TermsConditions />
        </Suspense>
      } />
      <Route path="/cancellation-refund" element={
        <Suspense fallback={<MinimalLoader />}>
          <CancellationPolicy />
        </Suspense>
      } />
      <Route path="/privacy-policy" element={
        <Suspense fallback={<MinimalLoader />}>
          <PrivacyPolicy />
        </Suspense>
      } />
      <Route path="/faqs" element={
        <Suspense fallback={<MinimalLoader />}>
          <Faq />
        </Suspense>
      } />
      <Route path="/return-policy" element={
        <Suspense fallback={<MinimalLoader />}>
          <Return />
        </Suspense>
      } />
    </Routes>
  );
};

export default AppRoutes;
