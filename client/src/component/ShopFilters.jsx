import { useState } from 'react';
import { CATEGORY_LABEL } from '../utils/categoryUrl';
import SortMenu from './SortMenu';
import { EMPTY_FILTERS, activeFilterCount, PRICE_RANGES, SORT_OPTIONS, sanitizePrice } from '../utils/shopFilters';

/**
 * Collection filters: Availability (with live counts) and Price range.
 * Desktop: a left sidebar. Mobile: a "Filter" button that opens a drawer.
 *
 * Filters are plain client state, never URL params, on purpose: filtered
 * views must not become separate crawlable/indexable URLs (duplicate
 * content). The server-rendered page always carries the full list.
 *
 * `items` are `{ soldOut, price }`; the page applies `applyShopFilters`
 * (utils/shopFilters.js).
 */
const Section = ({ title, summary, children, open, onToggle }) => {
  return (
    <div className="border-t border-hair py-4">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-start justify-between gap-3 text-left text-[15px] font-semibold text-ink">
        <span className="min-w-0">{title}{summary && <span className="ml-2 font-medium text-brand">Selected: {summary}</span>}</span>
        <span className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">⌃</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
};

const Check = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-3 py-1.5 cursor-pointer text-[14px] text-ink">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--gl-brand))]" />
    {label}
  </label>
);

const compactSelection = (values, labelFor = (value) => value) => {
  if (!values?.length) return '';
  return values.map(labelFor).join(', ');
};

const priceSelection = ({ min, max }) => {
  if (min === '' && max === '') return '';
  const money = (value) => `₹${Number(value).toLocaleString('en-IN')}`;
  if (min !== '' && max !== '') return `${money(min)}-${money(max)}`;
  return min !== '' ? `${money(min)}+` : `Up to ${money(max)}`;
};

const Panel = ({ items, filters, setFilters }) => {
  const [openSection, setOpenSection] = useState(null);
  const inCount = items.filter((x) => !x.soldOut).length;
  const outCount = items.length - inCount;
  const prices = items.map((x) => x.price).filter((n) => n > 0);
  const hi = prices.length ? Math.max(...prices) : 0;
  const set = (patch) => setFilters({ ...filters, ...patch });
  // Category choice only where the grid mixes categories (Shop All), so a
  // shopper can ask for e.g. "most bought in Anime".
  const catCounts = items.reduce((m, x) => { const c = x.p?.productCategory; if (c) m.set(c, (m.get(c) || 0) + 1); return m; }, new Map());
  const chosen = filters.categories || [];
  const toggleCat = (c, on) => set({ categories: on ? [...chosen, c] : chosen.filter((x) => x !== c) });
  // Type = the product a variant belongs to (Wooden Katana, LED Katana, …) - the
  // same groups as the header dropdown's "Products" list.
  const typeCounts = items.reduce((m, x) => { if (x.group) m.set(x.group, (m.get(x.group) || 0) + 1); return m; }, new Map());
  const types = filters.types || [];
  const toggleType = (t, on) => set({ types: on ? [...types, t] : types.filter((x) => x !== t) });
  const n = activeFilterCount(filters);
  const availability = [filters.inStock && 'In stock', filters.outOfStock && 'Out of stock'].filter(Boolean).join(', ');

  return (
    <div>
      <div className="flex items-center justify-between pb-3">
        <p className="text-[15px] text-muted">Filter:</p>
        {n > 0 && <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="text-xs font-bold text-brand hover:underline">Clear all</button>}
      </div>
      {catCounts.size > 1 && (
        <Section title="Category" summary={compactSelection(chosen, (c) => CATEGORY_LABEL[c] || c)} open={openSection === 'category'} onToggle={() => setOpenSection((s) => s === 'category' ? null : 'category')}>
          {[...catCounts].map(([c, n]) => (
            <Check key={c} checked={chosen.includes(c)} onChange={(v) => toggleCat(c, v)} label={`${CATEGORY_LABEL[c] || c} (${n})`} />
          ))}
        </Section>
      )}
      {typeCounts.size > 1 && (
        <Section title="Type" summary={compactSelection(types)} open={openSection === 'type'} onToggle={() => setOpenSection((s) => s === 'type' ? null : 'type')}>
          {[...typeCounts].map(([t, n]) => (
            <Check key={t} checked={types.includes(t)} onChange={(v) => toggleType(t, v)} label={`${t} (${n})`} />
          ))}
        </Section>
      )}
      <Section title="Availability" summary={availability} open={openSection === 'availability'} onToggle={() => setOpenSection((s) => s === 'availability' ? null : 'availability')}>
        <Check checked={filters.inStock} onChange={(v) => set({ inStock: v })} label={`In stock (${inCount})`} />
        <Check checked={filters.outOfStock} onChange={(v) => set({ outOfStock: v })} label={`Out of stock (${outCount})`} />
      </Section>
      <Section title="Price" summary={priceSelection(filters)} open={openSection === 'price'} onToggle={() => setOpenSection((s) => s === 'price' ? null : 'price')}>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRICE_RANGES.map((r) => {
            const on = filters.min === r.min && filters.max === r.max;
            return (
              <button key={r.label} type="button" aria-pressed={on} onClick={() => set(on ? { min: '', max: '' } : { min: r.min, max: r.max })}
                className={`px-3 py-1.5 border text-[13px] font-semibold transition-colors ${on ? 'border-ink bg-ink text-paper' : 'border-hair bg-white text-ink hover:border-ink'}`}>
                {r.label}
              </button>
            );
          })}
        </div>
        {hi > 0 && <p className="text-xs text-muted mb-2">Or set your own · highest is ₹{hi.toLocaleString('en-IN')}</p>}
        <div className="flex items-center gap-2">
          <label className="flex-1 flex items-center border border-hair bg-white px-2 h-10">
            <span className="text-muted text-sm mr-1">₹</span>
            <input type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" placeholder="From" value={filters.min} onChange={(e) => set({ min: sanitizePrice(e.target.value) })} className="w-full bg-transparent text-sm outline-none" aria-label="Minimum price" />
          </label>
          <label className="flex-1 flex items-center border border-hair bg-white px-2 h-10">
            <span className="text-muted text-sm mr-1">₹</span>
            <input type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" placeholder="To" value={filters.max} onChange={(e) => set({ max: sanitizePrice(e.target.value) })} className="w-full bg-transparent text-sm outline-none" aria-label="Maximum price" />
          </label>
        </div>
      </Section>
    </div>
  );
};

/** Desktop sidebar (lg+). */
export const ShopFilterSidebar = (props) => (
  <aside aria-label="Filters" className="hidden w-64 shrink-0 self-start lg:sticky lg:top-24 lg:block">
    <Panel {...props} />
  </aside>
);

/** Mobile/tablet "Filter" button + drawer (below lg). */
export const ShopFilterButton = ({ items, filters, setFilters, resultCount }) => {
  const [open, setOpen] = useState(false);
  const n = activeFilterCount(filters);
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen(true)} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border border-hair bg-white px-3 h-10 text-[13px] font-semibold hover:border-ink sm:gap-2 sm:px-4 sm:text-sm">
        <i className="fa-solid fa-sliders text-xs" aria-hidden="true" /> Filter{n > 0 ? ` (${n})` : ''}
      </button>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="shop-filter-backdrop absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="shop-filter-drawer absolute inset-y-0 left-0 w-[86vw] max-w-sm bg-paper p-5 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="font-extrabold text-lg">Filters</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="text-2xl leading-none">×</button>
            </div>
            <div className="flex-1"><Panel items={items} filters={filters} setFilters={setFilters} /></div>
            <button type="button" onClick={() => setOpen(false)} className="gl-press mt-4 h-12 bg-brand text-white font-bold text-sm rounded-xl">Show {resultCount} {resultCount === 1 ? 'result' : 'results'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Shop grid sort control. */
export const ShopSort = ({ value, onChange }) => <SortMenu value={value} options={SORT_OPTIONS} onChange={onChange} />;

/** Applied filters as removable chips above the grid (tap × to drop one). */
export const ActiveFilterChips = ({ filters, setFilters }) => {
  const chips = [
    ...(filters.categories || []).map((c) => ({ key: `c-${c}`, label: CATEGORY_LABEL[c] || c, drop: { categories: filters.categories.filter((x) => x !== c) } })),
    ...(filters.types || []).map((t) => ({ key: `t-${t}`, label: t, drop: { types: filters.types.filter((x) => x !== t) } })),
    filters.inStock && { key: 'in', label: 'In stock', drop: { inStock: false } },
    filters.outOfStock && { key: 'out', label: 'Out of stock', drop: { outOfStock: false } },
    (filters.min !== '' || filters.max !== '') && { key: 'price', label: filters.min && filters.max ? `₹${filters.min} - ₹${filters.max}` : filters.max ? `Up to ₹${filters.max}` : `From ₹${filters.min}`, drop: { min: '', max: '' } },
  ].filter(Boolean);
  if (!chips.length) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button key={c.key} type="button" onClick={() => setFilters({ ...filters, ...c.drop })} aria-label={`Remove filter ${c.label}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink bg-white px-3 py-1 text-[12px] font-semibold text-ink hover:bg-ink hover:text-paper">
          {c.label} <span aria-hidden="true">×</span>
        </button>
      ))}
      <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="text-[12px] font-bold text-brand underline underline-offset-2">Clear all</button>
    </div>
  );
};
