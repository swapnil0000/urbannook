import { Link } from 'react-router-dom';
import SEOHead from '../component/SEOHead';
import { SsrStatus } from '../utils/ssrContext';

// Unknown URLs used to redirect to "/", which search engines treat as a soft 404.
// When server-rendered, the response is a real HTTP 404 (SsrStatus).
// (and it silently broke mistyped ad/landing URLs). Show a real not-found page,
// marked noindex, with a way back into the store.
const NotFound = () => (
  <div className="bg-cream min-h-[70vh] text-ink font-inter flex items-center justify-center px-6 py-20">
    <SEOHead title="Page not found" noIndex />
    <SsrStatus code={404} />
    <div className="max-w-md text-center">
      <p className="text-sm text-ink/60 mb-3">404</p>
      <h1 className="text-3xl md:text-4xl mb-4 font-anton uppercase leading-[.95] text-brand [text-shadow:2px_2px_0_rgb(var(--gl-ink))]">This page doesn't exist</h1>
      <p className="text-ink/60 mb-8">The link may be old or mistyped. Browse the store instead.</p>
      <div className="flex gap-3 justify-center">
        <Link to="/products" className="inline-flex items-center px-5 bg-brand text-white border-[3px] border-ink shadow-[4px_4px_0_rgb(var(--gl-ink))] font-anton uppercase tracking-wide min-h-[48px] rounded-full">Shop all products</Link>
        <Link to="/" className="inline-flex min-h-[48px] items-center px-5 rounded-full border-[3px] border-ink bg-white text-ink font-anton uppercase tracking-wide hover:bg-lime transition-colors">Home</Link>
      </div>
    </div>
  </div>
);

export default NotFound;
