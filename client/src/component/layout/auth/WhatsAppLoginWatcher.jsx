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
 * Pending WhatsApp login ko app level pe poll karta hai.
 *
 * Ye login modal ke bahar isliye rehta hai kyunki user WhatsApp pe chala
 * jaata hai aur wapas aate waqt modal band ho sakta hai (ya page hi
 * reload ho jaata hai). Polling agar button ke andar hoti to wahin ruk
 * jaati aur user ko dobara wahi button dikhta — chahe uska message
 * pahunch chuka ho.
 *
 * Kuch render nahi karta.
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
      // Do polls ek saath na chalein — token one-time hai, race me ek ko
      // VERIFIED aur doosre ko EXPIRED mil jaata
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
        // Network blip — agli tick pe dobara. Button khud apna error
        // dikhata hai, yahan chup rehna theek hai.
        console.error('[WhatsApp Login] Status poll failed:', error);
      } finally {
        busyRef.current = false;
      }
    },
    [checkStatus, dispatch, loginCallback, navigate, showNotification, stopPolling],
  );

  /* Session hote hi polling chalu, khatam hote hi band */
  useEffect(() => {
    if (!session) {
      stopPolling();
      return undefined;
    }

    // Wapas aate hi turant ek poll — 3s ka wait na karna pade
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

  /* Tab wapas saamne aate hi check — mobile pe timers freeze ho jaate hain */
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
