import { useState } from 'react';
import { Reveal } from '../motion';
import Stars from '../pdp/Stars';
import ReviewPhotoViewer from '../ReviewPhotoViewer';
import { getApiUrl } from '../../config/appUrls';
import { useGetGoogleBusinessReviewsQuery } from '../../store/api/statsApi';
import { GOOGLE_BUSINESS as C } from '../../content/homeRedesign';

const when = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '');
const photoUrl = (id, n, size) => `${getApiUrl()}/stats/google-review-photo/${encodeURIComponent(id)}/${n}${size ? `?size=${size}` : ''}`;
/** All photos of a review, our own uploads first: { thumb, full }. */
const imagesOf = (r) => [
  ...(r.ownPhotos || []).map((u) => ({ thumb: u, full: u })),
  ...(r.photos || []).map((n) => ({ thumb: photoUrl(r.id, n, 'thumb'), full: photoUrl(r.id, n) })),
];
const fill = (t, vars) => Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), t);

/** Reviewer photo from Google, falling back to their initial when it is missing or fails to load. */
const Avatar = ({ name, src }) => {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <span className="rd-gb-avatar rd-gb-avatar--initial font-archivo" aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>;
  return <img className="rd-gb-avatar" src={src} alt={fill(C.avatarAlt, { name })} width="40" height="40" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBad(true)} />;
};

const Card = ({ r, onOpen }) => {
  const [open, setOpen] = useState(false);
  const long = r.text.length > C.longAt;
  const midLong = !long && r.text.length > C.longAtPhone; // only truncated in the phone's fixed-size box
  const imgs = imagesOf(r);
  return (
    <article className={`rd-gb-card${open ? ' is-open' : ''}`}>
      <header className="rd-gb-who">
        <Avatar name={r.userName} src={r.avatar} />
        <div>
          <p className="rd-gb-name font-inter">{r.userName}</p>
          <p className="rd-gb-date font-mono uppercase">{when(r.createdAt)}</p>
        </div>
        <span className="rd-gb-g font-archivo" title={C.postedOnGoogle} aria-label={C.postedOnGoogle}>G</span>
      </header>
      <Stars n={r.rating} className="rd-gb-stars" />
      {imgs.length > 0 && (
        <div className={`rd-gb-photos rd-gb-photos--${Math.min(imgs.length, 2)}`}>
          {imgs.slice(0, 2).map((im, i) => (
            <button key={im.thumb} type="button" onClick={() => onOpen(i)} aria-label={fill(C.openPhoto, { name: r.userName })}>
              <img src={im.thumb} alt={fill(C.photoAlt, { name: r.userName })} loading="lazy" decoding="async" />
              {imgs.length > 2 && i === 1 && <span className="rd-gb-photos-more">+{imgs.length - 2}</span>}
            </button>
          ))}
        </div>
      )}
      {r.text && <p className={`rd-gb-text font-inter${long && !open ? ' is-clamped' : ''}`}>{r.text}</p>}
      {(long || midLong) && (
        <button type="button" className={`rd-gb-toggle${midLong ? ' rd-gb-toggle--phone' : ''}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? C.readLess : C.readMore}</button>
      )}
      {r.reply && (
        <div className="rd-gb-reply">
          <p className="font-mono uppercase">{C.reply}</p>
          <p className="font-inter">{r.reply}</p>
        </div>
      )}
    </article>
  );
};

/** Homepage "Loved by our customers": the real Google Business Profile reviews. Masonry columns on desktop/tablet, a
 *  scroll-snap swipe row on a phone (no autoplay). Hidden when there is nothing genuine to show (loading shows a skeleton). */
const GoogleReviewsSection = () => {
  const { data, isLoading } = useGetGoogleBusinessReviewsQuery();
  const [shown, setShown] = useState(C.initialCount);
  const [view, setView] = useState(null); // { review, idx }
  const d = data?.data;
  const list = d?.reviews || [];
  if (!isLoading && !list.length) return null;

  return (
    <section className="rd-gb bg-paper text-ink" aria-label={C.heading}>
      <Reveal className="rd-gb-head">
        <h2 className="rd-h2 font-archivo text-ink">{C.heading}</h2>
        {C.sub && <p className="rd-sub font-inter text-muted">{C.sub}</p>}
        {d?.count > 0 && (
          <p className="rd-gb-rating font-inter">
            <strong className="rd-gb-brand font-archivo">{C.source}</strong>
            <span className="rd-gb-avg">{d.average.toFixed(1)}</span>
            <Stars n={d.average} className="rd-gb-stars" />
            <span className="text-muted">{d.count === 1 ? C.basedOnOne : fill(C.basedOn, { n: d.count.toLocaleString('en-IN') })}</span>
          </p>
        )}
        {(d?.profileUrl || d?.writeReviewUrl) && (
          <p className="rd-gb-links">
            {d.profileUrl && <a className="pdp-link" href={d.profileUrl} target="_blank" rel="noopener noreferrer">{C.viewAll} ↗</a>}
            {d.writeReviewUrl && <a className="pdp-link" href={d.writeReviewUrl} target="_blank" rel="noopener noreferrer">{C.write} ↗</a>}
          </p>
        )}
      </Reveal>
      <div className="rd-gb-cols">
        {isLoading
          ? [...Array(6)].map((_, i) => <div key={i} className="rd-gb-card rd-gb-skel animate-pulse" aria-hidden="true" />)
          : list.slice(0, shown).map((r) => <Card key={r.id} r={r} onOpen={(idx) => setView({ review: r, idx })} />)}
      </div>
      {list.length > shown && (
        <div className="rd-gb-more">
          <button type="button" className="pdp-more" onClick={() => setShown((n) => n + C.step)}>{C.more} ({list.length - shown})</button>
        </div>
      )}
      {view && (
        <ReviewPhotoViewer
          label={C.viewerLabel}
          list={imagesOf(view.review).map((im) => im.full)}
          meta={imagesOf(view.review).map(() => ({ name: view.review.userName, rating: view.review.rating, text: view.review.text, date: when(view.review.createdAt) }))}
          idx={view.idx}
          onIdx={(idx) => setView((v) => ({ ...v, idx }))}
          onClose={() => setView(null)}
        />
      )}
    </section>
  );
};

export default GoogleReviewsSection;
