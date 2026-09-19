/**
 * Small global store for a pending WhatsApp login.
 *
 * The user switches to WhatsApp and returns at an arbitrary point — often in
 * the same tab, sometimes after a page reload. So the session cannot live
 * inside a single component: if the login modal closes, the polling dies
 * with it.
 *
 * This is sessionStorage plus a tiny pub/sub, read by both the global
 * watcher and the login button.
 */

const STORAGE_KEY = 'whatsappLoginSession';

const listeners = new Set();

const readFromStorage = () => {
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
    // Private mode or blocked storage — the flow still works, it just will
    // not resume after a page reload
    return null;
  }
};

/* 5 minutes, same as the server's code lifetime */
const RESUME_TTL_MS = 5 * 60 * 1000;

/**
 * Picks up a code handed over in the URL, e.g. /?wa=UN-XXXXXXXXXX
 *
 * The WhatsApp reply carries this link because the customer does not reliably
 * come back to the browser they started in — Instagram's in-app browser sends
 * them to Chrome or Safari, where there is no session. The link seeds one, and
 * the watcher finishes the login exactly as it would have in the original tab.
 *
 * The code is stripped from the address bar straight away so it does not sit
 * in history or leak through a referrer.
 */
const readFromUrl = () => {
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("wa");
    if (!code) return null;

    url.searchParams.delete("wa");
    window.history.replaceState({}, "", url.toString());

    return {
      token: code.trim().toUpperCase(),
      startedAt: Date.now(),
      expiresAt: Date.now() + RESUME_TTL_MS,
    };
  } catch {
    return null;
  }
};

let current = readFromStorage();

/* A code in the URL wins: the customer just arrived from WhatsApp, so it is
   newer than anything left in this tab. */
const fromUrl = readFromUrl();
if (fromUrl) {
  current = fromUrl;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl));
  } catch {
    /* works within this tab regardless */
  }
}

const emit = () => {
  listeners.forEach((fn) => fn());
};

export const subscribeWhatsAppLogin = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** For useSyncExternalStore — must return a stable object reference */
export const getWhatsAppLoginSession = () => current;

export const startWhatsAppLoginSession = (session) => {
  current = session;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* with no storage it still works within this tab */
  }
  emit();
};

export const clearWhatsAppLoginSession = () => {
  current = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  emit();
};
