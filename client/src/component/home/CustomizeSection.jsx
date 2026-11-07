import { Link } from 'react-router-dom';
import { Reveal, TextReveal } from '../motion';

const OPTIONS = ['Custom colours', 'Name / text on it', 'Your own livery', 'Gifting', 'Bulk orders'];

/** Homepage "Make it yours": every piece is printed to order, so asking for a change is normal. Two columns on desktop
 *  (heading | copy, options, action), stacked on a phone. The action is a real link to /customize. */
const CustomizeSection = () => (
  <section className="rd-gift rd-cust bg-surface text-ink" aria-label="Make it yours">
    <Reveal className="rd-cust-grid">
      <div>
        <p className="rd-eyebrow font-mono uppercase text-muted">Customization · Made to order</p>
        <TextReveal as="h2" text="Make it yours." className="rd-h2 font-archivo text-ink" />
      </div>
      <div>
        <p className="rd-cust-copy font-inter text-muted" data-avoid-overlay>
          Nothing here sits in a warehouse - every piece is 3D-printed once you order it.
          So a different colour, your name on the side, or a livery we don&apos;t stock is a
          normal ask. Tell us what you want and we&apos;ll come back with what&apos;s
          possible and <span className="text-ink font-semibold">what it costs</span>.
        </p>
        <ul className="rd-cust-opts">
          {OPTIONS.map((t) => <li key={t} className="font-mono uppercase">{t}</li>)}
        </ul>
        <Link to="/customize" className="rd-cust-cta font-inter" data-avoid-overlay>Customize a piece <span aria-hidden="true">→</span></Link>
      </div>
    </Reveal>
  </section>
);

export default CustomizeSection;
