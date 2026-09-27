import { Link } from 'react-router-dom';
import SEOHead from '../component/SEOHead';

// Unknown URLs used to redirect to "/", which search engines treat as a soft 404
// (and it silently broke mistyped ad/landing URLs). Show a real not-found page,
// marked noindex, with a way back into the store.
const NotFound = () => (
  <div className="bg-paper min-h-[70vh] text-ink font-inter flex items-center justify-center px-6 py-20">
    <SEOHead title="Page not found" noIndex />
    <div className="max-w-md text-center">
      <p className="text-sm text-faint mb-3">404</p>
      <h1 className="font-archivo text-3xl md:text-4xl font-extrabold mb-4">This page doesn't exist</h1>
      <p className="text-faint mb-8">The link may be old or mistyped. Browse the store instead.</p>
      <div className="flex gap-3 justify-center">
        <Link to="/products" className="px-5 py-3 bg-brand text-white font-semibold">Shop all products</Link>
        <Link to="/" className="px-5 py-3 border border-hair font-semibold">Home</Link>
      </div>
    </div>
  </div>
);

export default NotFound;
