import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getApiUrl } from '../config/appUrls';

/**
 * Festive campaign state - ONE request per page load, shared by everything
 * festive (ticker, lights, torans, sparkles, fireworks, countdown, sections).
 *
 * The SERVER decides eligibility (GET /site-campaign/active compares its own
 * clock to the admin-configured Asia/Kolkata window and the admin's on/off
 * switch), so a campaign that has ended or been disabled stays off after any
 * refresh/navigation. The timer below only makes an already-open tab drop the
 * festive layer at the moment of expiry; it uses the server's clock (serverTime
 * skew), then re-asks the server, which has the final say. Returning to a
 * long-idle tab also re-asks.
 *
 * Preview: opening the storefront with ?festivePreview=<id>.<key> (link from
 * Admin → Festive → Preview) shows that campaign in THIS tab only, ignoring
 * its dates/enabled flag; ?festivePreview=off leaves preview.
 */

const MAX_TIMEOUT_MS = 2 ** 31 - 1;
const REFOCUS_REFETCH_AFTER_MS = 60 * 1000;
const PREVIEW_KEY = 'un_festive_preview';

// Never decorate the money path.
const SUPPRESSED_PREFIXES = ['/checkout', '/payment-processing', '/payment-failed', '/order-confirm'];

// Display copy that belongs to the THEME (not to any offer). Prices, savings
// and shipping claims never live here - they come from real promotions.
export const THEME_COPY = {
  diwali: {
    priceLabel: 'Diwali Price',
    saleTitle: 'Diwali Sale', // sale bar headline when admin set no messages
    // Home festive band: lead with the shopper's need, not our sale.
    bandLine: 'Gifts for every fan on your list, from katanas to lamps.',
    bandCta: 'Find a gift',
    // The band shows real markdowns; the combos section below shows offers.
    bandTitle: 'Biggest price drops',
    eyebrow: 'For This Diwali',
    offersTitle: 'Diwali Offers',
    offersSubtitle: 'Festive combos picked for gifting - more value in every box.',
    badge: 'Diwali Special',
  },
};

export const pageKeyFor = (pathname = '/') => {
  if (pathname === '/') return 'home';
  if (pathname === '/products' || pathname.startsWith('/category/')) return 'collection';
  if (pathname.startsWith('/products/') || pathname.startsWith('/product/')) return 'product';
  return 'other';
};

const readPreviewToken = () => {
  try {
    const url = new URL(window.location.href);
    const q = url.searchParams.get('festivePreview');
    if (q === 'off') sessionStorage.removeItem(PREVIEW_KEY);
    else if (q && /^[a-f0-9]{24}\.[a-f0-9]{32}$/i.test(q)) sessionStorage.setItem(PREVIEW_KEY, q);
    return sessionStorage.getItem(PREVIEW_KEY);
  } catch {
    return null;
  }
};

const EMPTY = {
  active: false,
  isPreview: false,
  campaign: null,
  endsAtMs: null,
  nowMs: () => Date.now(),
};

const Ctx = createContext(EMPTY);

export function SiteCampaignProvider({ children }) {
  const [state, setState] = useState({ campaign: null, offset: 0 });
  const lastLoad = useRef(0);
  const previewToken = useRef(null);

  const load = useCallback(async (signal) => {
    lastLoad.current = Date.now();
    try {
      const token = previewToken.current;
      const url = token
        ? `${getApiUrl()}/site-campaign/preview/${token.split('.')[0]}?key=${token.split('.')[1]}`
        : `${getApiUrl()}/site-campaign/active`;
      const res = await fetch(url, { cache: 'no-store', signal });
      if (!res.ok) { setState({ campaign: null, offset: 0 }); return; }
      const json = await res.json();
      const serverTime = Date.parse(json?.data?.serverTime);
      setState({
        campaign: json?.data?.campaign || null,
        // server clock minus local clock; add to Date.now() to estimate server time
        offset: Number.isFinite(serverTime) ? serverTime - Date.now() : 0,
      });
    } catch (e) {
      if (e?.name !== 'AbortError') setState((s) => s);
    }
  }, []);

  useEffect(() => {
    previewToken.current = readPreviewToken();
    const ctl = new AbortController();
    load(ctl.signal);
    return () => ctl.abort();
  }, [load]);

  // Coming back to a long-idle tab re-asks the server.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoad.current > REFOCUS_REFETCH_AFTER_MS) load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const { campaign, offset } = state;
  const endsAtMs = campaign ? Date.parse(campaign.endsAt) : null;

  // In-session expiry at the configured end time (skipped for previews -
  // their dates are irrelevant), then the server re-decides.
  useEffect(() => {
    if (!campaign || campaign.preview || !endsAtMs) return undefined;
    const msLeft = endsAtMs - (Date.now() + offset);
    if (msLeft > MAX_TIMEOUT_MS) return undefined;
    const t = setTimeout(() => { setState({ campaign: null, offset }); load(); }, Math.max(0, msLeft) + 250);
    return () => clearTimeout(t);
  }, [campaign, endsAtMs, offset, load]);

  const active = Boolean(campaign);

  // Theme CSS exists only while a campaign is live.
  useEffect(() => {
    const root = document.documentElement;
    if (active) root.dataset.festive = campaign.themeKey;
    else delete root.dataset.festive;
    return () => { delete root.dataset.festive; };
  }, [active, campaign?.themeKey]);

  const value = useMemo(() => ({
    active,
    isPreview: Boolean(campaign?.preview),
    campaign,
    endsAtMs,
    nowMs: () => Date.now() + offset,
  }), [active, campaign, endsAtMs, offset]);

  return createElement(Ctx.Provider, { value }, children);
}

const useMediaQuery = (query) => {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
};

/** Raw campaign context (no page gating). */
export const useSiteCampaignState = () => useContext(Ctx);

/**
 * The festive layer as seen from the current page.
 *   can(effect, { heavy })  - should this decoration render here, now?
 *     · campaign live, not on checkout/payment pages
 *     · the admin enabled `effect`, and enabled decorations for this page type
 *     · phones: needs showOnMobile; `heavy` effects (fireworks, sparkles,
 *       rangoli) additionally need mobileEffects
 */
export function useSiteCampaign() {
  const { active, campaign, endsAtMs, nowMs, isPreview } = useContext(Ctx);
  const { pathname } = useLocation();
  const isMobile = useMediaQuery('(max-width: 639px)');
  const suppressed = SUPPRESSED_PREFIXES.some((p) => pathname.startsWith(p));
  const page = pageKeyFor(pathname);

  const can = useCallback((effect, { heavy = false } = {}) => {
    if (!active || suppressed) return false;
    if (!campaign.elements?.[effect]) return false;
    if (!campaign.locations?.[page]) return false;
    if (isMobile && (!campaign.showOnMobile || (heavy && !campaign.mobileEffects))) return false;
    return true;
  }, [active, suppressed, campaign, page, isMobile]);

  return {
    active,
    isPreview,
    isMobile,
    page,
    suppressed,
    themeKey: active ? campaign.themeKey : null,
    can,
    nowMs,
    endsAtMs,
    countdownLabel: campaign?.countdownLabel || 'Festive offers end in',
    // Phuljadi progress animation config (null unless enabled, live and not on a money page)
    phuljadi: active && !suppressed ? campaign.phuljadi || null : null,
    stripText: campaign?.stripText || '',
    sections: active ? campaign.sections || [] : [],
    // Festive ticker messages never appear on checkout/payment pages.
    messages: active && !suppressed ? campaign.messages || [] : [],
  };
}
