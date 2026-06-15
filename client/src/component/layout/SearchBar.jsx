import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchProductsQuery, useGetFeaturedProductsQuery } from '../../store/api/productsApi';

/* ─── Single result row ──────────────────────────────────────────── */
const ResultRow = memo(({ product, onClick }) => {
  const img = product.variantDetails?.[0]?.variantImage?.[0] || product.productImg || null;
  const price = product.variantDetails?.[0]?.variantPrice;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-emerald-50 transition-colors
                 border-b border-gray-100 last:border-0 text-left group"
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
        {img ? (
          <img
            src={img}
            alt={product.productName}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover mix-blend-multiply"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className="fa-solid fa-image text-gray-300 text-sm" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-emerald-800 transition-colors">
          {product.productName}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{product.productCategory}</p>
      </div>
      {price > 0 && (
        <span className="text-sm font-semibold text-[#a89068] shrink-0">₹{price.toLocaleString()}</span>
      )}
      <i className="fa-solid fa-arrow-right text-[10px] text-gray-300 group-hover:text-emerald-600 transition-colors shrink-0" />
    </button>
  );
});
ResultRow.displayName = 'ResultRow';

/* ─── Main search overlay ────────────────────────────────────────── */
const SearchBar = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  // Focus input and reset on open
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    } else {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Debounce — 380ms, clean up on unmount
  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(val.trim()), 380);
  }, []);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const shouldSearch = debouncedQuery.length >= 2;

  const { data: searchData, isFetching } = useSearchProductsQuery(
    { search: debouncedQuery, limit: 8 },
    { skip: !shouldSearch }
  );

  const results = useMemo(
    () => searchData?.data?.listofPublishedProducts || searchData?.data?.products || [],
    [searchData]
  );

  const noResults = shouldSearch && !isFetching && results.length === 0;

  const { data: featuredData } = useGetFeaturedProductsQuery(
    { limit: 4 },
    { skip: !noResults }
  );
  const featured = useMemo(
    () => featuredData?.data?.listofPublishedProducts || featuredData?.data?.products || [],
    [featuredData]
  );

  const handleResultClick = useCallback((productId) => {
    navigate(`/shop?product=${productId}`);
    onClose();
  }, [navigate, onClose]);

  const handleClear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    inputRef.current?.focus();
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[4.5rem] md:pt-[5.5rem] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-2xl animate-in fade-in slide-in-from-top-3 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">

          {/* Input row */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <i className="fa-solid fa-magnifying-glass text-gray-400 text-base shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleChange}
              placeholder="Search products…"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 text-base text-gray-900 placeholder-gray-400 focus:outline-none min-w-0"
            />
            {isFetching && (
              <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin shrink-0" />
            )}
            {query ? (
              <button
                onClick={handleClear}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors shrink-0"
              >
                <i className="fa-solid fa-xmark text-sm text-gray-400" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors shrink-0"
              >
                <i className="fa-solid fa-xmark text-sm text-gray-400" />
              </button>
            )}
          </div>

          {/* Results area */}
          <div className="max-h-[65vh] overflow-y-auto overscroll-contain">

            {/* Matching results */}
            {results.length > 0 && (
              <>
                <p className="px-5 pt-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {results.length} Result{results.length !== 1 ? 's' : ''}
                </p>
                {results.map((product) => (
                  <ResultRow
                    key={product.productId}
                    product={product}
                    onClick={() => handleResultClick(product.productId)}
                  />
                ))}
              </>
            )}

            {/* No results — show probable/featured */}
            {noResults && (
              <div className="px-5 py-4">
                <p className="text-sm text-gray-500 mb-4">
                  No results for{' '}
                  <span className="font-semibold text-gray-800">"{debouncedQuery}"</span>
                </p>
                {featured.length > 0 && (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                      You might like
                    </p>
                    {featured.map((product) => (
                      <ResultRow
                        key={product.productId}
                        product={product}
                        onClick={() => handleResultClick(product.productId)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Prompt before typing */}
            {!shouldSearch && (
              <div className="px-5 py-5 flex items-center gap-3 text-gray-400">
                <i className="fa-regular fa-lightbulb text-base shrink-0" />
                <p className="text-sm">Type at least 2 characters to search</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
