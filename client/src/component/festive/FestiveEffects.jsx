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
const FestiveEffects = () => {
  const { isPreview } = useSiteCampaignState();
  return (
    <>
      <FestiveLights />
      <FestiveSparkles />
      <FestiveFireworks />
      <FestiveClickBurst />
      {isPreview && (
        <span className="fixed left-3 bottom-36 sm:bottom-3 z-[60] gl-lbl text-[9px] tracking-wider bg-ink text-star border border-star/60 rounded-full px-3 py-1.5 pointer-events-none">
          Festive preview · not live
        </span>
      )}
    </>
  );
};

export default FestiveEffects;
