import { useState } from 'react';
import { Reveal } from '../motion';

/** Refer & Save teaser - shares the brand (Web Share API, falls back to copy link). Copy is unchanged from the previous
 *  version of this section. */
const ReferSection = () => {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = 'https://www.urbannook.in';
    const text = 'Check out UrbanNook - 3D-printed desk lamps & décor, made to order in India.';
    try {
      if (navigator.share) await navigator.share({ title: 'UrbanNook', text, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* user dismissed the share sheet */ }
  };
  return (
    <section className="rd-gift rd-refer bg-ink text-paper" aria-label="Refer and save">
      <Reveal className="rd-refer-inner">
        <div className="rd-refer-copy">
          <p className="rd-eyebrow font-mono uppercase text-paper/60">Refer &amp; Save</p>
          <h3 className="rd-refer-h font-archivo text-paper">Know someone whose desk needs this?</h3>
          <p className="rd-refer-p font-inter text-paper/70">Share UrbanNook with a friend. Our referral rewards are launching soon - share now and you&apos;ll be first in line to earn.</p>
        </div>
        <button type="button" onClick={share} className="rd-refer-btn font-inter" data-avoid-overlay>
          {copied ? 'Link copied ✓' : 'Share UrbanNook'}
        </button>
      </Reveal>
    </section>
  );
};

export default ReferSection;
