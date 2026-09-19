import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import {
  useLazyPasskeyStatusQuery,
  usePasskeyRegisterOptionsMutation,
  usePasskeyRegisterVerifyMutation,
} from '../store/api/passkeyApi';
import { useUI } from '../hooks/useRedux';
import { isInAppBrowser } from '../utils/browserEnv';

const seenKey = (uid) => `pk_prompt_seen:${uid || 'anon'}`;

/**
 * Post-login passkey upsell. Fires ONCE after a fresh login (any method), on
 * supported non-in-app browsers, only when the account has no passkey yet and
 * the user hasn't already answered the prompt. It does NOT enable anything
 * silently — the OS Face ID / fingerprint prompt still requires the user's
 * explicit confirmation. Mounted globally in App.jsx.
 */
const PasskeyPrompt = () => {
  const isAuth = useSelector((s) => s.auth.isAuthenticated);
  const user = useSelector((s) => s.auth.user);
  const { showNotification } = useUI();

  const [checkStatus] = useLazyPasskeyStatusQuery();
  const [regOptions] = usePasskeyRegisterOptionsMutation();
  const [regVerify] = usePasskeyRegisterVerifyMutation();

  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  // Seed with the mount-time auth value so a restored session (reload) is NOT
  // treated as a fresh login — we only prompt on a false -> true transition.
  const prevAuth = useRef(isAuth);

  const markSeen = (uid) => {
    try { localStorage.setItem(seenKey(uid), '1'); } catch { /* ignore */ }
  };

  useEffect(() => {
    const was = prevAuth.current;
    prevAuth.current = isAuth;
    if (was || !isAuth) return; // only on a fresh login this session

    if (typeof window === 'undefined') return;
    if (!browserSupportsWebAuthn() || isInAppBrowser()) return;

    const uid = user?.userId;
    let seen = false;
    try { seen = !!localStorage.getItem(seenKey(uid)); } catch { /* ignore */ }
    if (seen) return;

    // Let the login sheet close first, then check + prompt.
    const t = setTimeout(async () => {
      try {
        const res = await checkStatus().unwrap();
        if (res?.data?.hasPasskey) markSeen(uid);
        else setShow(true);
      } catch { /* status check failed — skip prompting */ }
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]);

  const dismiss = () => {
    markSeen(user?.userId);
    setShow(false);
  };

  const enable = async () => {
    setBusy(true);
    try {
      const optsRes = await regOptions().unwrap();
      const attestation = await startRegistration({ optionsJSON: optsRes.data });
      await regVerify(attestation).unwrap();
      markSeen(user?.userId);
      setShow(false);
      showNotification('Passkey enabled! Next time, sign in with Face ID / fingerprint.', 'success');
    } catch (err) {
      // User dismissed the OS prompt — keep our sheet open so they can retry
      if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
        setBusy(false);
        return;
      }
      showNotification(err?.data?.message || err?.message || 'Could not enable passkey', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[110] bg-ink/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 font-inter text-ink"
      onClick={dismiss}
    >
      <div
        className="bg-paper w-full sm:max-w-[420px] shadow-2xl relative overflow-hidden auth-sheet p-7 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden absolute top-2.5 inset-x-0 flex justify-center pointer-events-none">
          <span className="h-1.5 w-11 rounded-full bg-hair"></span>
        </div>

        <div className="w-16 h-16 rounded-full bg-brand/10 grid place-items-center mx-auto mb-5 mt-2">
          <i className="fa-solid fa-fingerprint text-brand text-2xl"></i>
        </div>
        <p className="gl-lbl text-[10px] text-brand text-center mb-2">Faster sign-in</p>
        <h2 className="font-archivo font-bold text-ink text-2xl text-center leading-tight">
          Skip the password next time
        </h2>
        <p className="text-muted text-sm text-center mt-2 mb-6">
          Enable a passkey to sign in with Face ID, fingerprint or your device PIN &mdash; nothing to remember.
        </p>

        <button
          onClick={enable}
          disabled={busy}
          className="w-full py-4 bg-brand text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-brandHi transition-all gl-press disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-fingerprint"></i>
          {busy ? 'Waiting for confirmation...' : 'Enable one-tap sign-in'}
        </button>
        <button
          onClick={dismiss}
          disabled={busy}
          className="w-full py-3 mt-2 text-muted text-xs font-bold uppercase tracking-widest hover:text-ink transition-colors disabled:opacity-50"
        >
          Not now
        </button>
      </div>
    </div>
  );
};

export default PasskeyPrompt;
