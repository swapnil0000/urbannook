import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAuth, useUI } from '../../hooks/useRedux';
import { useRevealCouponCodeMutation } from '../../store/api/userApi';
import { useWhatsAppLogin, openWhatsApp } from '../../hooks/useWhatsAppLogin';
import {
  subscribeWhatsAppLogin,
  getWhatsAppLoginSession,
  clearWhatsAppLoginSession,
} from '../../utils/whatsappLoginSession';

const MOBILE_RE = /^[6-9]\d{9}$/;

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
};

/**
 * Coupon details + code reveal.
 *
 * The code is never in the page data. It comes back from POST /coupon/reveal,
 * which the server only answers when the signed-in account's mobile number was
 * proven over WhatsApp (the site's existing verification) AND equals the number
 * typed here. Entering a number alone reveals nothing. The revealed code lives
 * only in this component's state — never in Redux or storage.
 */
const CouponRevealModal = ({ offer, onClose }) => {
  const { user, isAuthenticated } = useAuth();
  const { showNotification } = useUI();
  const [revealCode, { isLoading: isRevealing }] = useRevealCouponCodeMutation();
  const { startLogin, isStarting, errorMessage: startError } = useWhatsAppLogin();

  const [mobile, setMobile] = useState(() => String(user?.userMobileNumber || '').replace(/\D/g, '').slice(-10));
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const sawSession = useRef(false);
  const inputRef = useRef(null);

  const session = useSyncExternalStore(subscribeWhatsAppLogin, getWhatsAppLoginSession, () => null);

  // Esc closes; page behind does not scroll
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const beginVerify = useCallback(async () => {
    setError('');
    sawSession.current = false;
    setVerifying(true);
    try {
      await startLogin(session?.token);
    } catch {
      setVerifying(false);
    }
  }, [startLogin, session?.token]);

  const tryReveal = useCallback(
    async (allowVerify) => {
      setError('');
      try {
        const res = await revealCode({ couponId: offer.id, mobile }).unwrap();
        setCode(res?.data?.code || '');
        setVerifying(false);
        return;
      } catch (e) {
        const reason = e?.data?.data?.code;
        const needsVerify = e?.status === 401 || reason === 'MOBILE_NOT_VERIFIED' || reason === 'MOBILE_MISMATCH';
        if (needsVerify && allowVerify) {
          beginVerify();
          return;
        }
        setVerifying(false);
        if (reason === 'MOBILE_MISMATCH') setError('That number is different from the one you verified. Use the same number you send the WhatsApp message from.');
        else if (needsVerify) setError('We could not confirm this number yet. Please try again and press Send in WhatsApp.');
        else setError(e?.data?.message || 'Could not reveal this code right now. Please try again.');
      }
    },
    [revealCode, offer.id, mobile, beginVerify],
  );

  // The login watcher (app root) clears the session once WhatsApp verifies or the code expires.
  // Either way, ask the server — it alone decides whether the number is proven.
  useEffect(() => {
    if (!verifying) return;
    if (session) {
      sawSession.current = true;
    } else if (sawSession.current) {
      sawSession.current = false;
      tryReveal(false);
    }
  }, [verifying, session, tryReveal]);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!MOBILE_RE.test(mobile)) {
      setError('Enter a valid 10-digit Indian mobile number (starts with 6-9).');
      return;
    }
    if (!isAuthenticated) {
      // guests have no session, so a reveal call can only 401 — verify straight away
      beginVerify();
      return;
    }
    tryReveal(true);
  };

  const onCopy = async () => {
    const ok = await copyText(code);
    setCopied(ok);
    if (ok) showNotification(`Code ${code} copied - apply it in your cart`);
    else setError('Could not copy automatically. Select the code and copy it.');
    if (ok) setTimeout(() => setCopied(false), 2500);
  };

  const cancelVerify = () => {
    clearWhatsAppLoginSession();
    setVerifying(false);
    sawSession.current = false;
  };

  const busy = isRevealing || isStarting;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Coupon details">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px] cursor-default" />
      <div className="un-scroll relative w-full sm:max-w-[460px] max-h-[92dvh] overflow-y-auto bg-paper text-ink border border-hair sm:border-star/40 shadow-2xl">
        {/* ticket head */}
        <div className="relative bg-ink text-paper px-5 pt-5 pb-5 border-b border-dashed border-star/50">
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 w-8 h-8 grid place-items-center text-paper/70 hover:text-star text-xl leading-none">×</button>
          <p className="gl-lbl text-[10px] text-star mb-1.5">{offer.membersOnly ? 'Members only' : 'Coupon'}</p>
          <h3 className="font-archivo text-[28px] font-extrabold leading-none tracking-tight pr-8">{offer.headline}</h3>
          <p className="mt-2 text-[13px] text-paper/75 leading-snug">{offer.summary}</p>
        </div>

        <div className="px-5 py-5">
          {code ? (
            <div role="status" aria-live="polite">
              <p className="gl-lbl text-[10px] text-brand mb-2">Your code</p>
              <div className="flex items-stretch border-2 border-dashed border-brand">
                <span className="flex-1 grid place-items-center px-3 py-3.5 font-mono text-xl sm:text-2xl font-bold tracking-[0.18em] select-all break-all">{code}</span>
                <button type="button" onClick={onCopy} className="px-5 bg-brand text-white gl-lbl text-[11px] hover:opacity-90 transition-opacity">
                  {copied ? 'Copied ✓' : 'Copy Code'}
                </button>
              </div>
              <p className="mt-2.5 text-[12.5px] font-semibold text-ink">
                {copied ? 'Code copied. Paste it in the coupon box in your cart.' : 'Tap Copy Code, then paste it in the coupon box in your cart.'}
              </p>
            </div>
          ) : verifying ? (
            <div className="text-center" aria-live="polite">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                <span className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                Verifying your number on WhatsApp…
              </div>
              <p className="mt-2.5 text-xs text-muted">Send the pre-filled message in WhatsApp, then come back here. Your code appears automatically.</p>
              {session && (
                <>
                  <p className="mt-2 text-xs text-muted">Code: <span className="font-mono font-bold tracking-wider text-ink">{session.token}</span></p>
                  <button type="button" onClick={() => openWhatsApp(session)} className="mt-3 gl-lbl text-[11px] border-b-2 border-current pb-0.5 hover:text-brand">Open WhatsApp again</button>
                </>
              )}
              <button type="button" onClick={cancelVerify} className="block mx-auto mt-3 text-xs text-muted underline underline-offset-2">Cancel</button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <label htmlFor="coupon-mobile" className="gl-lbl text-[10px] text-brand block mb-2">Enter your mobile number to reveal the code</label>
              <div className="flex items-stretch border border-ink/60 focus-within:border-brand">
                <span className="px-3 grid place-items-center text-sm font-semibold text-muted border-r border-hair">+91</span>
                <input
                  id="coupon-mobile"
                  ref={inputRef}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => { setMobile(e.target.value.replace(/\D/g, '').slice(0, 10)); if (error) setError(''); }}
                  placeholder="10-digit mobile number"
                  className="flex-1 min-w-0 bg-transparent px-3 py-3 text-base outline-none"
                />
              </div>
              <button type="submit" disabled={busy} className="mt-3 w-full h-12 bg-ink text-paper gl-lbl text-[12px] hover:bg-brand transition-colors disabled:opacity-60">
                {busy ? 'Please wait…' : 'Verify & reveal code'}
              </button>
              <p className="mt-2.5 text-[11.5px] text-muted leading-snug">
                We confirm your number with a one-tap WhatsApp message - typing a number alone does not unlock the code. Your number is used only for verification and this coupon.
              </p>
            </form>
          )}

          {(error || startError) && !code && (
            <p role="alert" className="mt-3 text-[12.5px] font-semibold text-brand">{error || startError}</p>
          )}
          {error && code && <p role="alert" className="mt-2 text-xs text-brand">{error}</p>}

          {/* terms */}
          <div className="mt-6 pt-4 border-t border-hair">
            <p className="gl-lbl text-[10px] mb-2">Terms &amp; Conditions</p>
            <ul className="space-y-1.5 text-[12.5px] text-muted leading-snug list-disc pl-4">
              {offer.terms.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CouponRevealModal;
