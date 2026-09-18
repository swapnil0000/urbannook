import { useState, useSyncExternalStore } from 'react';
import { useWhatsappLoginStartMutation } from '../../../store/api/authApi';
import {
  subscribeWhatsAppLogin,
  getWhatsAppLoginSession,
  startWhatsAppLoginSession,
  clearWhatsAppLoginSession,
} from '../../../utils/whatsappLoginSession';

const TOKEN_TTL_MS = 5 * 60 * 1000;

/**
 * WhatsApp login shuru karne wala button.
 *
 * Ye sirf session banata hai aur WhatsApp kholta hai — polling
 * WhatsAppLoginWatcher karta hai, jo app root pe mounted hai. Isse user
 * kahin se bhi wapas aaye (modal band, page reload, naya tab) login
 * khud complete ho jaata hai.
 */
export default function WhatsAppLoginButton({ onError }) {
  const [startWhatsappLogin, { isLoading }] = useWhatsappLoginStartMutation();
  const [errorMessage, setErrorMessage] = useState('');

  const session = useSyncExternalStore(
    subscribeWhatsAppLogin,
    getWhatsAppLoginSession,
  );

  const openWhatsApp = (waLink) => {
    // 'noopener' feature yahan NAHI de sakte: uske saath window.open()
    // hamesha null return karta hai, chahe tab khul bhi jaye — aur tab
    // fallback current page ko navigate kar deta hai.
    const opened = window.open(waLink, '_blank');

    if (opened) {
      try {
        opened.opener = null;
      } catch {
        /* cross-origin ho chuka ho to ignore */
      }
      return;
    }

    // Popup block (Instagram jaise in-app browsers) — same tab me bhejte
    // hain. Wapas aane pe watcher sessionStorage se resume kar lega.
    window.location.href = waLink;
  };

  const handleClick = async () => {
    setErrorMessage('');

    try {
      const result = await startWhatsappLogin(session?.token).unwrap();
      const { token, waLink, expiresInSeconds } = result?.data || {};

      if (!token || !waLink) throw new Error('Invalid response from server');

      startWhatsAppLoginSession({
        token,
        waLink,
        expiresAt:
          Date.now() + (expiresInSeconds ? expiresInSeconds * 1000 : TOKEN_TTL_MS),
      });

      openWhatsApp(waLink);
    } catch (error) {
      console.error('[WhatsApp Login] Start failed:', error);
      const message =
        error?.data?.message ||
        'WhatsApp login abhi shuru nahi ho paya. Dobara try karein.';
      setErrorMessage(message);
      if (onError) onError(error);
    }
  };

  if (session) {
    return (
      <div className="w-full text-center">
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-700">
          <span className="w-4 h-4 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
          WhatsApp par message bhejne ka intezaar hai…
        </div>

        <p className="mt-3 text-xs text-gray-500">
          WhatsApp khul gaya? Bas <span className="font-semibold">Send</span> dabaiye,
          phir yahan wapas aa jaiye.
        </p>

        {/* Deep link ne text prefill na kiya ho to user khud paste kar sake */}
        <p className="mt-2 text-xs text-gray-500">
          Code:{' '}
          <span className="font-mono font-bold tracking-wider text-gray-800">
            {session.token}
          </span>
        </p>

        <div className="mt-4 flex items-center justify-center gap-4 text-xs">
          <button
            type="button"
            onClick={() => openWhatsApp(session.waLink)}
            className="font-bold text-[#128C7E] hover:underline"
          >
            WhatsApp dobara kholein
          </button>
          <button
            type="button"
            onClick={clearWhatsAppLoginSession}
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
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413Z" />
          </svg>
        )}
        Continue with WhatsApp
      </button>

      {errorMessage && (
        <p className="mt-2 text-center text-xs font-semibold text-red-500">{errorMessage}</p>
      )}
    </div>
  );
}
