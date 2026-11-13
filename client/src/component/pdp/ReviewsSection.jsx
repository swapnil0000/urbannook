import { useMemo, useState } from 'react';
import { PDP } from '../../content/pdpContent';
import Stars from './Stars';

const R = PDP.reviews;
const onImgErr = (e) => { e.currentTarget.src = '/assets/logo.webp'; };
const reviewImages = (r) => (r.imageUrls?.length ? r.imageUrls : r.imageUrl ? [r.imageUrl] : []).filter(Boolean);
const when = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const SORTS = {
  recent: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  high: (a, b) => b.rating - a.rating || new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  low: (a, b) => a.rating - b.rating || new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
};

/** A review's photos as one swipeable strip (whole photo shown, never cropped). A tap opens the viewer on this review only. */
const Media = ({ imgs, name, onOpen }) => {
  const [i, setI] = useState(0);
  return (
    <div className="pdp-rv-media">
      <div className="pdp-rv-track" onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {imgs.map((u, n) => (
          <button key={`${u}-${n}`} type="button" onClick={() => onOpen(n)} aria-label={`${R.openPhoto} ${name} (${n + 1}/${imgs.length})`}>
            <img src={u} alt="" loading="lazy" decoding="async" onError={onImgErr} />
          </button>
        ))}
      </div>
      {imgs.length > 1 && <span className="pdp-rv-count-badge" aria-hidden="true">{i + 1} / {imgs.length}</span>}
    </div>
  );
};

const Card = ({ rev, currentUserId, onEdit, onOpenPhoto }) => {
  const [open, setOpen] = useState(false);
  const imgs = reviewImages(rev);
  const name = rev.userName || R.customer;
  const long = (rev.desc || '').length > R.longAt;
  return (
    <article className="pdp-rv">
      {imgs.length > 0 && <Media imgs={imgs} name={name} onOpen={(n) => onOpenPhoto(rev, n)} />}
      <div className="pdp-rv-body">
        <div className="pdp-rv-head">
          <b>{name}</b>
          {rev.userId && rev.userId === currentUserId && <button type="button" onClick={() => onEdit(rev)} className="pdp-link">{R.edit}</button>}
        </div>
        <div className="pdp-rv-meta">
          <Stars n={rev.rating} className="pdp-rv-stars" />
          {rev.createdAt && <time dateTime={rev.createdAt}>{when(rev.createdAt)}</time>}
        </div>
        {rev.desc && <p className={`pdp-rv-text${long && !open ? ' is-clamped' : ''}`}>{rev.desc}</p>}
        {long && <button type="button" className="pdp-rv-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? R.readLess : R.readMore}</button>}
      </div>
    </article>
  );
};

/** Marketplace-style ratings & reviews. Summary (score, bars, sort, "with photos") on top, then one card per review: its
 *  photos (swipeable, whole), name, stars, date and text together. A photo opens the viewer on that review's photos with
 *  its own comment. No separate photo gallery, so no photo appears twice. `children` is the write-a-review form. */
const ReviewsSection = ({ reviews, avg, total, dist, currentUserId, visible, onMore, onWrite, onEdit, onOpenPhoto, children }) => {
  const [sort, setSort] = useState('recent');
  const [photosOnly, setPhotosOnly] = useState(false);
  const withPhotos = useMemo(() => reviews.filter((r) => reviewImages(r).length).length, [reviews]);
  const list = useMemo(() => reviews.filter((r) => !photosOnly || reviewImages(r).length).sort(SORTS[sort]), [reviews, sort, photosOnly]);
  const shown = list.slice(0, visible);

  return (
    <>
      <div className="pdp-rhead">
        <h2 className="pdp-h2 font-archivo">{R.heading}</h2>
        <button type="button" onClick={onWrite} className="pdp-btn pdp-btn--solid pdp-btn--sm">{R.write}</button>
      </div>

      {children}

      {reviews.length === 0 ? (
        <p className="pdp-rv-empty">{R.empty}</p>
      ) : (
        <>
          <div className="pdp-rv-top">
            <div className="pdp-rv-score">
              <p className="pdp-rv-avg font-archivo">{Number(avg || 0).toFixed(1)}<span>/5</span></p>
              <Stars n={avg} className="pdp-rv-avgstars" />
              <p className="pdp-rv-count">{total} {total === 1 ? R.rating : R.ratings}</p>
            </div>
            <ul className="pdp-rv-bars" aria-label={R.distribution}>
              {[5, 4, 3, 2, 1].map((star) => (
                <li key={star}>
                  <span>{star} ★</span>
                  <progress max={reviews.length} value={dist[star - 1]} aria-label={`${star} star: ${dist[star - 1]}`} />
                  <span>{dist[star - 1]}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pdp-rv-tools">
            <label className="pdp-rv-sort">
              <span>{R.sortLabel}</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {Object.entries(R.sorts).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </label>
            {withPhotos > 0 && (
              <button type="button" className="pdp-rv-chip" aria-pressed={photosOnly} onClick={() => setPhotosOnly((p) => !p)}>
                <i className="fa-regular fa-image" aria-hidden="true" /> {R.withPhotos} ({withPhotos})
              </button>
            )}
          </div>

          <div className="pdp-rv-cols">
            {shown.map((rev) => <Card key={rev._id} rev={rev} currentUserId={currentUserId} onEdit={onEdit} onOpenPhoto={onOpenPhoto} />)}
          </div>
          {list.length > visible && <button type="button" onClick={onMore} className="pdp-more">{R.more} ({list.length - visible})</button>}
        </>
      )}
    </>
  );
};

export default ReviewsSection;
