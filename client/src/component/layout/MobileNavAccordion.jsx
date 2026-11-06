/**
 * Mobile-menu version of the desktop dropdown (same `menu` from
 * utils/navMenu.js): the name opens the category page, the chevron expands
 * its series / designs / products in place. Big tap targets (≥ 44px).
 * Open state is owned by the menu, so only one section is open at a time
 * (two open at once pushed everything off a phone screen).
 */
const MobileNavAccordion = ({ label, active, menu, onNavigate, open, onToggle }) => {
  return (
    <div className="border-b border-white/10">
      <div className="flex items-center">
        <button type="button" onClick={() => onNavigate(menu.viewAll)} className={`flex-1 text-left py-2.5 font-semibold ${active ? 'text-brand' : 'text-paper'}`}>{label}</button>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`${open ? 'Hide' : 'Show'} ${label} sections`} className="grid h-11 w-11 place-items-center text-paper/70">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
        </button>
      </div>
      {open && (
        <div className="pb-2.5 pl-1 space-y-2">
          {menu.groups.map((g) => (
            <div key={g.title}>
              <p className="gl-lbl text-[10px] text-brand mb-1.5">{g.title}</p>
              <ul className={`list-none m-0 p-0 ${g.links.some((l) => l.img) ? 'grid grid-cols-2 gap-x-3' : ''}`}>
                {g.links.map((l) => (
                  <li key={l.to}>
                    <button type="button" onClick={() => onNavigate(l.to)} className="flex w-full items-center gap-2.5 py-1.5 text-left text-[13.5px] text-paper/85 active:text-paper">
                      {l.img && <img src={l.img} alt="" loading="lazy" className="h-8 w-8 shrink-0 object-cover border border-white/10" />}
                      <span className="flex-1">{l.label}</span>
                      {l.count > 1 && <span className="text-[11px] text-paper/40 tabular-nums">{l.count}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MobileNavAccordion;
