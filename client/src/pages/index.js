import { lazy } from 'react';

// Import HomePage directly for instant loading
export { default as HomePage } from "./home/HomePage.jsx";

// Keep other pages lazy loaded
export const CheckoutPage = lazy(() => import("../pages/CheckoutPage"));
export const MyOrdersPage = lazy(() => import("./account/MyOrdersPage.jsx"));
export const WishlistPage = lazy(() => import("./account/WishlistPage.jsx"));
export const RewardsPage = lazy(() => import("./info/RewardsPage.jsx"));
export const SettingsPage = lazy(() => import("./account/SettingsPage.jsx"));
export const TermsConditions = lazy(() => import("./legal/TermsCondition.jsx"));
export const CancellationPolicy = lazy(() => import("./legal/CancellationPolicy.jsx"));
export const PrivacyPolicy = lazy(() => import("./legal/PrivacyPolicy.jsx"));
export const Faq = lazy(() => import("./support/Faqs.jsx"));
export const Return = lazy(() => import("./legal/Return.jsx"));
export const ContactPage = lazy(() => import("./support/ContactPage.jsx"));
export const AllProductsPage = lazy(() => import("./shop/AllProductsPage.jsx"));
export const ProductDetailPage = lazy(() => import("./shop/ProductDetailPage.jsx"));
export const MyProfilePage = lazy(() => import("./account/MyProfilePage.jsx"));
export const CustomerSupportPage = lazy(() => import("./support/CustomerSupportPage.jsx"));
export const AboutPage = lazy(() => import("./info/AboutPage.jsx"));
