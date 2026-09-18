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

let current = readFromStorage();

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
