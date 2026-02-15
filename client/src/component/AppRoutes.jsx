import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PageLoader } from "./layout/LoadingSpinner.jsx";

// Lazy load all page components
const HomePage = lazy(() => import("../pages/home/HomePage.jsx"));
const ContactPage = lazy(() => import("../pages/support/ContactPage.jsx"));
const AllProductsPage = lazy(() => import("../pages/shop/AllProductsPage.jsx"));
const CategoryProductsPage = lazy(() => import("../pages/shop/CategoryProductsPage.jsx"));
const ProductDetailPage = lazy(() => import("../pages/shop/ProductDetailPage.jsx"));
const CheckoutPage = lazy(() => import("../pages/CheckoutPage.jsx"));
const ProductDetails = lazy(() => import("../pages/shop/ProductDetails.jsx"));
const RegisterPage = lazy(() => import("../pages/account/RegisterPage.jsx"));
const MyProfilePage = lazy(() => import("../pages/account/MyProfilePage.jsx"));
const MyOrdersPage = lazy(() => import("../pages/account/MyOrdersPage.jsx"));
const WishlistPage = lazy(() => import("../pages/account/WishlistPage.jsx"));
const CustomerSupportPage = lazy(() => import("../pages/support/CustomerSupportPage.jsx"));
const RewardsPage = lazy(() => import("../pages/info/RewardsPage.jsx"));
const SettingsPage = lazy(() => import("../pages/account/SettingsPage.jsx"));
const TermsConditions = lazy(() => import("../pages/legal/TermsConditions.jsx"));
const CancellationPolicy = lazy(() => import("../pages/legal/CancellationPolicy.jsx"));
const PrivacyPolicy = lazy(() => import("../pages/legal/PrivacyPolicy.jsx"));
const Faq = lazy(() => import("../pages/support/Faq.jsx"));
const Return = lazy(() => import("../pages/legal/Return.jsx"));
const AboutPage = lazy(() => import("../pages/info/AboutPage.jsx"));
const WaitListMobile = lazy(() => import("../pages/WaitListMobile.jsx"));

// Admin pages
const AdminLoginPage = lazy(() => import("../admin/pages/AdminLoginPage.jsx"));
const AdminDashboardPage = lazy(() => import("../admin/pages/AdminDashboardPage.jsx"));
const JoinedWaitlistPage = lazy(() => import("../admin/pages/JoinedWaitlistPage.jsx"));
const AdminProductDetails = lazy(() => import("../admin/components/AdminProductDetailsUpdate.jsx"));
const AdminLayout = lazy(() => import("../admin/layout/AdminLayout.jsx"));
const AdminNFCPage = lazy(() => import("../admin/pages/AdminNFCPage.jsx"));

// NFC pages
const NfcHomePage = lazy(() => import("../nfc/pages/NfcHomePage.jsx"));

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
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

        {/* Admin panel routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="total-products" element={<AdminProductDetails />} />
          <Route path="joined-waitlist" element={<JoinedWaitlistPage />} />
          <Route path="login" element={<AdminLoginPage />} />
          <Route path="nfc" element={<AdminNFCPage />} />
        </Route>


        <Route path="/nfc">
          <Route path="home/:userId" element={<NfcHomePage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
