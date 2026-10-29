import { lazyWithPreload } from '../utils/lazyWithPreload';

// Lazy too: it carries the `motion` library, which used to make the main bundle
// heavy for every page. On "/" main.jsx preloads it before hydrating, and the
// SSG HTML is already on screen, so the home page doesn't wait on it.
export const HomePage = lazyWithPreload(() => import("./home/HomePage.jsx"));

// Keep other pages lazy loaded
export const CheckoutPage = lazyWithPreload(() => import("../pages/CheckoutPage"));
export const MyOrdersPage = lazyWithPreload(() => import("./account/MyOrdersPage.jsx"));
export const WishlistPage = lazyWithPreload(() => import("./account/WishlistPage.jsx"));
export const RewardsPage = lazyWithPreload(() => import("./info/RewardsPage.jsx"));
export const SettingsPage = lazyWithPreload(() => import("./account/SettingsPage.jsx"));
export const TermsConditions = lazyWithPreload(() => import("./legal/TermsCondition.jsx"));
export const CancellationPolicy = lazyWithPreload(() => import("./legal/CancellationPolicy.jsx"));
export const PrivacyPolicy = lazyWithPreload(() => import("./legal/PrivacyPolicy.jsx"));
export const Faq = lazyWithPreload(() => import("./support/Faqs.jsx"));
export const Return = lazyWithPreload(() => import("./legal/Return.jsx"));
export const ContactPage = lazyWithPreload(() => import("./support/ContactPage.jsx"));
export const CustomizePage = lazyWithPreload(() => import("./support/CustomizePage.jsx"));
export const AllProductsPage = lazyWithPreload(() => import("./shop/AllProductsPage.jsx"));
export const CategoryPage = lazyWithPreload(() => import("./shop/CategoryPage.jsx"));
export const ProductDetailPage = lazyWithPreload(() => import("./shop/ProductDetailPage.jsx"));
export const ProductVariantsPage = lazyWithPreload(() => import("./shop/ProductVariantsPage.jsx"));
export const MyProfilePage = lazyWithPreload(() => import("./account/MyProfilePage.jsx"));
export const CustomerSupportPage = lazyWithPreload(() => import("./support/CustomerSupportPage.jsx"));
export const AboutPage = lazyWithPreload(() => import("./info/AboutPage.jsx"));
export const BlogListPage = lazyWithPreload(() => import("./blog/BlogListPage.jsx"));
export const BlogPostPage = lazyWithPreload(() => import("./blog/BlogPostPage.jsx"));

// Chunks the current URL needs, loaded before hydration (main.jsx) so a
// server-rendered page never falls back to its loader. See utils/lazyWithPreload.js.
const ROUTE_PAGES = [
  [/^\/?$/, HomePage],
  [/^\/product\/[^/]+(\/[^/]+)?\/?$/, ProductDetailPage],
  [/^\/products\/[^/]+\/?$/, ProductVariantsPage],
  [/^\/products\/?$/, AllProductsPage],
  [/^\/category\/[^/]+\/?$/, CategoryPage],
  [/^\/blog\/?$/, BlogListPage],
  [/^\/blog\/[^/]+\/?$/, BlogPostPage],
  [/^\/about-us\/?$/, AboutPage],
  [/^\/contact-us\/?$/, ContactPage],
  [/^\/customize\/?$/, CustomizePage],
  [/^\/faqs\/?$/, Faq],
  [/^\/customer-support\/?$/, CustomerSupportPage],
  [/^\/rewards\/?$/, RewardsPage],
  [/^\/terms-conditions\/?$/, TermsConditions],
  [/^\/privacy-policy\/?$/, PrivacyPolicy],
  [/^\/return-policy\/?$/, Return],
];

export function preloadPageForPath(pathname) {
  const hit = ROUTE_PAGES.find(([re]) => re.test(pathname));
  return hit ? hit[1].preload() : Promise.resolve();
}
