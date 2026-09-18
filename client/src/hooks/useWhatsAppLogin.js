import { useCallback, useState } from 'react';
import { useWhatsappLoginStartMutation } from '../store/api/authApi';
import { isMobileDevice } from '../utils/browserEnv';
import { startWhatsAppLoginSession } from '../utils/whatsappLoginSession';

const TOKEN_TTL_MS = 5 * 60 * 1000;

/* How long to wait for the app to take over before falling back to a URL.
   Generous on purpose: iOS sometimes shows an "Open in WhatsApp?" prompt
   first, and the page stays visible while that sits there — a short timeout
   would navigate away underneath it. When the handoff succeeds the timer is
   cancelled anyway, so the wait only ever costs the not-installed case. */
const APP_HANDOFF_TIMEOUT_MS = 2500;

/**
 * Opens WhatsApp with as few steps as possible.
 *
 * Mobile tries the whatsapp:// scheme first. The universal wa.me link is not
 * good enough here: in-app browsers (Instagram, Facebook) ignore app links,
 * so wa.me lands on the api.whatsapp.com interstitial AND navigates our page
 * away — the user comes back to WhatsApp's page instead of ours, and the
 * status polling dies with the page. The scheme hands off without replacing
 * the page. If nothing takes over (WhatsApp not installed) we fall back to
 * wa.me, which at least offers the download.
 *
 * Desktop goes straight to web.whatsapp.com/send, which skips the same
 * interstitial and lands in the chat.
 */
export const openWhatsApp = ({ waLink, waWebLink, waAppLink }) => {
  if (!isMobileDevice()) {
    const target = waWebLink || waLink;
    const opened = window.open(target, '_blank');

    if (opened) {
      try {
        // Cannot pass the 'noopener' feature: with it window.open() always
        // returns null even when the tab opens, sending us down the fallback
        // and navigating the current page away.
        opened.opener = null;
      } catch {
        /* already cross-origin — nothing to do */
      }
      return;
    }

    window.location.href = target;
    return;
  }

  if (!waAppLink) {
    window.location.href = waLink;
    return;
  }

  let settled = false;
  let timer = null;

  const cleanup = () => {
    if (timer) clearTimeout(timer);
    document.removeEventListener('visibilitychange', onLeave);
    window.removeEventListener('pagehide', onLeave);
    window.removeEventListener('blur', onLeave);
  };

  // The app taking over hides or blurs this page — that means the handoff
  // worked, so the fallback must not fire
  function onLeave() {
    settled = true;
    cleanup();
  }

  document.addEventListener('visibilitychange', onLeave);
  window.addEventListener('pagehide', onLeave);
  window.addEventListener('blur', onLeave);

  timer = setTimeout(() => {
    cleanup();
    if (!settled && document.visibilityState === 'visible') {
      window.location.href = waLink;
    }
  }, APP_HANDOFF_TIMEOUT_MS);

  window.location.href = waAppLink;
};

/**
 * Starting a WhatsApp login, shared by the login form button and the one-tap
 * prompt so both behave identically.
 *
 * Only starts the login — the polling belongs to WhatsAppLoginWatcher at the
 * app root, so it survives the modal closing or the page reloading.
 */
export function useWhatsAppLogin() {
  const [startWhatsappLogin, { isLoading }] = useWhatsappLoginStartMutation();
  const [errorMessage, setErrorMessage] = useState('');

  const startLogin = useCallback(
    async (existingToken) => {
      setErrorMessage('');

      try {
        const result = await startWhatsappLogin(existingToken).unwrap();
        const { token, waLink, waWebLink, waAppLink, expiresInSeconds } =
          result?.data || {};

        if (!token || !waLink) throw new Error('Invalid response from server');

        const nextSession = {
          token,
          waLink,
          waWebLink,
          waAppLink,
          startedAt: Date.now(),
          expiresAt:
            Date.now() +
            (expiresInSeconds ? expiresInSeconds * 1000 : TOKEN_TTL_MS),
        };

        startWhatsAppLoginSession(nextSession);
        openWhatsApp(nextSession);
        return nextSession;
      } catch (error) {
        console.error('[WhatsApp Login] Start failed:', error);

        // A plain "try again" hides the one case where trying again will not
        // help, so rate limiting gets its own message
        setErrorMessage(
          error?.status === 429
            ? 'Too many attempts. Please wait a few minutes and try again.'
            : error?.data?.message ||
                'Could not start WhatsApp login. Please try again.',
        );
        throw error;
      }
    },
    [startWhatsappLogin],
  );

  return { startLogin, isStarting: isLoading, errorMessage };
}
