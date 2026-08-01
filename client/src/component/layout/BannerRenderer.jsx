import { useState, useMemo, useEffect } from "react";
import { useLocation, matchPath } from "react-router-dom";
import { useGetActiveBannersQuery } from "../../store/api/bannerApi";

// Maps a banner's `position` to a fixed-positioning class string. Kept
// below OpenInBrowserBanner's z-[9999] top strip by default.
const POSITION_CLASSES = {
  "top-left": "top-3 left-3 items-start",
  "top-center": "top-3 left-1/2 -translate-x-1/2 items-center",
  "top-right": "top-3 right-3 items-end",
  "middle-left": "top-1/2 left-3 -translate-y-1/2 items-start",
  "middle-center": "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 items-center",
  "middle-right": "top-1/2 right-3 -translate-y-1/2 items-end",
  "bottom-left": "bottom-3 left-3 items-start",
  "bottom-center": "bottom-3 left-1/2 -translate-x-1/2 items-center",
  "bottom-right": "bottom-3 right-3 items-end",
};

function dismissKeyFor(banner) {
  return `un_banner_dismissed_${banner._id}`;
}

// Applies a banner's displayFrequency: "always" never persists a dismissal,
// "once-per-session" uses sessionStorage, "once-per-day" uses localStorage
// with a date check. Mirrors NewLaunchPopup.jsx's sessionStorage gate.
function isDismissed(banner) {
  const key = dismissKeyFor(banner);
  if (banner.displayFrequency === "once-per-session") {
    return sessionStorage.getItem(key) === "1";
  }
  if (banner.displayFrequency === "once-per-day") {
    const stored = localStorage.getItem(key);
    if (!stored) return false;
    const dismissedOn = new Date(stored);
    const now = new Date();
    return (
      dismissedOn.getFullYear() === now.getFullYear() &&
      dismissedOn.getMonth() === now.getMonth() &&
      dismissedOn.getDate() === now.getDate()
    );
  }
  return false;
}

function markDismissed(banner) {
  const key = dismissKeyFor(banner);
  if (banner.displayFrequency === "once-per-session") {
    sessionStorage.setItem(key, "1");
  } else if (banner.displayFrequency === "once-per-day") {
    localStorage.setItem(key, new Date().toISOString());
  }
}

// Same mobile breakpoint convention used elsewhere in this codebase (e.g.
// pages/home/WhyChooseUs.jsx) — 768px, checked on resize.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

function matchesDevice(banner, isMobile) {
  const vis = banner.deviceVisibility || "both";
  if (vis === "both") return true;
  return vis === "mobile" ? isMobile : !isMobile;
}

// Direction each position category slides in from, so the entrance reads as
// "arriving from the nearest edge" rather than a generic pop-in. This is a
// SEPARATE transform from the positioning transform below — combining both
// on one element via Tailwind utility classes doesn't work, because
// translate-x/translate-y utilities all write the same CSS custom
// properties (--tw-translate-x/-y), so a later class silently overwrites an
// earlier one instead of composing with it (this previously broke
// middle-center's vertical centering: the enter-animation's `translate-y-0`
// was clobbering the position class's `-translate-y-1/2`). Fix: the outer
// div only ever carries the positioning transform; a nested inner div
// carries the enter/exit animation transform, so the two never collide.
function enterOffsetClass(position) {
  if (position.startsWith("top-")) return "-translate-y-3";
  if (position.startsWith("bottom-")) return "translate-y-3";
  return "scale-95"; // middle-*, custom
}

const TRANSITION_MS = 250;

// Only true "popup" placements (center of the screen, in any row) get a
// dimming backdrop behind them — a strip banner pinned to a corner/edge
// isn't meant to interrupt the page the way a centered popup is.
function isPopupStyle(position) {
  return position === "middle-left" || position === "middle-center" || position === "middle-right" || position === "custom";
}

function BannerCard({ banner, onDismiss }) {
  const isCustom = banner.position === "custom";
  const style = isCustom
    ? { top: `${banner.customOffset?.y ?? 0}%`, left: `${banner.customOffset?.x ?? 0}%` }
    : undefined;
  const positionClass = isCustom ? "" : POSITION_CLASSES[banner.position] || POSITION_CLASSES["top-center"];
  const showBackdrop = isPopupStyle(banner.position);
  const isVertical = banner.orientation === "vertical";

  // Two-step mount: render off-state first, flip to on-state a frame later
  // so the browser actually animates the transition instead of snapping in.
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleDismiss = () => {
    setLeaving(true);
    setTimeout(onDismiss, TRANSITION_MS);
  };

  const offEnter = enterOffsetClass(banner.position);
  const animClass = entered && !leaving ? "opacity-100 translate-y-0 scale-100" : `opacity-0 ${offEnter}`;
  const backdropClass = entered && !leaving ? "opacity-100" : "opacity-0";

  return (
    <>
      {showBackdrop && (
        <div
          className={`fixed inset-0 bg-black/60 transition-opacity ease-out ${backdropClass}`}
          style={{ zIndex: 8999 + (banner.priority || 0), transitionDuration: `${TRANSITION_MS}ms` }}
          onClick={banner.dismissible ? handleDismiss : undefined}
        />
      )}
      <div className={`fixed z-[9000] pointer-events-none ${positionClass}`} style={{ ...style, zIndex: 9000 + (banner.priority || 0) }}>
        {isVertical ? (
          // Stacked: image on top (3:4, tall), content below. The narrower
          // max-width keeps the overall card reading as tall, not just the
          // image inside it.
          <div
            className={`pointer-events-auto relative flex flex-col rounded-xl shadow-2xl overflow-hidden bg-bgPrimary border border-borderPrimary w-[90vw] max-w-xs transition-all ease-out ${animClass}`}
            style={{ transitionDuration: `${TRANSITION_MS}ms` }}
          >
            {banner.dismissible && (
              <button
                onClick={handleDismiss}
                aria-label="Dismiss banner"
                className="absolute top-2.5 right-2.5 z-10 h-7 w-7 flex items-center justify-center rounded-full bg-black/50 text-white text-sm leading-none hover:bg-black/70 transition-colors"
              >
                ✕
              </button>
            )}
            {banner.content?.imageUrl && (
              <div className="w-full aspect-[3/4]">
                <img src={banner.content.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex flex-col gap-1.5 p-4">
              {banner.title && <h3 className="text-base font-bold leading-snug text-textPrimary">{banner.title}</h3>}
              {banner.content?.text && <p className="text-sm text-textSecondary">{banner.content.text}</p>}
              {banner.content?.ctaUrl && banner.content?.ctaLabel && (
                <a
                  href={banner.content.ctaUrl}
                  className="mt-2 inline-flex items-center justify-center self-start rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {banner.content.ctaLabel}
                </a>
              )}
            </div>
          </div>
        ) : (
          // Side-by-side: image on the left, content on the right — this is
          // what actually makes the CARD read as wide, not just the image
          // inside it (a stacked image+text card never looks "horizontal"
          // as a whole no matter how wide the image alone is).
          <div
            className={`pointer-events-auto relative flex flex-row items-stretch min-h-[320px] rounded-xl shadow-2xl overflow-hidden bg-bgPrimary border border-borderPrimary w-[90vw] max-w-lg transition-all ease-out ${animClass}`}
            style={{ transitionDuration: `${TRANSITION_MS}ms` }}
          >
            {banner.dismissible && (
              <button
                onClick={handleDismiss}
                aria-label="Dismiss banner"
                className="absolute top-2.5 right-2.5 z-10 h-7 w-7 flex items-center justify-center rounded-full bg-black/50 text-white text-sm leading-none hover:bg-black/70 transition-colors"
              >
                ✕
              </button>
            )}
            {banner.content?.imageUrl && (
              <div className="w-2/5 shrink-0">
                <img src={banner.content.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-4 min-w-0 text-center">
              {banner.title && <h3 className="text-base font-bold leading-snug text-textPrimary">{banner.title}</h3>}
              {banner.content?.text && <p className="text-sm text-textSecondary">{banner.content.text}</p>}
              {banner.content?.ctaUrl && banner.content?.ctaLabel && (
                <a
                  href={banner.content.ctaUrl}
                  className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {banner.content.ctaLabel}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function BannerRenderer() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { data: bannersRes } = useGetActiveBannersQuery();
  const banners = bannersRes?.data;
  // Tracks banners dismissed during this render session (in addition to
  // whatever isDismissed() already reads from session/local storage) so a
  // dismiss click hides the banner immediately without waiting on a refetch.
  const [sessionDismissedIds, setSessionDismissedIds] = useState([]);

  const visible = useMemo(() => {
    if (!banners) return [];
    return banners.filter((banner) => {
      if (sessionDismissedIds.includes(banner._id)) return false;
      if (isDismissed(banner)) return false;
      if (!matchesDevice(banner, isMobile)) return false;
      const matchesRoute = banner.routePatterns.some(
        (pattern) => pattern === "*" || matchPath(pattern, location.pathname),
      );
      return matchesRoute;
    });
  }, [banners, sessionDismissedIds, location.pathname, isMobile]);

  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((banner) => (
        <BannerCard
          key={banner._id}
          banner={banner}
          onDismiss={() => {
            markDismissed(banner);
            setSessionDismissedIds((prev) => [...prev, banner._id]);
          }}
        />
      ))}
    </>
  );
}
