import { Link } from 'react-router-dom';

/** Editorial red marquee ticker (2040 redesign). */
const NewsTicker = () => {
  const headlines = [
    'New drops often',
    'Free shipping over ₹999',
    'Cash on Delivery available',
    'Made in India · 3D printed',
    'Ready to ship in 48 hrs',
  ];

  return (
    <Link to="/products" className="block bg-un-red text-white border-b-2 border-un-ink overflow-hidden un-eddy" aria-label="Shop all products">
      <div className="un-marquee py-2.5 font-mono text-[11px] tracking-[0.2em] uppercase">
        {[...headlines, ...headlines].map((h, i) => (
          <span key={i} className="inline-flex items-center px-7">
            {h}
            <span className="ml-7 text-[8px] opacity-80">●</span>
          </span>
        ))}
      </div>
    </Link>
  );
};

export default NewsTicker;
