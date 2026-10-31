import { useSiteCampaign } from '../../hooks/useSiteCampaign';

// One tag per campaign theme; a theme with no entry shows no tag.
const LABELS = { diwali: 'Diwali Sale' };

/**
 * "● DIWALI SALE" tag for product cards and the PDP price row — only while a
 * campaign is live on this page (admin's section-accents switch), so it
 * disappears by itself when the sale ends.
 */
const SaleTag = ({ className = '' }) => {
  const { active, can, themeKey } = useSiteCampaign();
  const label = LABELS[themeKey];
  if (!active || !can('sectionAccents') || !label) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 border border-brand/35 bg-brand/10 px-1.5 py-[3px] text-brand ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-brand motion-safe:animate-pulse" aria-hidden="true" />
      <span className="gl-lbl text-[8.5px] leading-none tracking-[0.16em] md:text-[9.5px]">{label}</span>
    </span>
  );
};

export default SaleTag;
