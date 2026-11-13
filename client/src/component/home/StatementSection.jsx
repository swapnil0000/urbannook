import { Reveal } from '../motion';
import CountUp from './CountUp';
import CoverflowCarousel from './CoverflowCarousel';
import { STATEMENT as C } from '../../content/homeRedesign';
import { useSiteStats } from './useSiteStats';

/** "The UrbanNook way": promise + proof at the left, the featured piece's photos at the right (stacked on a phone, copy first). */
const StatementSection = ({ images }) => {
  const stats = useSiteStats(C.stats);
  return (
  <section className="rd-statement bg-paper text-ink">
    <div className={`rd-statement-grid${images.length ? '' : ' rd-statement-solo'}`}>
      <Reveal className="rd-statement-copy">
        <h2 className="rd-st-h2 font-archivo text-ink">{C.heading}</h2>
        <p className="rd-st-body font-inter text-muted">{C.body}</p>
        {stats.length > 0 && <dl className="rd-st-stats" style={{ gridTemplateColumns: `repeat(${Math.max(stats.length, 1)}, auto)` }}>
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="rd-st-label font-mono uppercase text-muted">{s.label}</dt>
              <dd className="rd-st-value font-archivo text-ink"><CountUp to={s.value} suffix={s.suffix} decimals={s.decimals} />{s.unit && <span className="rd-st-unit text-muted">{s.unit}</span>}</dd>
            </div>
          ))}
        </dl>}
      </Reveal>
      {images.length > 0 && <CoverflowCarousel images={images} />}
    </div>
  </section>
  );
};

export default StatementSection;
