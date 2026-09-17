import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  useWhatsappLoginStartMutation,
  useLazyWhatsappLoginStatusQuery,
} from '../../../store/api/authApi';
import { clearLoginCallback } from '../../../store/slices/uiSlice';
import { trackLogin } from '../../../utils/analytics';

/* Backend token 5 min me expire karta hai — dono taraf same rakhna zaroori hai */
const TOKEN_TTL_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 3000;

/* User WhatsApp pe switch karta hai, isliye session me token rakhte hain.
   Wapas aane pe (Instagram webview me page reload ho sakta hai) polling
   wahin se resume ho jaati hai. */
const STORAGE_KEY = 'whatsappLoginSession';

const readSession = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.expiresAt || Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeSession = (session) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* private mode — polling phir bhi is tab me chalti rahegi */
  }
};

const clearSession = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

export default function WhatsAppLoginButton({ onSuccess, onError }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loginCallback } = useSelector((state) => state.ui);

  const [startWhatsappLogin, { isLoading: isStarting }] =
    useWhatsappLoginStartMutation();
  const [checkStatus] = useLazyWhatsappLoginStatusQuery();

  // idle → waiting (user WhatsApp pe hai) → expired
  const [phase, setPhase] = useState('idle');
  const [session, setSession] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const pollRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const handleVerified = useCallback(
    (data) => {
      stopPolling();
      clearSession();
      setPhase('idle');
      setSession(null);

      trackLogin({
        method: 'whatsapp',
        userId: data.userId,
        email: data.email,
        name: data.name,
      });

      if (onSuccess) onSuccess(data);

      if (loginCallback && loginCallback.startsWith('navigate:')) {
        const path = loginCallback.replace('navigate:', '');
        dispatch(clearLoginCallback());
        navigate(path);
      }
    },
    [dispatch, loginCallback, navigate, onSuccess, stopPolling],
  );

  /* Ek poll — VERIFIED pe login, EXPIRED pe rok do */
  const pollOnce = useCallback(
    async (token) => {
      try {
        const res = await checkStatus(token).unwrap();
        const status = res?.data?.status;

        if (status === 'VERIFIED') {
          handleVerified(res.data);
        } else if (status === 'EXPIRED') {
          stopPolling();
          clearSession();
          setSession(null);
          setPhase('expired');
        }
      } catch (error) {
        // Network blip ya rate limit — agli tick pe dobara try hoga
        console.error('[WhatsApp Login] Status poll failed:', error);
      }
    },
    [checkStatus, handleVerified, stopPolling],
  );

  const startPolling = useCallback(
    (activeSession) => {
      stopPolling();
      setSession(activeSession);
      setPhase('waiting');

      pollRef.current = setInterval(() => {
        if (Date.now() > activeSession.expiresAt) {
          stopPolling();
          clearSession();
          setSession(null);
          setPhase('expired');
          return;
        }
        pollOnce(activeSession.token);
      }, POLL_INTERVAL_MS);
    },
    [pollOnce, stopPolling],
  );

  /* Page reload / WhatsApp se wapas aane pe pending login resume karo */
  useEffect(() => {
    const existing = readSession();
    if (existing) startPolling(existing);
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Tab wapas focus me aate hi turant check — 3s ka wait na karna pade */
  useEffect(() => {
    if (phase !== 'waiting' || !session) return undefined;

    const onVisible = () => {
      if (document.visibilityState === 'visible') pollOnce(session.token);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [phase, session, pollOnce]);

  const handleClick = async () => {
    setErrorMessage('');

    try {
      const result = await startWhatsappLogin().unwrap();
      const { token, waLink, expiresInSeconds } = result?.data || {};

      if (!token || !waLink) {
        throw new Error('Invalid response from server');
      }

      const activeSession = {
        token,
        waLink,
        expiresAt: Date.now() + (expiresInSeconds ? expiresInSeconds * 1000 : TOKEN_TTL_MS),
      };

      writeSession(activeSession);
      startPolling(activeSession);

      // Naya tab preferred hai (polling zinda rehti hai). Instagram jaise
      // in-app browsers popup block karte hain — wahan same tab me bhejte
      // hain, aur wapas aane pe session se polling resume ho jaati hai.
      const opened = window.open(waLink, '_blank', 'noopener,noreferrer');
      if (!opened) window.location.href = waLink;
    } catch (error) {
      console.error('[WhatsApp Login] Start failed:', error);
      const message =
        error?.data?.message || 'WhatsApp login abhi shuru nahi ho paya. Dobara try karein.';
      setErrorMessage(message);
      setPhase('idle');
      if (onError) onError(error);
    }
  };

  const handleCancel = () => {
    stopPolling();
    clearSession();
    setSession(null);
    setPhase('idle');
  };

  if (phase === 'waiting' && session) {
    return (
      <div className="w-full text-center">
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-700">
          <span className="w-4 h-4 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
          WhatsApp par message bhejne ka intezaar hai…
        </div>

        <p className="mt-3 text-xs text-gray-500">
          WhatsApp khul gaya? Bas <span className="font-semibold">Send</span> dabaiye.
        </p>

        {/* Deep link ne text prefill na kiya ho to user khud paste kar sake */}
        <p className="mt-2 text-xs text-gray-500">
          Code:{' '}
          <span className="font-mono font-bold tracking-wider text-gray-800">
            {session.token}
          </span>
        </p>

        <div className="mt-4 flex items-center justify-center gap-4 text-xs">
          <a
            href={session.waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#128C7E] hover:underline"
          >
            WhatsApp dobara kholein
          </a>
          <button
            type="button"
            onClick={handleCancel}
            className="font-bold text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={isStarting}
        className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isStarting ? (
          <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413Z" />
          </svg>
        )}
        Continue with WhatsApp
      </button>

      {phase === 'expired' && (
        <p className="mt-2 text-center text-xs font-semibold text-amber-600">
          Code expire ho gaya. Dobara try karein.
        </p>
      )}

      {errorMessage && (
        <p className="mt-2 text-center text-xs font-semibold text-red-500">{errorMessage}</p>
      )}
    </div>
  );
}
