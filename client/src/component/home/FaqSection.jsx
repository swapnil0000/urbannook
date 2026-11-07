import { useId, useState } from 'react';
import { Reveal } from '../motion';

/** Homepage "Good to know" FAQ: title + "talk to us" on the left, quiet hairline rows on the right (stacked on a phone).
 *  Every answer stays in the page markup (collapsed with CSS, not removed), so the text is there for crawlers and
 *  screen readers; only the open one is visible. Headings, copy and order come from the `faqs` the page passes in. */
const FaqSection = ({ faqs, onContact }) => {
  const [open, setOpen] = useState(0);
  const base = useId();
  return (
    <section className="rd-gift rd-faq bg-paper text-ink" aria-labelledby={`${base}-h`}>
      <div className="rd-faq-grid">
        <Reveal className="rd-faq-intro">
          <p className="rd-eyebrow font-mono uppercase text-muted">Good to know</p>
          <h2 id={`${base}-h`} className="rd-h2 font-archivo text-ink">Questions? Answered.</h2>
          <p className="rd-sub font-inter text-muted">Still curious? <button type="button" onClick={onContact} className="rd-faq-talk font-inter text-ink">Talk to us →</button></p>
        </Reveal>
        <div className="rd-faq-list">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="rd-faq-row" data-open={isOpen ? '1' : '0'} data-avoid-overlay>
                <h3 className="rd-faq-q">
                  <button type="button" id={`${base}-q${i}`} aria-expanded={isOpen} aria-controls={`${base}-a${i}`} onClick={() => setOpen(isOpen ? -1 : i)} className="font-archivo text-ink">
                    <span>{f.q}</span>
                    <span className="rd-faq-icon font-mono" aria-hidden="true">{isOpen ? '–' : '+'}</span>
                  </button>
                </h3>
                <div id={`${base}-a${i}`} role="region" aria-labelledby={`${base}-q${i}`} className="rd-faq-a">
                  <div><p className="font-inter text-muted">{f.a}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
