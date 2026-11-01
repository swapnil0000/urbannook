import { useEffect, useId, useRef, useState } from 'react';

/**
 * Compact "Sort by" menu in the store's look. A native <select> is forced to
 * 16px on phones (index.css, so iOS doesn't zoom), which made it oversized
 * next to the Filter button; a button + listbox has no zoom issue and keeps
 * one consistent size. Keyboard: Enter/Space opens, ↑/↓ move, Esc closes.
 */
const SortMenu = ({ value, options, onChange, label = 'Sort by' }) => {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef(null);
  const listId = useId();
  const current = options.find((o) => o.key === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  const pick = (k) => { onChange(k); setOpen(false); };
  const onKey = (e) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault(); setHi(Math.max(0, options.findIndex((o) => o.key === value))); setOpen(true); return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => (i + 1) % options.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => (i - 1 + options.length) % options.length); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(options[hi].key); }
  };

  return (
    <div ref={ref} className="relative shrink-0" onKeyDown={onKey}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${current.label}`}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap border border-hair bg-white px-3 text-[13px] font-semibold text-ink hover:border-ink sm:text-sm"
      >
        <span className="hidden text-muted font-normal sm:inline">{label}:</span>
        <span className="max-w-[118px] truncate sm:max-w-none">{current.label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <ul id={listId} role="listbox" aria-label={label} className="un-scroll absolute right-0 top-full z-40 mt-1 max-h-64 w-56 overflow-y-auto border border-hair bg-white py-1 shadow-xl list-none m-0 p-0">
          {options.map((o, i) => (
            <li key={o.key} role="option" aria-selected={o.key === value}>
              <button
                type="button"
                onClick={() => pick(o.key)}
                onMouseEnter={() => setHi(i)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[14px] ${i === hi ? 'bg-surface' : ''} ${o.key === value ? 'font-bold text-ink' : 'text-ink/80'}`}
              >
                {o.label}
                {o.key === value && <span className="text-brand" aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SortMenu;
