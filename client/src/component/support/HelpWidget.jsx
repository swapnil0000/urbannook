import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { SUPPORT_EMAIL, SUPPORT_HOURS, getSupportWhatsAppUrl, onSupportWhatsAppClick } from '../../utils/contactHelper';

// Never on the money pages - nothing should pull a shopper away mid-payment.
const HIDDEN_ON = [/^\/checkout/, /^\/payment-/, /^\/order-confirm/];

// Answers are the store's own policies as already written on the contact page,
// return policy and product pages - nothing here promises anything new.
const CATEGORIES = [
  {
    id: 'delivery', title: 'Orders & Delivery', icon: 'fa-truck-fast', tint: 'bg-sky-100 text-sky-700',
    faqs: [
      { q: 'How fast will my order ship?', a: 'Every piece is made to order and dispatched within 24-48 hours, with delivery pan-India.' },
      { q: 'How do I track my order?', a: 'Once your order is dispatched you get a tracking link by email and SMS. You can also see the live status in My Orders.' },
      { q: 'Do you ship outside India?', a: 'Right now we ship to all pin codes within India only.' },
    ],
  },
  {
    id: 'offers', title: 'Offers & Free Stands', icon: 'fa-tag', tint: 'bg-rose-100 text-rose-700',
    faqs: [
      { q: 'How do the offers work?', a: 'Offers apply automatically in your cart, no code needed. Every live offer is listed on the product page, and the offer price shows in your cart before you pay.' },
      { q: 'How do I get a free or discounted katana stand?', a: 'Add your katana and the stand you want to the cart. The stand price drops in the cart as soon as the offer applies. One stand offer applies per order.' },
      { q: 'Can I use a coupon with an offer?', a: 'Some offers work together with coupons and some do not. Your cart always shows the final price before you pay.' },
    ],
  },
  {
    id: 'payment', title: 'Payment & COD', icon: 'fa-wallet', tint: 'bg-emerald-100 text-emerald-700',
    faqs: [
      { q: 'Is Cash on Delivery available?', a: 'Partial COD is available on eligible products. You can choose it at checkout.' },
      { q: 'Is my payment secure?', a: 'Online payments are processed by Razorpay. We never see or store your card details.' },
    ],
  },
  {
    id: 'damage', title: 'Damage & Replacement', icon: 'fa-rotate-left', tint: 'bg-amber-100 text-amber-700',
    faqs: [
      { q: 'What if my item arrives damaged?', a: 'If your item arrives damaged, defective or wrong, report it within 3 days with an unboxing video showing the product and its shipping label, and we will replace it free.' },
      { q: 'Do you accept returns?', a: 'We do not accept returns or exchanges for change of mind, colour or preference. Damaged, defective or wrong items are replaced free.' },
    ],
  },
  {
    id: 'custom', title: 'Customisation', icon: 'fa-palette', tint: 'bg-violet-100 text-violet-700',
    faqs: [
      { q: 'Can I get a product customised?', a: 'Yes. Many designs can take a colour, name or style change. Tell us what you want on the Customize page or on WhatsApp.' },
    ],
  },
];
const VISIBLE_CATEGORIES = 4;

const Chevron = () => <i className="fa-solid fa-chevron-right text-[12px] text-ink/70" aria-hidden="true" />;

// `whatsapp` = message text: opens our support chat directly (no wa.me landing page)
const Row = ({ icon, tint, title, sub, onClick, whatsapp, to, onNavigate }) => {
  const body = (
    <>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tint}`}><i className={`${icon} text-[16px]`} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[14.5px] font-bold leading-snug text-ink">{title}</span>
        {sub && <span className="block text-[11.5px] leading-snug text-muted">{sub}</span>}
      </span>
      <Chevron />
    </>
  );
  const cls = 'flex w-full items-center gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-ink/[0.04]';
  if (to) return <Link to={to} onClick={onNavigate} className={cls}>{body}</Link>;
  if (whatsapp) return <a href={getSupportWhatsAppUrl(whatsapp)} onClick={onSupportWhatsAppClick(whatsapp)} rel="noopener noreferrer" className={cls}>{body}</a>;
  return <button type="button" onClick={onClick} className={cls}>{body}</button>;
};

const Faq = ({ q, a }) => (
  <details className="group border-b border-hair py-3 last:border-b-0">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13.5px] font-bold text-ink">
      {q}
      <i className="fa-solid fa-plus shrink-0 text-[11px] text-brand transition-transform group-open:rotate-45" aria-hidden="true" />
    </summary>
    <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{a}</p>
  </details>
);

const Card = ({ title, children }) => (
  <section className="rounded-xl bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
    {title && <h3 className="mb-1.5 text-[16px] font-extrabold text-ink">{title}</h3>}
    {children}
  </section>
);

/**
 * "Help & Support" panel: Message Us (WhatsApp to the support number - those
 * messages land in the admin WhatsApp inbox and the team replies there, which
 * the shopper receives on WhatsApp), and Browse FAQs with search and categories.
 */
const HelpPanel = ({ onClose, pageContext }) => {
  const panelRef = useRef(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return null;
    return CATEGORIES.flatMap((c) => c.faqs).filter((f) => `${f.q} ${f.a}`.toLowerCase().includes(term));
  }, [query]);

  const open = CATEGORIES.find((c) => c.id === category);
  const cats = showAll ? CATEGORIES : CATEGORIES.slice(0, VISIBLE_CATEGORIES);

  return createPortal(
    <>
      <style>{`
        @keyframes unHelpFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes unHelpPop { from { opacity: 0; transform: translateY(14px) scale(.98) } to { opacity: 1; transform: none } }
        .un-help-backdrop { animation: unHelpFade .2s ease-out both }
        .un-help-panel { animation: unHelpPop .28s cubic-bezier(.16,1,.3,1) both }
        @media (prefers-reduced-motion: reduce) { .un-help-backdrop, .un-help-panel { animation: unHelpFade .01s linear both } }
      `}</style>
      {/* dimmed only on phones, where the panel is a sheet; on desktop it is a popover */}
      <div className="un-help-backdrop fixed inset-0 z-[9999] bg-black/45 md:bg-transparent" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="un-help-title"
        tabIndex={-1}
        className="un-help-panel fixed inset-x-0 bottom-0 z-[10000] flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl bg-[#f6f6f8] shadow-2xl outline-none md:inset-x-auto md:bottom-[84px] md:right-6 md:max-h-[min(640px,calc(100vh-120px))] md:w-[380px] md:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-hair bg-white px-4 py-3.5">
          {open || results ? (
            <button type="button" onClick={() => { setCategory(null); setQuery(''); }} className="inline-flex items-center gap-2 text-[15px] font-extrabold text-ink">
              <i className="fa-solid fa-arrow-left text-[13px]" aria-hidden="true" /> {open ? open.title : 'Search results'}
            </button>
          ) : (
            <h2 id="un-help-title" className="text-[17px] font-extrabold text-ink">Urban Nook Help &amp; Support</h2>
          )}
          <button type="button" onClick={onClose} aria-label="Close help" className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-hair text-ink hover:bg-ink/5">
            <i className="fa-solid fa-xmark text-[13px]" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
          {open ? (
            <Card>{open.faqs.map((f) => <Faq key={f.q} {...f} />)}</Card>
          ) : results ? (
            <Card>
              {results.length ? results.map((f) => <Faq key={f.q} {...f} />) : (
                <p className="py-3 text-[13px] text-muted">No answer for that yet. Ask us on WhatsApp, we will help.</p>
              )}
            </Card>
          ) : (
            <>
              <Card title="Message Us">
                <Row
                  icon="fa-brands fa-whatsapp" tint="bg-[#25D366]/15 text-[#128C7E]"
                  title="Chat with our team" sub={`On WhatsApp · ${SUPPORT_HOURS}`}
                  whatsapp={`Hi Urban Nook! I need help.${pageContext}`}
                />
                <Row
                  icon="fa-solid fa-bag-shopping" tint="bg-sky-100 text-sky-700"
                  title="Want to purchase" sub="Bulk, gifting or custom orders"
                  whatsapp={`Hi Urban Nook! I want to place an order.${pageContext}`}
                />
                <Row icon="fa-solid fa-box" tint="bg-amber-100 text-amber-700" title="Track my order" sub="My Orders" to="/orders" onNavigate={onClose} />
              </Card>

              <Card title="Browse FAQs">
                <label className="relative mb-1.5 block">
                  <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted" aria-hidden="true" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search"
                    aria-label="Search FAQs"
                    className="w-full rounded-lg border border-hair bg-white py-2.5 pl-9 pr-3 text-[14px] text-ink outline-none focus:border-ink"
                  />
                </label>
                {cats.map((c) => (
                  <Row key={c.id} icon={`fa-solid ${c.icon}`} tint={c.tint} title={c.title} onClick={() => setCategory(c.id)} />
                ))}
                {CATEGORIES.length > VISIBLE_CATEGORIES && (
                  <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2 w-full rounded-lg border border-hair py-2.5 text-[12.5px] font-bold uppercase tracking-wide text-ink hover:bg-ink/5">
                    {showAll ? 'Show fewer categories' : 'Show more categories'}
                  </button>
                )}
              </Card>
            </>
          )}
        </div>

        <p className="border-t border-hair bg-white px-4 py-2.5 text-center text-[11.5px] text-muted" style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}>
          Replies on WhatsApp · {SUPPORT_HOURS} · <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>
        </p>
      </div>
    </>,
    document.body,
  );
};

/**
 * Floating "Help" button (bottom right, above the phone nav bar) that opens the
 * Help & Support panel - a popover on desktop, a bottom sheet on phones.
 */
const HelpWidget = () => {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { pathname } = useLocation();
  if (HIDDEN_ON.some((re) => re.test(pathname))) return null;
  // the page the shopper asked from, so the team knows what they were looking at
  const pageContext = typeof window !== 'undefined' ? `\n\n(Page: ${window.location.origin}${pathname})` : '';

  return (
    <>
      {/* phones: just above the bottom nav; lifted over a sticky buy bar while one is on screen */}
      <style>{`
        .un-help-fab { bottom: calc(env(safe-area-inset-bottom) + 70px); transition: bottom .3s ease, transform .2s ease }
        body:has([data-sticky-buybar]) .un-help-fab { bottom: calc(env(safe-area-inset-bottom) + 136px) }
        @media (min-width: 768px) { .un-help-fab, body:has([data-sticky-buybar]) .un-help-fab { bottom: 1.5rem } }
        @media (min-width: 768px) { body:has([data-sticky-buybar="all"]) .un-help-fab { bottom: 6rem } }
      `}</style>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Help and support"
        // phones: a small round icon (position: .un-help-fab above); desktop: the labelled pill in the corner
        className="un-help-fab fixed right-3 z-40 inline-flex h-11 w-11 items-center justify-center gap-2 rounded-full bg-ink text-sm font-bold text-paper shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5 md:bottom-6 md:right-6 md:h-auto md:w-auto md:py-2.5 md:pl-3 md:pr-4"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-paper text-ink">
          <i className={`fa-solid ${open ? 'fa-xmark' : 'fa-question'} text-[11px]`} aria-hidden="true" />
        </span>
        <span className="hidden md:inline">Help</span>
      </button>
      {open && <HelpPanel onClose={close} pageContext={pageContext} />}
    </>
  );
};

export default HelpWidget;
