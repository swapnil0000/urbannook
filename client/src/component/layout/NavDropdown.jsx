import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const CLOSE_DELAY_MS = 120; // lets the pointer cross the gap into the panel

/**
 * Desktop header item with a dropdown panel (gyaanstore-style menu, UrbanNook
 * look: ink panel, mono group labels, red accent). Opens on hover and on
 * keyboard focus, closes on Escape / route change. The item itself stays a
 * real link to the category page, so it works without the panel and stays
 * crawlable; the panel's links are real links too.
 */
const NavDropdown = ({ label, to, active, menu }) => {
  const [open, setOpen] = useState(false);
  // Panel photos mount on first open, not in the server HTML: as the first <img>s
  // on every page they were what Google picked as a result thumbnail (the GTA 6
  // stand's /products/<id> showed the Brake Caliper Lamp). Links and labels stay.
  const [seen, setSeen] = useState(false);
  const timer = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); }, [pathname]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => () => clearTimeout(timer.current), []);

  const show = () => { clearTimeout(timer.current); setOpen(true); setSeen(true); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS); };

  return (
    <div
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) hide(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
    >
      <Link
        to={to}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-1 font-anton uppercase tracking-wide text-[15px] px-3.5 py-1.5 rounded-full border-2 transition-colors ${active ? 'bg-forest border-forest text-lime' : open ? 'bg-lime border-ink text-ink' : 'border-transparent text-ink hover:bg-lime hover:border-ink'}`}
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
      </Link>

      {/* pt-4 bridges the gap under the header so hover never drops */}
      <div className={`absolute left-1/2 top-full -translate-x-1/2 pt-4 z-50 transition-all duration-200 motion-reduce:transition-none ${open ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1 pointer-events-none'}`}>
        <div className="flex gap-6 rounded-t-[24px] border-[3px] border-b-0 border-ink bg-cream text-ink p-6 min-w-[420px]">
          <div className="flex gap-8">
            {menu.groups.map((g) => (
              <div key={g.title} className="min-w-[160px]">
                <p className="font-anton uppercase tracking-wide text-[15px] text-brand mb-3">{g.title}</p>
                <ul className={`list-none m-0 p-0 ${g.links.some((l) => l.img) ? 'grid grid-cols-2 gap-x-6 gap-y-3 min-w-[520px]' : 'space-y-2'}`}>
                  {g.links.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className={`group flex justify-between gap-3 text-[14px] font-semibold text-ink/85 hover:text-brand ${l.img ? 'items-center' : 'items-baseline'}`}>
                        <span className="flex items-center gap-3 min-w-0">
                          {l.img && <img src={l.img} alt="" loading="lazy" className="h-11 w-11 shrink-0 object-contain rounded-xl border-2 border-ink bg-white transition-transform duration-300 group-hover:scale-105" />}
                          <span className="group-hover:underline underline-offset-4 decoration-2 decoration-brand">{l.label}</span>
                        </span>
                        {l.count > 1 && <span className="rounded-full bg-forest text-lime px-1.5 text-[11px] font-bold tabular-nums">{l.count}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {menu.featured && (
            <Link to={menu.featured.to} className="group w-40 shrink-0 self-start">
              <span className="block aspect-square overflow-hidden rounded-2xl border-[3px] border-ink bg-white rotate-2 shadow-[4px_4px_0_rgb(var(--gl-ink))] transition-transform group-hover:rotate-0">
                <img src={menu.featured.img} alt={menu.featured.name} loading="lazy" className="w-full h-full object-contain p-1 transition-transform duration-500 group-hover:scale-105" />
              </span>
              <span className="mt-2 block text-[13px] font-anton uppercase leading-snug text-ink group-hover:text-brand line-clamp-2">{menu.featured.name}</span>
            </Link>
          )}
        </div>
        <Link to={to} className="block rounded-b-[24px] border-[3px] border-ink bg-forest px-6 py-3 font-anton uppercase tracking-wide text-[15px] text-lime shadow-[6px_6px_0_rgb(var(--gl-ink))] hover:bg-brand hover:text-white transition-colors">View all {label} →</Link>
      </div>
    </div>
  );
};

export default NavDropdown;
