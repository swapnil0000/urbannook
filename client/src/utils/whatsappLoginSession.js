/**
 * Pending WhatsApp login ka chhota sa global store.
 *
 * User WhatsApp pe switch karta hai aur kabhi bhi wapas aata hai — kabhi
 * usi tab me, kabhi page reload ke baad. Isliye session ko kisi ek
 * component ke andar nahi rakh sakte: login modal band ho jaye to
 * polling hi mar jaati hai.
 *
 * Yahan sessionStorage + ek chhota pub/sub hai, jise global watcher aur
 * login button dono padhte hain.
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
    // Private mode ya blocked storage — session ke bina bhi chalega,
    // bas page reload pe resume nahi hoga
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

/** useSyncExternalStore ke liye — same object reference lautana zaroori hai */
export const getWhatsAppLoginSession = () => current;

export const startWhatsAppLoginSession = (session) => {
  current = session;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* storage na ho to bhi is tab me chalta rahega */
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
