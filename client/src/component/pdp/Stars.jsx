/** Filled / empty star row, shared by the product page, its reviews and the photo viewer. */
const Stars = ({ n = 5, className = '' }) => {
  const r = Math.max(0, Math.min(5, Math.round(n)));
  return <span className={`text-star ${className}`} aria-label={`${r} out of 5`}>{'★'.repeat(r)}{'☆'.repeat(5 - r)}</span>;
};

export default Stars;
