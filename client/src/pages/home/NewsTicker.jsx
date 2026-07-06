import { Link } from 'react-router-dom';

/** GullyLabs-style announcement bar (dark, centered). */
const NewsTicker = () => (
  <Link
    to="/products"
    className="block bg-ink text-white text-center py-2 font-jakarta gl-lbl text-[10px] tracking-[0.18em] hover:bg-black transition-colors"
    aria-label="Shop all products"
  >
    Free shipping over ₹999 · COD available · Made in India 🇮🇳 · New drop live now
  </Link>
);

export default NewsTicker;
