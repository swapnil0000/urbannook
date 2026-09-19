import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useWhatsAppLogin } from '../../../hooks/useWhatsAppLogin';
import {
  subscribeWhatsAppLogin,
  getWhatsAppLoginSession,
} from '../../../utils/whatsappLoginSession';

/* Same pages Google One Tap stays out of — a login prompt on top of checkout
   or an admin screen is a distraction, not a convenience. */
const SUPPRESSED_PREFIXES = [
  '/checkout',
  '/admin',
  '/login',
  '/register',
  '/reset-password',
];

/* Let the page settle before interrupting */
const APPEAR_DELAY_MS = 2500;

/* How long it stays up before dismissing itself */
const VISIBLE_MS = 10000;

/* Shown once per browser session — a prompt on every navigation is nagging */
const SEEN_KEY = 'whatsappOneTapSeen';

const alreadySeen = () => {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    // Private mode: fall back to showing it, which is better than a crash
    return false;
  }
};

const markSeen = () => {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* nothing to do */
  }
};

/**
 * A small WhatsApp sign-in prompt, in the spirit of Google One Tap.
 *
 * Appears once per session for logged-out visitors, then dismisses itself
 * after ten seconds so it never becomes furniture. Tapping it starts the
 * normal WhatsApp login; WhatsAppLoginWatcher finishes the job, so the login
 * completes even after this prompt is gone.
 */
export default function WhatsAppOneTap() {
  const location = useLocation();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { startLogin, isStarting } = useWhatsAppLogin();

  const pendingSession = useSyncExternalStore(
    subscribeWhatsAppLogin,
    getWhatsAppLoginSession,
  );

  const [visible, setVisible] = useState(false);

  const suppressed = SUPPRESSED_PREFIXES.some((p) =>
    location.pathname.startsWith(p),
  );

  const dismiss = useCallback(() => {
    setVisible(false);
    markSeen();
  }, []);

  useEffect(() => {
    if (isAuthenticated || suppressed || pendingSession || alreadySeen()) {
      return undefined;
    }

    const appearTimer = setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
    return () => clearTimeout(appearTimer);
  }, [isAuthenticated, suppressed, pendingSession]);

  /* Self-dismiss after its ten seconds are up */
  useEffect(() => {
    if (!visible) return undefined;

    const hideTimer = setTimeout(dismiss, VISIBLE_MS);
    return () => clearTimeout(hideTimer);
  }, [visible, dismiss]);

  /* Derived rather than synced into state: logging in or starting a login
     elsewhere should hide this immediately, and an effect that calls
     setState would only cause an extra render to say the same thing. */
  if (!visible || isAuthenticated || suppressed || pendingSession) return null;

  const handleClick = async () => {
    markSeen();
    try {
      await startLogin();
      setVisible(false);
    } catch {
      // The error is surfaced by the login form; this prompt just steps aside
      setVisible(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Sign in with WhatsApp"
      className="fixed z-[9998] top-20 left-4 right-4 sm:top-24 sm:right-6 sm:left-auto sm:w-[22rem]
                 animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="rounded-2xl bg-white shadow-2xl border border-hair p-4 flex items-center gap-2.5">
        <div className="shrink-0 w-9 h-9 rounded-full bg-surface border border-hair flex items-center justify-center">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413Z" />
          </svg>
        </div>

        {/* truncate on both lines keeps this to exactly two lines. Without it the
            title wraps in the ~120px left over after the icon and buttons, and the
            whole prompt grows taller than the fixed elements beside it. */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink leading-tight">
            Sign in with WhatsApp
          </p>
          <p className="truncate text-xs text-muted mt-0.5">
            No password
          </p>
        </div>

        <button
          type="button"
          onClick={handleClick}
          disabled={isStarting}
          className="gl-press shrink-0 whitespace-nowrap rounded-full bg-brand px-3 py-2 gl-lbl text-[10px] text-white
                     transition-colors hover:bg-brandHi disabled:opacity-60"
        >
          {isStarting ? '…' : 'Continue'}
        </button>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 w-6 h-6 rounded-full text-faint hover:text-ink transition-colors"
        >
          <i className="fa-solid fa-xmark text-sm" />
        </button>
      </div>
    </div>
  );
}
