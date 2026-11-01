import FestiveCountdown from './FestiveCountdown';
import { useSiteCampaign, THEME_COPY } from '../../hooks/useSiteCampaign';

const LABELS = { diwali: 'Diwali Sale' };

/**
 * Page-level sale strip for shop/category pages (replaces the small centred
 * pill): ink card with a warm glow, the sale name, a short line and the live
 * countdown. Pure CSS (no images/libs); hidden when the campaign is off.
 */
const SaleBanner = ({ className = '' }) => {
  const { active, can, themeKey } = useSiteCampaign();
  const label = LABELS[themeKey];
  if (!active || !can('sectionAccents') || !label) return null;
  const line = THEME_COPY[themeKey]?.bandLine;
  return (
    <div className={`relative overflow-hidden rounded-xl bg-ink px-4 py-3 text-paper ${className}`}
      style={{ backgroundImage: 'radial-gradient(120% 140% at 0% 0%, rgb(var(--gl-brand) / 0.45), transparent 55%), radial-gradient(80% 120% at 100% 100%, rgb(var(--gl-star) / 0.25), transparent 60%)' }}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="font-anton text-[22px] uppercase leading-none tracking-wide md:text-[26px]">{label} <span className="text-star">is live</span></p>
          {line && <p className="mt-1 text-[12.5px] text-paper/75 md:text-[13.5px]">{line}</p>}
        </div>
        <FestiveCountdown tone="light" />
      </div>
    </div>
  );
};

export default SaleBanner;
