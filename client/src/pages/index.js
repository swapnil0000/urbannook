import { matchPath } from 'react-router-dom';
import { lazyWithPreload as lazy } from '../utils/lazyWithPreload.jsx';

// Import HomePage directly for instant loading
export { default as HomePage } from "./home/HomePage.jsx";

// Other pages are lazy chunks, preloadable (utils/lazyWithPreload.jsx)
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
export const CustomizePage = lazy(() => import("./support/CustomizePage.jsx"));
export const AllProductsPage = lazy(() => import("./shop/AllProductsPage.jsx"));
export const CategoryPage = lazy(() => import("./shop/CategoryPage.jsx"));
export const ProductDetailPage = lazy(() => import("./shop/ProductDetailPage.jsx"));
export const ProductVariantsPage = lazy(() => import("./shop/ProductVariantsPage.jsx"));
export const MyProfilePage = lazy(() => import("./account/MyProfilePage.jsx"));
export const CustomerSupportPage = lazy(() => import("./support/CustomerSupportPage.jsx"));
export const AboutPage = lazy(() => import("./info/AboutPage.jsx"));
export const BlogListPage = lazy(() => import("./blog/BlogListPage.jsx"));
export const BlogPostPage = lazy(() => import("./blog/BlogPostPage.jsx"));

// Server-rendered routes → their page chunk. main.jsx loads it before hydrating, so the page
// never suspends during hydration (see utils/lazyWithPreload.jsx). Every AppRoutes path that
// entry-server.jsx renders (i.e. not in its CLIENT_ONLY list).
const SSR_PAGES = [
  ['/blog', BlogListPage], ['/blog/:slug', BlogPostPage], ['/about-us', AboutPage],
  ['/contact-us', ContactPage], ['/customize', CustomizePage], ['/products', AllProductsPage],
  ['/category/:slug', CategoryPage], ['/products/:productId', ProductVariantsPage],
  ['/product/:productId', ProductDetailPage], ['/product/:productId/:variantSku', ProductDetailPage],
  ['/terms-conditions', TermsConditions], ['/cancellation-refund', CancellationPolicy],
  ['/privacy-policy', PrivacyPolicy], ['/faqs', Faq], ['/return-policy', Return],
  ['/customer-support', CustomerSupportPage], ['/rewards', RewardsPage],
];

/** Load the chunk of the page at this path (if it is a lazy page). Never rejects. */
export function preloadPageFor(pathname) {
  const hit = SSR_PAGES.find(([path]) => matchPath({ path, end: true }, pathname));
  return hit ? hit[1].preload().catch(() => {}) : Promise.resolve();
}
