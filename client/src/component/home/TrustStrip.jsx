import { Reveal } from '../motion';
import CountUp from './CountUp';
import { TRUST as C } from '../../content/homeRedesign';
import { useSiteStats } from './useSiteStats';

/** Four proof points as one quiet row: big light figures on the dark band, mono captions, hairlines between. */
const TrustStrip = () => {
  const items = useSiteStats(C.items);
  return (
  <section className="rd-trust text-paper" aria-label={C.label}>
    <Reveal>
      <dl className="rd-trust-grid" style={{ '--n': Math.min(Math.max(items.length, 1), 4) }}>
        {items.map((it) => (
          <div key={it.label} className="rd-trust-item">
            <dt className="rd-trust-label font-mono uppercase text-paper/60">{it.label}</dt>
            <dd className="rd-trust-value font-archivo text-paper">
              <CountUp to={it.value} suffix={it.suffix} decimals={it.decimals} group={it.group} />
              {it.unit && <span className="rd-trust-unit text-paper/60">{it.unit}</span>}
              {it.stars && (
                <span className="rd-stars text-star" role="img" aria-label={`${it.value} out of ${it.stars} stars`}>
                  {'★'.repeat(Math.min(it.stars, Math.round(it.value)))}<span className="opacity-25">{'★'.repeat(Math.max(it.stars - Math.round(it.value), 0))}</span>
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Reveal>
  </section>
  );
};

export default TrustStrip;
