import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aboutValues } from '../../data/constant';
import SEOHead from '../../component/SEOHead';
import { useGetPublicStatsQuery } from '../../store/api/statsApi';

const AboutPage = () => {
  const navigate = useNavigate();
  const { data: statsData } = useGetPublicStatsQuery();
  const totalOrders = statsData?.data?.totalOrders || 150;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const stats = [[`${totalOrders + 350}+`, 'Orders shipped'], ['100%', 'Made in India'], ['In-house', 'Design & print']];
  const proof = [[`${totalOrders + 350}+ successful deliveries`, 'Trusted by homes across India'], ['100% secure transactions', 'End-to-end encryption via Razorpay'], ['In-house design & production', 'Strict QC — never cheap drop-shipping']];

  return (
    <div className="rd-doc bg-paper text-ink font-inter selection:bg-brand selection:text-white">
      <SEOHead title="About Us" url="/about-us" description="Learn about UrbanNook - a proudly Indian brand designing premium 3D-printed desk lamps, pen stands & décor. Our story, values, and commitment to quality." />

      <div className="rd-doc-wrap rd-doc-wrap--wide">
        {/* HERO */}
        <header className="rd-about-head">
          <p className="rd-eyebrow font-mono uppercase text-muted">Our Story</p>
          <h1 className="rd-h2 font-archivo text-ink">Designing calm corners for chaotic lives.</h1>
          <p className="rd-sub font-inter text-muted">Your desk should tell the story of who you are - a collection of what you love. We 3D-print that, one piece at a time, in India.</p>
          <dl className="rd-about-stats">
            {stats.map(([n, l]) => (
              <div key={l}><dd className="font-archivo">{n}</dd><dt className="font-mono uppercase text-muted">{l}</dt></div>
            ))}
          </dl>
        </header>

        {/* STORY + TRUST */}
        <section className="rd-about-story">
          <div>
            <h2 className="rd-about-h font-archivo text-ink">Beyond the ordinary.</h2>
            <div className="rd-about-copy font-inter text-muted">
              <p className="rd-about-lead text-ink">When you buy from Urban Nook you aren't just buying an object - you're investing in a meticulously engineered piece of functional art.</p>
              <p>Founded by design & engineering enthusiasts, we started with one frustration: why should everyday desk objects lack aesthetic integrity? To guarantee quality, we control the entire process.</p>
              <p>Every piece is prototyped, tested and made to order. Secure payments via Razorpay and reliable logistics keep your order protected from checkout to unboxing.</p>
            </div>
            <button type="button" onClick={() => navigate('/products')} className="rd-btn font-inter">Shop the collection</button>
          </div>
          <ul className="rd-about-proof">
            {proof.map(([t, d]) => (
              <li key={t}><p className="font-archivo text-ink">{t}</p><p className="font-inter text-muted">{d}</p></li>
            ))}
          </ul>
        </section>
      </div>

      {/* VALUES */}
      <section className="rd-gift rd-about-values bg-ink text-paper" aria-labelledby="about-values-h">
        <div className="rd-about-values-inner">
          <p className="rd-eyebrow font-mono uppercase text-paper/60">The Urban Nook Standard</p>
          <h2 id="about-values-h" className="rd-h2 font-archivo text-paper">The principles we live by</h2>
          <div className="rd-about-vgrid">
            {aboutValues.map((val) => (
              <div key={val.id}>
                <p className="font-mono text-paper/60">{val.id}</p>
                <h3 className="font-archivo text-paper">{val.title}</h3>
                <p className="font-inter text-paper/70">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
