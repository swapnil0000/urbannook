import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GOOGLE_REVIEWS as C } from '../../content/homeRedesign';
import { useGetGoogleReviewsQuery } from '../../store/api/statsApi';

const fmt = (t, vars) => Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), t);
const when = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '');
const Stars = ({ n }) => (
  <span className="rd-gr-stars" role="img" aria-label={fmt(C.stars, { n })}>
    {[1, 2, 3, 4, 5].map((i) => <span key={i} aria-hidden="true" className={i <= n ? 'on' : ''}>★</span>)}
  </span>
);

/** Full-page-feel modal listing the live Google reviews. Closes on Esc / backdrop / ✕; locks page scroll; photos open
 *  larger inside the modal (nothing links out of the site). */
const GoogleReviewsModal = ({ onClose }) => {
  const { data, isLoading, isError, refetch } = useGetGoogleReviewsQuery();
  const [photo, setPhoto] = useState(null);
  const closeRef = useRef(null);
  const d = data?.data;

  useEffect(() => {
    const prev = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') (photo ? setPhoto(null) : onClose()); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; prev?.focus?.(); };
  }, [onClose, photo]);

  return createPortal(
    <div className="rd-gr-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rd-gr" role="dialog" aria-modal="true" aria-labelledby="rd-gr-title">
        <header className="rd-gr-head">
          <div>
            <h2 id="rd-gr-title" className="rd-gr-title font-archivo">{C.title}</h2>
            {d?.count > 0 && <p className="rd-gr-sub font-mono uppercase">{fmt(C.summary, { avg: d.average.toFixed(1), n: d.count })}</p>}
          </div>
          <button ref={closeRef} type="button" className="rd-gr-x" onClick={onClose} aria-label={C.close}>✕</button>
        </header>
        <p className="rd-gr-note font-inter">{C.note}</p>
        <div className="rd-gr-list">
          {isLoading && <p className="rd-gr-state font-inter">{C.loading}</p>}
          {isError && <p className="rd-gr-state font-inter">{C.error} <button type="button" className="rd-gr-link" onClick={refetch}>{C.retry}</button></p>}
          {d && !d.reviews.length && <p className="rd-gr-state font-inter">{C.empty}</p>}
          {d?.reviews.map((r) => (
            <article key={r.id} className="rd-gr-item">
              <div className="rd-gr-top">
                <span className="rd-gr-avatar font-archivo" aria-hidden="true">{r.userName.trim().charAt(0).toUpperCase()}</span>
                <div className="rd-gr-who">
                  <strong className="font-inter">{r.userName}</strong>
                  <span className="font-mono uppercase">{when(r.createdAt)}</span>
                </div>
                <Stars n={r.rating} />
              </div>
              <p className="rd-gr-text font-inter">{r.desc}</p>
              {r.images.length > 0 && (
                <div className="rd-gr-photos">
                  {r.images.map((src) => (
                    <button key={src} type="button" className="rd-gr-photo" onClick={() => setPhoto(src)} aria-label={C.photoOpen}>
                      <img src={src} alt="" loading="lazy" decoding="async" />
                    </button>
                  ))}
                </div>
              )}
              {r.productName && <p className="rd-gr-prod font-mono uppercase">{fmt(C.forProduct, { product: r.productName })}</p>}
            </article>
          ))}
        </div>
        {photo && (
          <div className="rd-gr-lightbox" onClick={() => setPhoto(null)}>
            <img src={photo} alt="" />
            <button type="button" className="rd-gr-x" onClick={() => setPhoto(null)} aria-label={C.photoClose}>✕</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default GoogleReviewsModal;
