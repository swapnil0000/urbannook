import { useState, useEffect } from 'react';
import { useSubmitContactMutation } from '../../store/api/userApi';
import { useUI } from '../../hooks/useRedux';
import useFormValidation from '../../hooks/useFormValidation';
import SEOHead from '../../component/SEOHead';
import DocShell from '../../component/DocShell';
import { contactInfo, contactPageFaqs } from '../../data/constant';

const AccordionItem = ({ id, question, answer, isOpen, onClick }) => (
  <div className="rd-faq-row rd-faq-row--sm" data-open={isOpen ? '1' : '0'}>
    <h3 className="rd-faq-q">
      <button type="button" id={`${id}-q`} aria-expanded={isOpen} aria-controls={`${id}-a`} onClick={onClick} className="font-archivo text-ink">
        <span>{question}</span>
        <span className="rd-faq-icon font-mono" aria-hidden="true">{isOpen ? '–' : '+'}</span>
      </button>
    </h3>
    <div id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} className="rd-faq-a">
      <div><p className="font-inter text-muted">{answer}</p></div>
    </div>
  </div>
);

const ContactPage = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [formData, setFormData] = useState({ name: '', email: '', mobile: '', subject: 'Product Inquiry', message: '' });
  const [openFaq, setOpenFaq] = useState(0);

  const [submitContact, { isLoading }] = useSubmitContactMutation();
  const { showNotification } = useUI();
  const { errors, validateAllFields, clearFieldError, clearAllErrors } = useFormValidation();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) clearFieldError(name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAllFields(formData)) { showNotification('Please fix the errors in the form', 'error'); return; }
    try {
      await submitContact(formData).unwrap();
      showNotification('Thank you for contacting us! We will get back to you soon.', 'success');
      setFormData({ name: '', email: '', mobile: '', subject: 'Product Inquiry', message: '' });
      clearAllErrors();
    } catch (error) {
      showNotification(error?.data?.message || 'Failed to submit contact form. Please try again.', 'error');
    }
  };

  const isMobileValid = !formData?.mobile || /^[6-9]\d{9}$/.test(formData?.mobile?.trim());
  const isFormValid = formData?.name && formData?.email && formData?.message && isMobileValid && Object.keys(errors).length === 0;
  const field = (bad) => `rd-input font-inter text-ink${bad ? ' is-bad' : ''}`;

  const mobileBad = Boolean(formData.mobile) && !/^[6-9]\d{9}$/.test(formData.mobile);
  return (
    <DocShell wide eyebrow="Support & Inquiries" title="Get in touch." sub="Questions, custom requests or order help - we reply within 2-4 business hours.">
      <SEOHead title="Contact Us" url="/contact-us" description="Get in touch with UrbanNook via WhatsApp, email or phone for product inquiries, order support and custom design requests." />

      {/* contact info: three facts in one open row */}
      <dl className="rd-ct-info">
        {contactInfo.map((item) => (
          <div key={item.id}>
            <dt className="font-mono uppercase text-muted">{item.title}</dt>
            <dd className="rd-ct-info-v font-archivo">{item.info}</dd>
            <dd className="rd-ct-info-s font-inter text-muted">{item.subInfo}</dd>
          </div>
        ))}
      </dl>

      {/* form + faq */}
      <div className="rd-ct-grid">
        <div>
          <h2 className="rd-ct-h font-archivo text-ink">Send a message</h2>
          <p className="rd-ct-p font-inter text-muted">Fill out the form and our team will get back to you promptly.</p>
          <form onSubmit={handleSubmit} className="rd-ct-form" noValidate>
            <div className="rd-ct-row">
              <div className="rd-fld">
                <label htmlFor="ct-name" className="font-mono uppercase text-muted">Your name</label>
                <input id="ct-name" type="text" name="name" autoComplete="name" value={formData.name} onChange={handleInputChange} required placeholder="John Doe" className={field(errors.name)} aria-invalid={Boolean(errors.name) || undefined} />
                {errors.name && <p className="rd-fld-err" role="alert">{errors.name}</p>}
              </div>
              <div className="rd-fld">
                <label htmlFor="ct-email" className="font-mono uppercase text-muted">Email address</label>
                <input id="ct-email" type="email" name="email" autoComplete="email" value={formData.email} onChange={handleInputChange} required placeholder="john@example.com" className={field(errors.email)} aria-invalid={Boolean(errors.email) || undefined} />
                {errors.email && <p className="rd-fld-err" role="alert">{errors.email}</p>}
              </div>
            </div>
            <div className="rd-fld">
              <label htmlFor="ct-mobile" className="font-mono uppercase text-muted">Mobile <span className="rd-fld-opt">(optional)</span></label>
              <input id="ct-mobile" type="tel" name="mobile" inputMode="numeric" autoComplete="tel-national" value={formData.mobile} maxLength={10}
                onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setFormData({ ...formData, mobile: val }); if (errors.mobile) clearFieldError('mobile'); }}
                placeholder="10-digit mobile number" className={field(mobileBad)} aria-invalid={mobileBad || undefined} />
              {mobileBad && <p className="rd-fld-err" role="alert">Please enter a valid 10-digit mobile number</p>}
            </div>
            <div className="rd-fld">
              <p className="rd-fld-lbl font-mono uppercase text-muted" id="ct-type">Inquiry type</p>
              <div className="rd-seg" role="group" aria-labelledby="ct-type">
                {['Product Inquiry', 'Support'].map((option) => (
                  <button key={option} type="button" aria-pressed={formData.subject === option} onClick={() => setFormData({ ...formData, subject: option })} className="font-inter">{option}</button>
                ))}
              </div>
            </div>
            <div className="rd-fld">
              <label htmlFor="ct-message" className="font-mono uppercase text-muted">Message</label>
              <textarea id="ct-message" name="message" value={formData.message} onChange={handleInputChange} required rows="5" placeholder="How can we help?" className={`${field(errors.message)} rd-input--area`} aria-invalid={Boolean(errors.message) || undefined}></textarea>
              {errors.message && <p className="rd-fld-err" role="alert">{errors.message}</p>}
            </div>
            <button type="submit" disabled={isLoading || !isFormValid} className="rd-btn font-inter">
              {isLoading ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </div>

        <aside>
          <div className="rd-ct-note">
            <p className="font-mono uppercase text-muted">Fast response guarantee</p>
            <p className="rd-ct-note-p font-inter text-muted">We aim to respond within <b className="text-ink">2-4 business hours</b> on working days.</p>
          </div>
          <h2 className="rd-ct-faq-h font-mono uppercase text-muted">Frequently asked</h2>
          <div className="rd-faq-list">
            {contactPageFaqs.map((faq, index) => (
              <AccordionItem key={faq.question} id={`ctfaq-${index}`} question={faq.question} answer={faq.answer} isOpen={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? null : index)} />
            ))}
          </div>
        </aside>
      </div>
    </DocShell>
  );
};

export default ContactPage;
