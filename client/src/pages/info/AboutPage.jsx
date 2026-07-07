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

  return (
    <div className="font-jakarta bg-paper text-ink min-h-screen">
      <SEOHead title="About Us" url="/about-us" description="Learn about UrbanNook — a proudly Indian brand designing premium 3D-printed desk lamps, pen stands & décor. Our story, values, and commitment to quality." />

      {/* HERO */}
      <section className="max-w-[1280px] mx-auto px-5 pt-14 md:pt-20 pb-10">
        <p className="gl-lbl text-brand mb-4">Our Story</p>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05] max-w-3xl">Designing calm corners for <span className="text-brand">chaotic lives.</span></h1>
        <p className="text-lg text-muted mt-5 max-w-xl">Your desk should tell the story of who you are — a collection of what you love. We 3D-print that, one piece at a time, in India.</p>
        <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg">
          {[[`${totalOrders + 350}+`, 'Orders shipped'], ['100%', 'Made in India'], ['In-house', 'Design & print']].map(([n, l]) => (
            <div key={l} className="border border-hair rounded-2xl p-4 text-center"><div className="text-2xl md:text-3xl font-extrabold">{n}</div><div className="text-[11px] text-muted mt-1">{l}</div></div>
          ))}
        </div>
      </section>

      {/* STORY + TRUST */}
      <section className="max-w-[1280px] mx-auto px-5 py-12 grid lg:grid-cols-2 gap-12 items-start">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Beyond the ordinary.</h2>
          <div className="space-y-5 text-muted mt-6 leading-relaxed">
            <p className="text-ink font-semibold border-l-4 border-brand pl-4">When you buy from Urban Nook you aren't just buying an object — you're investing in a meticulously engineered piece of functional art.</p>
            <p>Founded by design & engineering enthusiasts, we started with one frustration: why should everyday desk objects lack aesthetic integrity? To guarantee quality, we control the entire process.</p>
            <p>Every piece is prototyped, tested and made to order. Secure payments via Razorpay and reliable logistics keep your order protected from checkout to unboxing.</p>
          </div>
          <button onClick={() => navigate('/products')} className="gl-press mt-7 bg-brand text-white font-bold text-sm px-7 py-3.5 rounded-xl hover:bg-brandHi">Shop the collection</button>
        </div>
        <div className="space-y-4">
          {[['🚚', `${totalOrders + 350}+ successful deliveries`, 'Trusted by homes across India'], ['🔒', '100% secure transactions', 'End-to-end encryption via Razorpay'], ['🛠️', 'In-house design & production', 'Strict QC — never cheap drop-shipping']].map(([e, t, d]) => (
            <div key={t} className="border border-hair rounded-2xl p-6 flex gap-4 items-start hover:border-brand transition-colors">
              <span className="text-2xl">{e}</span>
              <div><p className="font-bold">{t}</p><p className="text-sm text-muted mt-1">{d}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* VALUES */}
      <section className="bg-surface border-y border-hair py-16">
        <div className="max-w-[1280px] mx-auto px-5">
          <div className="mb-10"><p className="gl-lbl text-brand mb-2">The Urban Nook Standard</p><h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">The principles we live by</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {aboutValues.map((val) => (
              <div key={val.id} className="bg-white border border-hair rounded-2xl p-6 hover:border-brand hover:shadow-[0_16px_40px_-18px_rgba(20,20,20,.18)] transition-all">
                <div className="flex justify-between items-start mb-5"><i className={`fa-solid ${val.icon} text-xl text-brand`}></i><span className="text-2xl font-extrabold text-hair">{val.id}</span></div>
                <h3 className="font-bold">{val.title}</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
