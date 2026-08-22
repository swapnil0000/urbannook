import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useLocation } from 'react-router-dom';
import useTimer from '../hooks/useTimer';
import useOfferTerms from '../hooks/useOfferTerms';
import { useAuth } from '../hooks/useRedux';
import { getApiUrl } from '../config/appUrls';
import {
  INDEPENDENCE_OFFER,
  offerAmountLabel,
  offerConditionLabel,
  isOfferLive,
  isSuppressedPath,
  readOfferState,
  markDismissed,
  markClaimed,
  detectVisitorSource,
  isInAppBrowser,
  getAttributionPayload,
} from '../config/independenceOffer';
import {
  track,
  trackViewPromotion,
  trackSelectPromotion,
  trackGenerateLead,
  setMetaAdvancedMatching,
} from '../utils/analytics';

/**
 * Site-wide Independence Day lead-capture popup.
 *
 * Mounted globally rather than on the home page, because a large share of this
 * traffic lands straight on /products or a product page from an Instagram ad or
 * bio link and would never see a home-page-only popup.
 *
 * Shows once. Closing it does not throw the offer away — a small pill stays
 * pinned to the corner so anyone who dismissed it (or who wants their code
 * again) can reopen it on their own terms.
 */

const PROMO_NAME = 'Independence Day 10% Off Popup';
const CREATIVE_SLOT = 'site_wide_popup';

const MOBILE_RE = /^[6-9]\d{9}$/;

const AshokaChakra = ({ className = '' }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
    <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="24" cy="24" r="3.5" fill="currentColor" />
    {Array.from({ length: 24 }, (_, i) => (
      <line
        key={i}
        x1="24"
        y1="6"
        x2="24"
        y2="24"
        stroke="currentColor"
        strokeWidth="1"
        transform={`rotate(${i * 15} 24 24)`}
      />
    ))}
  </svg>
);

/** Three-band tricolour rule. Purely decorative. */
const TricolourBar = ({ className = '' }) => (
  <div className={`flex h-1.5 w-full ${className}`} aria-hidden="true">
    <span className="flex-1 bg-[#FF9933]" />
    <span className="flex-1 bg-white" />
    <span className="flex-1 bg-[#138808]" />
  </div>
);

/**
 * Lives in its own component so its 1s tick re-renders only the countdown —
 * the popup is mounted on every route, and a per-second re-render of the whole
 * tree (open or not) is a cost with nothing to show for it.
 */
const OfferCountdown = memo(() => {
  const timeLeft = useTimer(INDEPENDENCE_OFFER.endsAt);
  if (timeLeft.isExpired) return null;

  const units = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hrs', value: timeLeft.hours },
    { label: 'Min', value: timeLeft.minutes },
    { label: 'Sec', value: timeLeft.seconds },
  ];

  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className="text-[9px] uppercase tracking-[0.18em] text-[#F5DEB3]/50 mr-1">Ends in</span>
      {units.map((unit) => (
        <div key={unit.label} className="flex flex-col items-center">
          <span className="min-w-[30px] rounded-md border border-[#F5DEB3]/15 bg-white/5 px-1.5 py-1 font-mono text-sm font-bold tabular-nums text-[#F5DEB3]">
            {unit.value}
          </span>
          <span className="mt-1 text-[7px] uppercase tracking-[0.15em] text-[#F5DEB3]/40">
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
});
OfferCountdown.displayName = 'OfferCountdown';

const FIELD_BASE =
  'un-offer-input w-full h-12 rounded-xl bg-white/5 border px-3.5 text-[15px] text-[#F5DEB3] caret-[#F5DEB3] placeholder:text-[#F5DEB3]/25 outline-none transition-colors focus:border-[#F5DEB3]/60 focus:bg-white/[0.07]';

// Kept as a plain <style> tag rather than styled-jsx: this project is Vite, and
// the `<style jsx>` syntax used elsewhere in the codebase is a Next.js feature
// that silently does nothing here.
const POPUP_STYLES = `
  @keyframes unOfferFade { from { opacity: 0 } to { opacity: 1 } }
  @keyframes unOfferPop {
    from { opacity: 0; transform: translateY(12px) scale(.96) }
    to   { opacity: 1; transform: translateY(0) scale(1) }
  }
  @keyframes unOfferSpin { to { transform: rotate(360deg) } }
  @keyframes unOfferPillIn {
    from { opacity: 0; transform: translateX(-16px) }
    to   { opacity: 1; transform: translateX(0) }
  }

  .un-offer-backdrop { animation: unOfferFade .3s ease-out both }
  .un-offer-sheet    { animation: unOfferPop .42s cubic-bezier(.16,1,.3,1) both }

  /* Now that the dialog is centred on mobile too, an on-screen keyboard would
     otherwise cover it: vh ignores the keyboard, dvh shrinks with it. The vh
     line is the fallback for browsers without dvh support. */
  .un-offer-sheet {
    max-height: 90vh;
    max-height: 90dvh;
  }
  .un-offer-pill     { animation: unOfferPillIn .4s cubic-bezier(.16,1,.3,1) both }
  .un-offer-spinner  { animation: unOfferSpin .7s linear infinite }
  .un-offer-chakra   { animation: unOfferFade .6s ease-out both }

  /* Chrome and Safari repaint an autofilled field with their own near-white
     background and near-black text through a UA style that ordinary CSS rules
     cannot override — on this dark sheet that turned the number field white.
     An inset box-shadow is the accepted way to repaint the fill, and
     -webkit-text-fill-color the only way to recolour the text. The two colours
     below are #1c3026 composited with the white/5 and white/7 overlays the
     field uses normally, so autofilled and typed states look identical. */
  .un-offer-input:-webkit-autofill,
  .un-offer-input:-webkit-autofill:hover,
  .un-offer-input:-webkit-autofill:focus,
  .un-offer-input:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 1000px #273a31 inset;
    box-shadow: 0 0 0 1000px #273a31 inset;
    -webkit-text-fill-color: #F5DEB3;
    caret-color: #F5DEB3;
  }
  .un-offer-input:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px #2c3e35 inset;
    box-shadow: 0 0 0 1000px #2c3e35 inset;
  }

  /* Firefox tints autofilled fields too, via the standard selector. Kept in its
     own rule on purpose: grouping it with the -webkit- ones above would make
     the entire selector list invalid in engines that know only one of them. */
  .un-offer-input:autofill {
    box-shadow: 0 0 0 1000px #273a31 inset;
    -webkit-text-fill-color: #F5DEB3;
    caret-color: #F5DEB3;
  }
  .un-offer-input:autofill:focus {
    box-shadow: 0 0 0 1000px #2c3e35 inset;
  }

  /* Gold foil on the headline number */
  .un-offer-gradient {
    background: linear-gradient(96deg, #F5DEB3 0%, #FFF6E0 38%, #D9B87C 72%, #F5DEB3 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  @media (prefers-reduced-motion: reduce) {
    .un-offer-backdrop,
    .un-offer-sheet,
    .un-offer-pill,
    .un-offer-chakra { animation: unOfferFade .01s linear both }
    .un-offer-spinner { animation-duration: 1.4s }
  }
`;

const IndependenceDayPopup = memo(() => {
  const location = useLocation();
  const { user } = useAuth();
  // Live coupon terms from the server, so an admin rename or re-price reaches
  // the popup without a rebuild.
  const { terms: campaign } = useOfferTerms();

  const [offerState, setOfferState] = useState(readOfferState);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('form'); // 'form' | 'success'
  const [mobile, setMobile] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Terms returned by the claim itself — authoritative once we have them.
  const [claimTerms, setClaimTerms] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const dialogRef = useRef(null);
  const lastFocusedRef = useRef(null);
  const viewRef = useRef(view);
  const hasTrackedView = useRef(false);
  const closeTimerRef = useRef(null);

  // The copy confirmation holds the sheet open for a beat before closing; if the
  // component goes away first, that pending close must not outlive it.
  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  // Mirrored into a ref so closePopup can read the current view without taking
  // it as a dependency — closePopup is itself a dependency of the focus-trap
  // effect, and a changing identity there would tear down the trap mid-modal.
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // Two Date parses per render, and this component only re-renders on
  // navigation or its own state changes — cheap enough not to memoise, and the
  // server re-validates the window on claim anyway.
  const offerLive = isOfferLive();
  const suppressed = isSuppressedPath(location.pathname);

  /* -- open once, after the page has had a moment to settle ---------------- */
  useEffect(() => {
    if (!offerLive || suppressed || offerState) return;
    const timer = setTimeout(() => setIsOpen(true), INDEPENDENCE_OFFER.openDelayMs);
    return () => clearTimeout(timer);
  }, [offerLive, suppressed, offerState]);

  /* -- prefill for signed-in visitors: nothing left to type ---------------- */
  useEffect(() => {
    if (!isOpen || !user?.mobile) return;
    setMobile((current) => current || String(user.mobile).replace(/\D/g, '').slice(-10));
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen || hasTrackedView.current) return;
    hasTrackedView.current = true;
    trackViewPromotion({
      promotionId: INDEPENDENCE_OFFER.campaignId,
      promotionName: PROMO_NAME,
      creativeSlot: CREATIVE_SLOT,
    });
  }, [isOpen]);

  const closePopup = useCallback((reason) => {
    setIsOpen(false);
    // A claim is already persisted — closing the success screen must not
    // downgrade it to "dismissed" and lose the code we handed out.
    if (viewRef.current === 'success') return;
    setOfferState(markDismissed());
    track('promo_popup_dismissed', {
      promotion_id: INDEPENDENCE_OFFER.campaignId,
      promotion_name: PROMO_NAME,
      dismiss_method: reason,
    });
  }, []);

  /* -- modal plumbing: scroll lock, Escape, focus trap, focus restore ------ */
  useEffect(() => {
    if (!isOpen) return undefined;

    lastFocusedRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the dialog, never the first input: auto-focusing a text field on
    // mobile throws the keyboard up over an offer the visitor hasn't read yet.
    dialogRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closePopup('escape');
        return;
      }
      if (event.key !== 'Tab') return;

      const node = dialogRef.current;
      if (!node) return;
      const focusables = Array.from(
        node.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      lastFocusedRef.current?.focus?.();
    };
  }, [isOpen, closePopup]);

  const validate = () => {
    const next = {};
    if (!MOBILE_RE.test(mobile)) {
      next.mobile = 'Enter a valid 10-digit mobile number';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;

    const source = detectVisitorSource();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${getApiUrl()}/offer/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile,
          campaign: INDEPENDENCE_OFFER.campaignId,
          source,
          pagePath: location.pathname,
          isInAppBrowser: isInAppBrowser(),
          attribution: getAttributionPayload(),
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) {
        // Joi failures arrive as data:[{field,message}] — surface the specific
        // one rather than a generic "Validation failed".
        const fieldMessage = Array.isArray(body?.data) && body.data[0]?.message;
        throw new Error(
          fieldMessage || body?.message || 'Could not unlock your discount. Please try again.',
        );
      }

      const data = body?.data || {};
      const code = String(data.couponCode || campaign.couponCode).toUpperCase();

      setClaimTerms(data);
      // Carries the number forward so checkout can prefill it instead of
      // asking for it a second time.
      setOfferState(markClaimed(code, mobile));
      setView('success');

      // The popup is frequently the first point at which we learn who an ad
      // click actually is — feeding it forward lifts Meta match quality for
      // every event this visitor fires afterwards.
      setMetaAdvancedMatching({ phone: mobile });
      trackGenerateLead({
        leadType: 'promo_discount',
        formName: PROMO_NAME,
        contactMethod: 'mobile',
        source,
      });
    } catch (error) {
      setFormError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const writeToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Some in-app webviews block the async clipboard API.
      try {
        const helper = document.createElement('textarea');
        helper.value = text;
        helper.setAttribute('readonly', '');
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.appendChild(helper);
        helper.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(helper);
        return ok;
      } catch {
        return false;
      }
    }
  };

  const handleCopyAndClose = async () => {
    setCopyFailed(false);
    const succeeded = await writeToClipboard(claimedCode);

    if (!succeeded) {
      // Never close on a failed copy — the visitor would lose the code with
      // nothing on their clipboard. Leave it on screen to select by hand.
      setCopyFailed(true);
      return;
    }

    setCopied(true);
    trackSelectPromotion({
      promotionId: INDEPENDENCE_OFFER.campaignId,
      promotionName: PROMO_NAME,
      creativeSlot: CREATIVE_SLOT,
      ctaText: 'Copy code',
    });

    // Let the confirmation land before the sheet goes — closing on the same
    // frame as the tap reads as a glitch rather than a success. The corner pill
    // keeps the code reachable afterwards.
    closeTimerRef.current = setTimeout(() => closePopup('copied'), 900);
  };

  const handleReopen = () => {
    // A reopened sheet must not come back wearing the last visit's "Copied"
    // state, or its button would sit there already looking spent.
    clearTimeout(closeTimerRef.current);
    setCopied(false);
    setCopyFailed(false);
    setView(offerState?.status === 'claimed' ? 'success' : 'form');
    setIsOpen(true);
    track('promo_popup_reopened', {
      promotion_id: INDEPENDENCE_OFFER.campaignId,
      promotion_name: PROMO_NAME,
      state: offerState?.status || 'new',
    });
  };

  // `available` is false when the coupon is switched off, expired or has used
  // up its global cap — better to show nothing than to hand out a code that
  // checkout will refuse.
  if (!offerLive || suppressed || campaign.available === false) return null;

  const hasClaimed = offerState?.status === 'claimed';

  // Before submit these are the live coupon terms from the server; after submit
  // they are the terms the claim itself returned. Every discount phrase below
  // derives from this, so the copy can never advertise something the coupon
  // does not actually do.
  const offer = claimTerms || campaign;
  // Always the live code — never a stale one persisted from an earlier visit,
  // which would be a code the checkout no longer recognises after a rename.
  const claimedCode = claimTerms?.couponCode || campaign.couponCode;
  const amount = offerAmountLabel(offer); // "₹100" / "10%"
  const condition = offerConditionLabel(offer); // "on orders above ₹1,499"

  /* -- the reopen pill: the "I closed it but still want it" path ----------- */
  if (!isOpen) {
    if (!offerState) return null;
    return (
      <>
        <style>{POPUP_STYLES}</style>
        <button
          type="button"
          onClick={handleReopen}
          className="un-offer-pill fixed bottom-24 left-4 z-[9998] flex items-center gap-2 rounded-full border border-[#F5DEB3]/25 bg-[#1c3026]/95 py-2.5 pl-2.5 pr-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition-transform hover:scale-105 active:scale-95 sm:bottom-6"
          aria-label={
            hasClaimed
              ? `Your Independence Day code is ${claimedCode}. Reopen offer.`
              : `Claim ${amount} off for Independence Day`
          }
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#FF9933] to-[#138808]">
            <AshokaChakra className="h-4 w-4 text-white" />
          </span>
          <span className="text-left leading-tight">
            <span className="block text-[7px] font-bold uppercase tracking-[0.18em] text-[#F5DEB3]/50">
              {hasClaimed ? 'Your code' : 'Freedom Sale'}
            </span>
            <span className="block text-[11px] font-bold tracking-wide text-[#F5DEB3]">
              {hasClaimed ? claimedCode : `Get ${amount} OFF`}
            </span>
          </span>
        </button>
      </>
    );
  }

  return (
    <>
      <style>{POPUP_STYLES}</style>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div
          className="un-offer-backdrop absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => closePopup('backdrop')}
          aria-hidden="true"
        />

        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="un-offer-title"
          aria-describedby="un-offer-subtitle"
          tabIndex={-1}
          className="un-offer-sheet relative flex w-full max-w-[420px] flex-col overflow-hidden rounded-[1.75rem] border border-[#F5DEB3]/15 bg-[#1c3026] shadow-[0_24px_70px_rgba(0,0,0,0.55)] outline-none"
        >
          <TricolourBar />

          <button
            type="button"
            onClick={() => closePopup('close_button')}
            className="absolute right-3 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full text-[#F5DEB3]/60 transition-colors hover:bg-white/10 hover:text-[#F5DEB3]"
            aria-label="Close offer"
          >
            <i className="fa-solid fa-xmark text-base" />
          </button>

          <div className="overflow-y-auto px-6 pb-6 pt-4 sm:px-7">
            {view === 'form' ? (
              <>
                {/* ---- Hero ---- */}
                <div className="text-center">
                  {/* Capped width so this row can never run under the close
                      button on narrow phones — it wraps instead of colliding. */}
                  <div className="mx-auto mb-3 flex max-w-[78%] flex-wrap items-center justify-center gap-2">
                    <span className="h-px w-5 bg-[#F5DEB3]/30" />
                    <AshokaChakra className="un-offer-chakra h-4 w-4 text-[#F5DEB3]/70" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#F5DEB3]/70">
                      Independence Day Special
                    </span>
                    <span className="h-px w-5 bg-[#F5DEB3]/30" />
                  </div>

                  <h2 id="un-offer-title" className="font-serif text-[22px] leading-tight text-white">
                    Celebrate freedom with
                  </h2>
                  <p className="un-offer-gradient font-serif text-[46px] font-bold leading-none">
                    {amount} OFF
                  </p>
                  {/* The qualifying condition sits with the headline, not buried
                      in fine print — someone gives up their number on the
                      strength of this claim. */}
                  <p className="mt-1.5 text-[11px] font-medium tracking-wide text-[#F5DEB3]/70">
                    {condition}
                  </p>
                  <p id="un-offer-subtitle" className="mt-1.5 text-[13px] text-white/60">
                    Enter your number to unlock it instantly.
                  </p>
                </div>

                <div className="my-4">
                  <OfferCountdown />
                </div>

                {/* ---- Form ---- */}
                <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
                  {formError && (
                    <p
                      role="alert"
                      className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300"
                    >
                      {formError}
                    </p>
                  )}

                  <div>
                    <label
                      htmlFor="un-offer-mobile"
                      className="mb-1.5 block text-[10px] uppercase tracking-[0.15em] text-[#F5DEB3]/60"
                    >
                      Mobile number
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 border-r border-[#F5DEB3]/20 pr-2.5 text-[15px] text-[#F5DEB3]/55">
                        +91
                      </span>
                      <input
                        id="un-offer-mobile"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        maxLength={10}
                        value={mobile}
                        onChange={(e) => {
                          setMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                          if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: '' }));
                        }}
                        placeholder="98765 43210"
                        aria-invalid={!!errors.mobile}
                        aria-describedby={errors.mobile ? 'un-offer-mobile-error' : undefined}
                        className={`${FIELD_BASE} pl-[4.25rem] ${
                          errors.mobile ? 'border-red-500/60' : 'border-[#F5DEB3]/20'
                        }`}
                      />
                    </div>
                    {errors.mobile && (
                      <p id="un-offer-mobile-error" role="alert" className="mt-1.5 text-[11px] text-red-300">
                        {errors.mobile}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#F5DEB3] text-xs font-bold uppercase tracking-[0.15em] text-[#1c3026] transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="un-offer-spinner h-3.5 w-3.5 rounded-full border-2 border-[#1c3026]/25 border-t-[#1c3026]" />
                        Unlocking…
                      </>
                    ) : (
                      <>Unlock my {amount} off</>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => closePopup('maybe_later')}
                    className="w-full py-1 text-[11px] text-white/40 underline-offset-4 transition-colors hover:text-white/70 hover:underline"
                  >
                    No thanks, I&apos;ll pay full price
                  </button>
                </form>
              </>
            ) : (
              /* ---- Success ---- */
              <div className="py-1 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#FF9933] via-white to-[#138808]">
                  <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#1c3026]">
                    <i className="fa-solid fa-check text-lg text-[#F5DEB3]" />
                  </span>
                </div>

                <h2 id="un-offer-title" className="font-serif text-[22px] leading-tight text-white">
                  Your {amount} off is ready
                </h2>
                <p id="un-offer-subtitle" className="mt-2 text-[13px] text-white/55">
                  Apply it at checkout {condition}.
                </p>

                {/* Presented as display type, not a field — this is something to
                    read and keep, and a bordered box reads as "type here". */}
                <div className="mt-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#F5DEB3]/40">
                    Your code
                  </p>
                  <p className="mt-1.5 select-all font-mono text-[30px] font-bold leading-none tracking-[0.16em] text-[#F5DEB3]">
                    {claimedCode}
                  </p>
                </div>

                <div className="my-4">
                  <OfferCountdown />
                </div>

                <button
                  type="button"
                  onClick={handleCopyAndClose}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#F5DEB3] text-xs font-bold uppercase tracking-[0.15em] text-[#1c3026] transition-all hover:bg-white"
                >
                  <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'} text-sm`} />
                  {copied ? 'Copied' : 'Copy code'}
                </button>

                {/* Announced politely so the confirmation reaches a screen reader
                    in the moment before the sheet closes. */}
                <p className="sr-only" role="status" aria-live="polite">
                  {copied ? `Coupon code ${claimedCode} copied to clipboard` : ''}
                </p>

                {copyFailed && (
                  <p role="alert" className="mt-3 text-[11px] text-red-300">
                    Couldn&apos;t copy automatically — tap and hold the code above to copy it.
                  </p>
                )}

                <p className="mt-3 text-[10px] leading-relaxed text-white/35">
                  Valid once per customer
                  {offer.maxDiscount ? ` · Up to ₹${offer.maxDiscount} off` : ''} ·{' '}
                  {condition.charAt(0).toUpperCase() + condition.slice(1)} · Applies to product total
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

IndependenceDayPopup.displayName = 'IndependenceDayPopup';

export default IndependenceDayPopup;
