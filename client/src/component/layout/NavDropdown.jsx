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
  const timer = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); }, [pathname]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => () => clearTimeout(timer.current), []);

  const show = () => { clearTimeout(timer.current); setOpen(true); };
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
        className={`flex items-center gap-1 transition-colors ${active || open ? 'text-brand' : 'text-paper/70 hover:text-brand'}`}
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
      </Link>

      {/* pt-4 bridges the gap under the header so hover never drops */}
      <div className={`absolute left-1/2 top-full -translate-x-1/2 pt-4 z-50 transition-all duration-200 motion-reduce:transition-none ${open ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1 pointer-events-none'}`}>
        <div className="flex gap-6 border border-white/10 bg-ink text-paper shadow-2xl p-5 min-w-[420px]">
          <div className="flex gap-8">
            {menu.groups.map((g) => (
              <div key={g.title} className="min-w-[160px]">
                <p className="gl-lbl text-[10px] text-brand mb-3">{g.title}</p>
                <ul className={`list-none m-0 p-0 ${g.links.some((l) => l.img) ? 'grid grid-cols-2 gap-x-6 gap-y-3 min-w-[520px]' : 'space-y-2'}`}>
                  {g.links.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className={`group flex justify-between gap-3 text-[14px] font-medium text-paper/80 hover:text-paper ${l.img ? 'items-center' : 'items-baseline'}`}>
                        <span className="flex items-center gap-3 min-w-0">
                          {l.img && <img src={l.img} alt="" loading="lazy" className="h-11 w-11 shrink-0 object-cover border border-white/10 bg-white/5 transition-transform duration-300 group-hover:scale-105" />}
                          <span className="group-hover:underline underline-offset-4 decoration-brand">{l.label}</span>
                        </span>
                        {l.count > 1 && <span className="text-[11px] text-paper/40 tabular-nums">{l.count}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {menu.featured && (
            <Link to={menu.featured.to} className="group w-40 shrink-0 self-start">
              <span className="block aspect-square overflow-hidden bg-white/5 border border-white/10">
                <img src={menu.featured.img} alt={menu.featured.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </span>
              <span className="mt-2 block text-[12px] font-semibold leading-snug text-paper/80 group-hover:text-paper line-clamp-2">{menu.featured.name}</span>
            </Link>
          )}
        </div>
        <Link to={to} className="block border border-t-0 border-white/10 bg-un-ink2 px-5 py-2.5 gl-lbl text-[10px] text-paper/70 hover:text-brand">View all {label} →</Link>
      </div>
    </div>
  );
};

export default NavDropdown;
