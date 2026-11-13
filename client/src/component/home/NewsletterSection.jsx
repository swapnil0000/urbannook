import { useState } from 'react';
import { Reveal } from '../motion';
import { useJoinCommunityMutation } from '../../store/api/userApi';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Homepage "Join the list". Uses the same signup as the footer (POST /join/community: stores the email and sends the
 *  welcome email) and shows the server's own answer, so the page never claims a success that did not happen.
 *  No discount or unsubscribe promise is made here: the backend sends neither. */
const NewsletterSection = ({ fewProducts = false }) => {
  const [join, { isLoading }] = useJoinCommunityMutation();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null); // { kind: 'ok' | 'error', text }
  const submit = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) { setStatus({ kind: 'error', text: 'Please enter a valid email address.' }); return; }
    setStatus(null);
    try {
      const res = await join({ email: value }).unwrap();
      setStatus({ kind: 'ok', text: res?.message || "You're on the list." });
      setEmail('');
    } catch (err) {
      setStatus({ kind: 'error', text: err?.data?.message || "We couldn't add you just now. Please try again in a moment." });
    }
  };
  return (
    <section className="rd-gift rd-news bg-paper text-ink" aria-labelledby="news-h">
      <Reveal className="rd-news-inner">
        <h2 id="news-h" className="rd-h2 font-archivo text-ink">{fewProducts ? 'Be first to the next piece' : 'Get first access to drops'}</h2>
        <p className="rd-sub font-inter text-muted">{fewProducts ? 'We add new made-to-order pieces often. Join for early access to drops and updates.' : 'New pieces land often. Join the list for early access to drops and updates.'}</p>
        <form onSubmit={submit} className="rd-news-form" noValidate>
          <label htmlFor="news-email" className="sr-only">Email address</label>
          <input id="news-email" type="email" name="email" autoComplete="email" inputMode="email" placeholder="Enter your email" value={email} onChange={(e) => { setEmail(e.target.value); if (status?.kind === 'error') setStatus(null); }} disabled={isLoading} aria-invalid={status?.kind === 'error' || undefined} aria-describedby="news-status" className="font-inter text-ink" data-avoid-overlay />
          <button type="submit" disabled={isLoading} className="font-inter" data-avoid-overlay>{isLoading ? 'Joining…' : 'Join'}</button>
        </form>
        <p id="news-status" role="status" aria-live="polite" className={`rd-news-status font-inter ${status?.kind === 'error' ? 'is-error' : ''}`}>{status?.text || ''}</p>
        <p className="rd-news-fine font-mono uppercase text-muted">Drops, tips and updates. No spam.</p>
      </Reveal>
    </section>
  );
};

export default NewsletterSection;
