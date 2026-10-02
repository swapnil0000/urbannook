import SEOHead from "../component/SEOHead";
import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import {
  HomePage,
  ContactPage,
  AllProductsPage,
  CategoryPage,
  CustomizePage,
  ProductDetailPage,
  ProductVariantsPage,
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
import PaymentProcessing from "../pages/PaymentProcessing.jsx";
import PaymentFailed from "../pages/PaymentFailed.jsx";
import OrderConfirm from "../pages/OrderConfirm.jsx";
import NotFound from "../pages/NotFound.jsx";
import ProtectedRoute from "../component/ProtectedRoute.jsx";

// Minimal loader for individual route transitions only
const MinimalLoader = () => (
  <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
    <div className="h-full bg-brand animate-pulse"></div>
  </div>
);

const AppRoutes = () => {
  return (
    <Routes>
      {/* HomePage loads immediately - no Suspense needed */}
      <Route path="/" element={<HomePage />} />
      <Route
        path="/about-us"
        element={
          <Suspense fallback={<MinimalLoader />}>
            <AboutPage />
          </Suspense>
        }
      />
      <Route
        path="/contact-us"
        element={
          <Suspense fallback={<MinimalLoader />}>
            <ContactPage />
          </Suspense>
        }
      />
      <Route
        path="/customize"
        element={
          <Suspense fallback={<MinimalLoader />}>
            <CustomizePage />
          </Suspense>
        }
      />
      <Route
        path="/products"
        element={
          <Suspense fallback={<MinimalLoader />}>
            <AllProductsPage />
          </Suspense>
        }
      />
      <Route
        path="/category/:slug"
        element={
          <Suspense fallback={<MinimalLoader />}>
            <CategoryPage />
          </Suspense>
        }
      />
      <Route
        path="/products/:productId"
        element={
          <Suspense fallback={<MinimalLoader />}>
            <ProductVariantsPage />
          </Suspense>
        }
      />
      <Route
        path="/product/:productId"
        element={
          <Suspense fallback={<MinimalLoader />}>
            <ProductDetailPage />
          </Suspense>
        }
      />
      <Route
        path="/product/:productId/:variantSku"
        element={
          <Suspense fallback={<MinimalLoader />}>
            <ProductDetailPage />
          </Suspense>
        }
      />
      <Route
        path="/checkout"
        element={
          <Suspense fallback={<MinimalLoader />}>
            <SEOHead noIndex />
            <CheckoutPage />
          </Suspense>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <SEOHead noIndex />
            <Suspense fallback={<MinimalLoader />}>
              <MyProfilePage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route path="/payment-processing/:orderId" element={<><SEOHead noIndex /><PaymentProcessing /></>} />
      <Route path="/order-confirm/:orderId" element={<><SEOHead noIndex /><OrderConfirm /></>} />
      <Route path="/payment-failed" element={<><SEOHead noIndex /><PaymentFailed /></>} />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <SEOHead noIndex />
            <Suspense fallback={<MinimalLoader />}>
              <MyOrdersPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/wishlist"
        element={
          <ProtectedRoute>
            <SEOHead noIndex />
            <Suspense fallback={<MinimalLoader />}>
              <WishlistPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer-support"
        element={
          <Suspense fallback={<MinimalLoader />}>
            <SEOHead title="Customer Support" description="Need help with an UrbanNook order? Contact our support team for orders, shipping, returns and payments." url="/customer-support" />
            <CustomerSupportPage />
          </Suspense>
        }
      />
      <Route
        path="/rewards"
        element={
          <Suspense fallback={<MinimalLoader />}>
            <SEOHead title="Rewards Program" description="Earn and redeem UrbanNook reward points on your orders of 3D-printed décor and desk accessories." url="/rewards" />
            <RewardsPage />
          </Suspense>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SEOHead noIndex />
            <Suspense fallback={<MinimalLoader />}>
              <SettingsPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/terms-conditions"
        element={
          <Suspense fallback={<MinimalLoader />}>
            <SEOHead title="Terms & Conditions" description="Terms and conditions for shopping at UrbanNook — orders, payments, shipping and use of the website." url="/terms-conditions" />
            <TermsConditions />
          </Suspense>
        }
      />
      {/* <Route
        path="/cancellation-refund"
        element={
          <Suspense fallback={<MinimalLoader />}>
            <CancellationPolicy />
          </Suspense>
        }
      /> */}
      <Route
        path="/privacy-policy"
        element={
          <Suspense fallback={<MinimalLoader />}>
            <SEOHead title="Privacy Policy" description="How UrbanNook collects, uses and protects your personal data when you shop with us." url="/privacy-policy" />
            <PrivacyPolicy />
          </Suspense>
        }
      />
      <Route
        path="/faqs"
        element={
          <Suspense fallback={<MinimalLoader />}>
            <Faq />
          </Suspense>
        }
      />
      <Route
        path="/return-policy"
        element={
          <Suspense fallback={<MinimalLoader />}>
            <SEOHead title="Return & Replacement Policy" description="UrbanNook return and replacement policy — eligibility, timelines and how to raise a request." url="/return-policy" />
            <Return />
          </Suspense>
        }
      />
      {/* Legacy NFC tag links: the NFC page was removed but printed tags may still
          point here — keep sending them to home rather than the 404 page. */}
      <Route path="/nfc/*" element={<Navigate to="/" replace />} />
      {/* Catch-all: real not-found page (noindex) instead of a soft-404 redirect to home */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
