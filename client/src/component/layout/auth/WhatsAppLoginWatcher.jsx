import { useEffect, useRef, useSyncExternalStore } from 'react';
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

/* Polling slows down the longer a login goes unanswered.
   Most people send the message within the first few seconds; after that the
   odds drop fast, and someone who walked away should not cost us a request
   every three seconds until the code expires. */
const POLL_SCHEDULE = [
  { untilMs: 30_000, everyMs: 2_000 },   // first 30s — they are probably mid-send
  { untilMs: 90_000, everyMs: 5_000 },   // next minute — slowing down
  { untilMs: Infinity, everyMs: 10_000 }, // the long tail
];

const pollDelayFor = (elapsedMs) =>
  POLL_SCHEDULE.find((step) => elapsedMs < step.untilMs).everyMs;

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

  /**
   * What to run once the login is verified, kept in a ref.
   *
   * useUI() builds a fresh showNotification on every render, and useSelector
   * hands back a new loginCallback reference too. Depending on those in the
   * polling effect made it tear down and restart on every render — which
   * fired a status request each time, and each response re-rendered us. That
   * loop hammered the API. The effect below depends only on stable values,
   * and reads the latest handler from here.
   */
  const onVerifiedRef = useRef(null);
  onVerifiedRef.current = (data) => {
    trackLogin({
      method: 'whatsapp',
      userId: data.userId,
      email: data.email,
      name: data.name,
    });

    showNotification('WhatsApp login successful!');
    dispatch(setShowLoginModal(false));

    if (loginCallback && loginCallback.startsWith('navigate:')) {
      const path = loginCallback.replace('navigate:', '');
      dispatch(clearLoginCallback());
      navigate(path);
    }
  };

  const token = session?.token;
  const expiresAt = session?.expiresAt;

  useEffect(() => {
    if (!token) return undefined;

    let stopped = false;
    let busy = false;
    let timer = null;

    const stop = () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const poll = async () => {
      // The code is single use, so two polls in flight would race: one gets
      // VERIFIED and the other EXPIRED
      if (stopped || busy) return;
      busy = true;

      try {
        const res = await checkStatus(token).unwrap();
        const status = res?.data?.status;

        if (status === 'VERIFIED') {
          stop();
          clearWhatsAppLoginSession();
          onVerifiedRef.current?.(res.data);
        } else if (status === 'EXPIRED') {
          stop();
          clearWhatsAppLoginSession();
        }
      } catch (error) {
        // Network blip — the next tick retries. The login form surfaces its
        // own error, so staying quiet here is fine.
        console.error('[WhatsApp Login] Status poll failed:', error);
      } finally {
        busy = false;
      }
    };

    const startedAt = Date.now();

    /* A self-scheduling timeout rather than an interval, so the gap can grow
       as the attempt gets older. */
    const tick = async () => {
      if (stopped) return;

      if (expiresAt && Date.now() > expiresAt) {
        stop();
        clearWhatsAppLoginSession();
        return;
      }

      // While the page is hidden the customer is in WhatsApp, not waiting on
      // us. Skip the request — coming back fires an immediate poll anyway.
      if (document.visibilityState === "visible") await poll();

      if (!stopped) {
        timer = setTimeout(tick, pollDelayFor(Date.now() - startedAt));
      }
    };

    // Check immediately on return so the user does not wait for the next tick
    poll();
    timer = setTimeout(tick, pollDelayFor(0));

    // Mobile freezes timers in the background, so also check the moment the
    // tab is shown again
    const onVisible = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [token, expiresAt, checkStatus]);

  return null;
}
