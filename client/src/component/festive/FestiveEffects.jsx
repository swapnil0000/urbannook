import { useEffect, useState } from 'react';
import { useSiteCampaignState } from '../../hooks/useSiteCampaign';
import FestiveLights from './FestiveLights';
import FestiveSparkles from './FestiveSparkles';
import FestiveFireworks from './FestiveFireworks';
import FestiveClickBurst from './FestiveClickBurst';

/**
 * The page-wide festive layer, mounted once under the header. Each part gates
 * itself on the admin's per-element/per-location/per-device switches, so with
 * no live campaign (or everything switched off) this renders nothing at all.
 */
// Canvas effects wait until the page is loaded and the browser is idle, so
// they never compete with the first render of products/buttons. Measured on a
// 4x-throttled phone: with them starting at once, load-time long tasks on
// /products were roughly double. Lights stay immediate (header décor).
const IDLE_TIMEOUT_MS = 2500;
const useIdleReady = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancel = () => {};
    const start = () => {
      if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(() => setReady(true), { timeout: IDLE_TIMEOUT_MS });
        cancel = () => window.cancelIdleCallback(id);
      } else {
        const t = setTimeout(() => setReady(true), 1200);
        cancel = () => clearTimeout(t);
      }
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => { window.removeEventListener('load', start); cancel(); };
  }, []);
  return ready;
};

const FestiveEffects = () => {
  const { isPreview } = useSiteCampaignState();
  const idle = useIdleReady();
  return (
    <>
      <FestiveLights />
      {idle && (
        <>
          <FestiveSparkles />
          <FestiveFireworks />
          <FestiveClickBurst />
        </>
      )}
      {isPreview && (
        <span className="fixed left-3 bottom-36 sm:bottom-3 z-[60] gl-lbl text-[9px] tracking-wider bg-ink text-star border border-star/60 rounded-full px-3 py-1.5 pointer-events-none">
          Festive preview · not live
        </span>
      )}
    </>
  );
};

export default FestiveEffects;
