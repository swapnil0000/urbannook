import { useEffect, useState } from 'react';

/** Renders children once the browser is idle (or after `timeout` ms at the latest): popups, prompts and other
 *  extras must not compete with the first paint for network, CPU or API calls. Nothing on the server. */
const AfterIdle = ({ children, timeout = 1500 }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const go = () => setReady(true);
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(go, { timeout });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = setTimeout(go, timeout);
    return () => clearTimeout(t);
  }, [timeout]);
  return ready ? children : null;
};

export default AfterIdle;
