import { useLocation } from 'react-router-dom';
import { Provider, useStore } from 'react-redux';
import { useEffect, useRef, lazy, Suspense } from 'react';
import { useDispatch } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { store as browserStore } from './store/store';
import { restoreGuestCart } from './store/slices/cartSlice';
import { useCartSync } from './hooks/useCartSync';
import { useWishlistSync } from './hooks/useWishlistSync';
import { useScrollRestoration } from './hooks/useScrollRestoration';
import ErrorBoundary from './component/ErrorBoundary';
import { setCredentials, logout } from './store/slices/authSlice';
import { fetchCsrfToken } from './store/api/apiSlice';
import AppRoutes from './store/AppRoutes';
import SeoPageContent from './component/SeoPageContent';
import NewsTicker from './pages/home/NewsTicker';
import FestiveEffects from './component/festive/FestiveEffects';
import { SiteCampaignProvider } from './hooks/useSiteCampaign';
import { trackPageView, setUserId, captureAttribution, setMetaAdvancedMatching } from './utils/analytics';
import MotionLayer from './component/MotionLayer';
import SmoothScroll from './component/motion/SmoothScroll';
import { lazyWithPreload } from './utils/lazyWithPreload';

// Only lazy load non-critical components
// Header and footer are in every server-rendered page: preloaded before
// hydration (main.jsx) so they never drop back to their fallback.
export const NewHeader = lazyWithPreload(() => import('./component/layout/NewHeader'));
export const Footer = lazyWithPreload(() => import('./component/layout/Footer'));
const Notification = lazy(() => import('./component/Notification'));
const GlMobileNav = lazy(() => import('./component/layout/GlMobileNav'));
const OpenInBrowserBanner = lazy(() => import('./component/OpenInBrowserBanner'));
const GoogleOneTap = lazy(() => import('./component/GoogleOneTap'));
// SiteOfferPopup (₹100 off + lead capture) is retired — the store now runs free
// shipping instead. The component is kept for future campaigns; re-add its lazy
// import and the <SiteOfferPopup /> mount below to bring it back.
// Free-shipping announcement in the same slot and style; admin-controlled.
const FreeShippingPopup = lazy(() => import('./component/FreeShippingPopup'));
// Live-offers carousel (centered on desktop, bottom sheet on mobile), once per session.
const OffersPopup = lazy(() => import('./component/offers/OffersPopup'));
// Floating "Help" button → Help & Support panel (WhatsApp + FAQs).
const HelpWidget = lazy(() => import('./component/support/HelpWidget'));
const PasskeyPrompt = lazy(() => import('./component/PasskeyPrompt'));
// Smart combo/upsell bottom sheet (Promotion V2) — watches the cart from the
// app root so it fires on an add from ANY surface (PDP, cart drawer, etc.),
// not just one page. See the component's own header comment for the full
// trigger/dismissal contract.
const PromotionUnlockSheet = lazy(() => import('./component/promotions/PromotionUnlockSheet'));
const GiftClaimWatcher = lazy(() => import('./component/promotions/GiftClaimWatcher'));
const WhatsAppLoginWatcher = lazy(() => import('./component/layout/auth/WhatsAppLoginWatcher'));
const WhatsAppOneTap = lazy(() => import('./component/layout/auth/WhatsAppOneTap'));

// Component to handle session restoration and token removal detection
const SessionManager = ({ children }) => {
  const dispatch = useDispatch();
  const store = useStore();

  useEffect(() => {
    // A server-rendered page starts as a guest with an empty cart (the server
    // has no localStorage); load this browser's guest cart now.
    dispatch(restoreGuestCart());

    // Check for existing session on app load
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        // Restore session in Redux
        dispatch(setCredentials({ user, token }));

        // Stitch identity into analytics (GA4 user_id) on session restore
        setUserId(user?.userId || user?.id || user?._id);
        // Feed Meta Advanced Matching (email/phone/name) for all browser events
        setMetaAdvancedMatching({
          email: user?.email,
          phone: user?.mobile,
          firstName: user?.name ? user.name.split(' ')[0] : undefined,
          lastName: user?.name ? user.name.split(' ').slice(1).join(' ') : undefined,
          userId: user?.userId || user?.id || user?._id,
        });
        
        // Fetch CSRF token for authenticated user
        fetchCsrfToken().catch(err => {
          console.warn('[CSRF] Failed to fetch token on session restore:', err);
        });
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
      }
    }

    const handleStorageChange = (e) => {
      // Detect when authToken is removed
      if (e.key === 'authToken' && e.newValue === null) {
        console.log('[Auth] Token removed - logging out');
        dispatch(logout());
      }
      // Detect when user is removed
      if (e.key === 'user' && e.newValue === null) {
        console.log('[Auth] User data removed - logging out');
        dispatch(logout());
      }
    };

    // Catches the token being deleted by hand in this tab (DevTools). Every
    // logout path in the code dispatches logout() itself, and other tabs fire
    // 'storage', so checking when the tab regains focus is enough — it used to
    // poll localStorage every second, which ran during taps and scrolls.
    const checkAuth = () => {
      if (document.visibilityState === 'hidden') return;
      const currentToken = localStorage.getItem('authToken');
      const currentUser = localStorage.getItem('user');
      const reduxState = store.getState().auth;

      // If Redux thinks we're authenticated but tokens are missing, force logout
      if (reduxState.isAuthenticated && (!currentToken || !currentUser)) {
        console.log('[Auth] Token mismatch detected - forcing logout');
        dispatch(logout());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', checkAuth);
    document.addEventListener('visibilitychange', checkAuth);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', checkAuth);
      document.removeEventListener('visibilitychange', checkAuth);
    };
  }, [dispatch, store]);

  return children;
};

// Fires a GA4 page_view on every SPA route change and locks first-touch
// attribution (utm/gclid/fbclid) before the landing query string is lost.
// Scroll-position restoration on back/forward navigation is a separate
// concern, owned entirely by useScrollRestoration (hooks/useScrollRestoration.js).
const RouteTracker = () => {
  const location = useLocation();
  const firstLoad = useRef(true);

  useScrollRestoration();

  // Capture first-touch UTMs immediately, before any client-side navigation wipes them.
  useEffect(() => {
    captureAttribution();
  }, []);

  useEffect(() => {
    // The on-page Google tag already counts the landing page_view, so skip the
    // initial mount and only fire on subsequent SPA navigations (avoids double-count).
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    trackPageView({ pagePath: location.pathname + location.search });
  }, [location.pathname, location.search]);

  return null;
};

// Component to handle cart and wishlist sync
const SyncProvider = ({ children }) => {
  useCartSync();
  useWishlistSync();
  return children;
};

// The Router lives in the entry files: BrowserRouter in main.jsx, StaticRouter
// in entry-server.jsx. `store` and `helmetContext` are passed by entry-server
// for each request; in the browser the app store is used.
function App({ store = browserStore, helmetContext }) {
  useEffect(() => {
    console.log("%c URBAN NOOK CLIENT ACTIVE - VERSION 2.1.1 (STRICT VARIANT) ", "background: #141414; color: #E63329; font-weight: bold; font-size: 14px; padding: 10px; border-radius: 5px;");
  }, []);

  return (
    <HelmetProvider context={helmetContext}>
    <Provider store={store}>
      <SiteCampaignProvider>
        <>
          <SmoothScroll>
          <RouteTracker />
          <MotionLayer />
          <SessionManager>
            <SyncProvider>
              <Suspense fallback={null}>
                <OpenInBrowserBanner />
              </Suspense>
              <ErrorBoundary>
                <NewsTicker/>
                <NewHeader/>
                <FestiveEffects/>
              </ErrorBoundary>
              {/* AppRoutes loaded immediately - no lazy loading for critical routing */}
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
              {/* Intro + FAQs from Admin → SEO Pages for this URL (if any) */}
              <ErrorBoundary>
                <SeoPageContent />
              </ErrorBoundary>
              {/* Polls a pending WhatsApp login at the app level, so the login
                  completes even if the modal closes or the page reloads */}
              <ErrorBoundary>
                <Suspense fallback={null}>
                  <WhatsAppLoginWatcher />
                </Suspense>
              </ErrorBoundary>
              {/* Only non-critical components are lazy loaded */}
              <Suspense fallback={null}>
                <ErrorBoundary>
                  <Footer />
                </ErrorBoundary>
                <Notification />
                <GlMobileNav />
                {/* Global Google One Tap for logged-out visitors (boosts Meta EMQ) */}
                <ErrorBoundary>
                  <GoogleOneTap />
                </ErrorBoundary>
                {/* WhatsApp's equivalent of One Tap — one short prompt per
                    session for logged-out visitors */}
                <ErrorBoundary>
                  <WhatsAppOneTap />
                </ErrorBoundary>
                {/* Post-login passkey upsell (fires once after a fresh login) */}
                <ErrorBoundary>
                  <PasskeyPrompt />
                </ErrorBoundary>
                {/* Free-shipping popup — shows once, everywhere except checkout */}
                <ErrorBoundary>
                  <FreeShippingPopup />
                </ErrorBoundary>
                {/* Live offers carousel — waits while the free-shipping popup is due */}
                <ErrorBoundary>
                  <OffersPopup />
                </ErrorBoundary>
                {/* Promotion V2 "add more to unlock" bottom sheet */}
                <ErrorBoundary>
                  <PromotionUnlockSheet />
                  <GiftClaimWatcher />
                </ErrorBoundary>
                <ErrorBoundary>
                  <HelpWidget />
                </ErrorBoundary>
              </Suspense>
            </SyncProvider>
          </SessionManager>
          </SmoothScroll>
        </>
      </SiteCampaignProvider>
    </Provider>
    </HelmetProvider>
  );
}

export default App;

// // trigger build again