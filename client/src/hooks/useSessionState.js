import { useEffect, useState } from 'react';

// useState that survives leaving the page and coming back (product → back):
// kept in sessionStorage under `key`, never in the URL (no duplicate indexable
// URLs). A new `key` (another category) starts from its own saved value.
const read = (key, initial) => {
  try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : initial; } catch { return initial; }
};

export const useSessionState = (key, initial) => {
  const [state, setState] = useState(() => (typeof window === 'undefined' ? initial : read(key, initial)));
  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) { setPrevKey(key); setState(read(key, initial)); }
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(state)); } catch { /* ignore */ } }, [key, state]);
  return [state, setState];
};
