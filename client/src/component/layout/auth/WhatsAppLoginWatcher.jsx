import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useLazyWhatsappLoginStatusQuery } from '../../../store/api/authApi';
import { setShowLoginModal, clearLoginCallback } from '../../../store/slices/uiSlice';
import { useUI } from '../../../hooks/useRedux';
import { trackLogin } from '../../../utils/analytics';
import {
  subscribeWhatsAppLogin,
  getWhatsAppLoginSession,
  clearWhatsAppLoginSession,
} from '../../../utils/whatsappLoginSession';

const POLL_INTERVAL_MS = 3000;

/**
 * Polls a pending WhatsApp login at the app level.
 *
 * It lives outside the login modal because the user leaves for WhatsApp and
 * the modal may be closed by the time they return (or the page may have
 * reloaded entirely). Polling from inside the button would stop there, and
 * the user would be shown the same button again even though their message
 * had already arrived.
 *
 * Renders nothing.
 */
export default function WhatsAppLoginWatcher() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { showNotification } = useUI();
  const { loginCallback } = useSelector((state) => state.ui);

  const session = useSyncExternalStore(
    subscribeWhatsAppLogin,
    getWhatsAppLoginSession,
  );

  const [checkStatus] = useLazyWhatsappLoginStatusQuery();
  const pollRef = useRef(null);
  const busyRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollOnce = useCallback(
    async (token) => {
      // Never run two polls at once — the code is single use, so in a race
      // one poll gets VERIFIED and the other gets EXPIRED
      if (busyRef.current) return;
      busyRef.current = true;

      try {
        const res = await checkStatus(token).unwrap();
        const status = res?.data?.status;

        if (status === 'VERIFIED') {
          stopPolling();
          clearWhatsAppLoginSession();

          trackLogin({
            method: 'whatsapp',
            userId: res.data.userId,
            email: res.data.email,
            name: res.data.name,
          });

          showNotification('WhatsApp login successful!');
          dispatch(setShowLoginModal(false));

          if (loginCallback && loginCallback.startsWith('navigate:')) {
            const path = loginCallback.replace('navigate:', '');
            dispatch(clearLoginCallback());
            navigate(path);
          }
        } else if (status === 'EXPIRED') {
          stopPolling();
          clearWhatsAppLoginSession();
        }
      } catch (error) {
        // Network blip — the next tick retries. The button surfaces its own
        // error, so staying quiet here is fine.
        console.error('[WhatsApp Login] Status poll failed:', error);
      } finally {
        busyRef.current = false;
      }
    },
    [checkStatus, dispatch, loginCallback, navigate, showNotification, stopPolling],
  );

  /* Start polling as soon as a session exists, stop when it is gone */
  useEffect(() => {
    if (!session) {
      stopPolling();
      return undefined;
    }

    // Poll immediately on return so the user does not wait a further 3s
    pollOnce(session.token);

    pollRef.current = setInterval(() => {
      if (Date.now() > session.expiresAt) {
        stopPolling();
        clearWhatsAppLoginSession();
        return;
      }
      pollOnce(session.token);
    }, POLL_INTERVAL_MS);

    return stopPolling;
  }, [session, pollOnce, stopPolling]);

  /* Check as soon as the tab is visible again — mobile freezes timers */
  useEffect(() => {
    if (!session) return undefined;

    const onVisible = () => {
      if (document.visibilityState === 'visible') pollOnce(session.token);
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [session, pollOnce]);

  return null;
}
