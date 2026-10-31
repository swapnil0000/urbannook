/**
 * Stock line for product cards and the PDP, from real stock only: "Out of
 * stock", "Only N left" when a tracked quantity is at or below `lowAt`, else
 * "In stock". `left` is null for untracked / product-level stock (no count shown).
 */
const StockStatus = ({ outOfStock, left = null, lowAt = 3, className = '' }) => {
  const qty = left == null ? null : Number(left);
  const low = !outOfStock && qty != null && qty > 0 && qty <= lowAt;
  const tone = outOfStock ? 'text-muted' : low ? 'text-sale' : 'text-save';
  const text = outOfStock ? 'Out of stock' : low ? `Only ${qty} left` : 'In stock';
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold md:text-[12.5px] ${tone} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${outOfStock ? 'bg-muted' : low ? 'bg-sale' : 'bg-save'}`} aria-hidden="true" />
      {text}
    </span>
  );
};

export default StockStatus;
