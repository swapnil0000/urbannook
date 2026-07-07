import { useState, useEffect } from 'react';
import { useSubmitContactMutation } from '../../store/api/userApi';
import { useUI } from '../../hooks/useRedux';
import useFormValidation from '../../hooks/useFormValidation';
import SEOHead from '../../component/SEOHead';
import { contactInfo, contactPageFaqs } from '../../data/constant';

const AccordionItem = ({ question, answer, isOpen, onClick }) => (
  <div className="border-b border-hair">
    <button onClick={onClick} type="button" className="w-full py-4 flex justify-between items-center text-left gap-4">
      <span className={`text-sm font-semibold ${isOpen ? 'text-brand' : 'text-ink'}`}>{question}</span>
      <span className={`shrink-0 w-6 h-6 rounded-full grid place-items-center text-[10px] transition-all ${isOpen ? 'bg-brand text-white rotate-180' : 'border border-hair text-muted'}`}>▾</span>
    </button>
    {isOpen && <div className="pb-5 text-muted text-sm leading-relaxed">{answer}</div>}
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
  const field = (bad) => `w-full bg-white border rounded-xl px-4 py-3.5 text-sm outline-none transition-colors ${bad ? 'border-sale' : 'border-hair focus:border-brand'}`;

  return (
    <div className="font-jakarta bg-paper text-ink min-h-screen">
      <SEOHead title="Contact Us" url="/contact-us" description="Get in touch with UrbanNook via WhatsApp, email or phone for product inquiries, order support and custom design requests." />

      <section className="max-w-[1280px] mx-auto px-5 pt-14 md:pt-20 pb-8">
        <p className="gl-lbl text-brand mb-3">Support & Inquiries</p>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Get in touch.</h1>
        <p className="text-lg text-muted mt-4 max-w-xl">Questions, custom requests or order help — we reply within 2–4 business hours.</p>
      </section>

      {/* contact info */}
      <section className="max-w-[1280px] mx-auto px-5 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contactInfo.map((item) => (
            <div key={item.id} className="border border-hair rounded-2xl p-6 hover:border-brand transition-colors">
              <div className="w-11 h-11 rounded-full bg-brand/10 text-brand grid place-items-center mb-4"><i className={item.icon}></i></div>
              <p className="gl-lbl text-[10px] text-muted mb-1">{item.title}</p>
              <p className="text-lg font-bold">{item.info}</p>
              <p className="text-xs text-faint mt-1">{item.subInfo}</p>
            </div>
          ))}
        </div>
      </section>

      {/* form + faq */}
      <section className="max-w-[1280px] mx-auto px-5 py-12 grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
        <div className="lg:col-span-7">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">Send a message</h2>
          <p className="text-muted text-sm mb-6">Fill out the form and our team will get back to you promptly.</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="gl-lbl text-[10px] text-muted mb-1.5 block">Your name</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="John Doe" className={field(errors.name)} />
                {errors.name && <p className="text-sale text-xs mt-1.5">{errors.name}</p>}
              </div>
              <div>
                <label className="gl-lbl text-[10px] text-muted mb-1.5 block">Email address</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required placeholder="john@example.com" className={field(errors.email)} />
                {errors.email && <p className="text-sale text-xs mt-1.5">{errors.email}</p>}
              </div>
            </div>
            <div>
              <label className="gl-lbl text-[10px] text-muted mb-1.5 block">Mobile <span className="normal-case tracking-normal text-faint">(optional)</span></label>
              <input type="tel" name="mobile" value={formData.mobile} maxLength={10}
                onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setFormData({ ...formData, mobile: val }); if (errors.mobile) clearFieldError('mobile'); }}
                placeholder="10-digit mobile number" className={field(formData.mobile && !/^[6-9]\d{9}$/.test(formData.mobile))} />
              {formData?.mobile && !/^[6-9]\d{9}$/.test(formData?.mobile) && <p className="text-sale text-xs mt-1.5">Please enter a valid 10-digit mobile number</p>}
            </div>
            <div>
              <p className="gl-lbl text-[10px] text-muted mb-2">Inquiry type</p>
              <div className="flex flex-wrap gap-2.5">
                {['Product Inquiry', 'Support'].map((option) => (
                  <button key={option} type="button" onClick={() => setFormData({ ...formData, subject: option })}
                    className={`gl-press px-5 py-2.5 rounded-full text-sm font-semibold border transition-colors ${formData.subject === option ? 'bg-brand text-white border-brand' : 'bg-white border-hair hover:border-ink'}`}>{option}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="gl-lbl text-[10px] text-muted mb-1.5 block">Message</label>
              <textarea name="message" value={formData.message} onChange={handleInputChange} required rows="4" placeholder="How can we help?" className={`${field(errors.message)} resize-none`}></textarea>
              {errors.message && <p className="text-sale text-xs mt-1.5">{errors.message}</p>}
            </div>
            <button type="submit" disabled={isLoading || !isFormValid} className="gl-press bg-brand text-white font-bold text-sm px-8 py-3.5 rounded-xl hover:bg-brandHi disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-5">
          <div className="border border-hair rounded-2xl p-6 mb-8 bg-surface">
            <div className="flex items-center gap-3 mb-2"><span className="w-10 h-10 rounded-full bg-brand/10 text-brand grid place-items-center">⏱</span><div><p className="font-bold">Fast response guarantee</p><p className="gl-lbl text-[10px] text-brand">Standard SLA</p></div></div>
            <p className="text-sm text-muted">We aim to respond within <b className="text-ink">2–4 business hours</b> on working days.</p>
          </div>
          <h3 className="gl-lbl text-muted mb-3">Frequently asked</h3>
          <div className="border-t border-hair">
            {contactPageFaqs.map((faq, index) => (
              <AccordionItem key={index} question={faq.question} answer={faq.answer} isOpen={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? null : index)} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
