import { useState } from 'react';
import { useSubmitContactMutation } from '../../store/api/userApi';
import { useUI } from '../../hooks/useRedux';
import DocShell from '../../component/DocShell';
import { supportFaqs, subjectOptions } from '../../data/constant';
import { getSupportWhatsAppUrl, onSupportWhatsAppClick } from '../../utils/contactHelper';

// Opens our support chat directly (app on phones, WhatsApp Web on desktop) — no wa.me landing page.
const SUPPORT_CHAT_TEXT = 'Hi Urban Nook! I need help.';
import useFormValidation from '../../hooks/useFormValidation';

const CustomerSupportPage = () => {
    const [activeTab, setActiveTab] = useState('contact');
    const [expandedFaq, setExpandedFaq] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const [submitContact, { isLoading: isSubmitting }] = useSubmitContactMutation();
    const { showNotification } = useUI();
    
    // Use the validation hook
    const { 
        errors, 
        validateAllFields, 
        clearFieldError, 
        clearAllErrors
    } = useFormValidation();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        
        // Clear error when user starts typing
        if (errors[name]) {
            clearFieldError(name);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate all fields using the hook
        const isValid = validateAllFields(formData);

        if (!isValid) {
            showNotification('Please fix the errors in the form', 'error');
            return;
        }

        try {
            await submitContact(formData).unwrap();
            showNotification('Thank you for contacting us! We will get back to you soon.', 'success');
            
            // Reset form
            setFormData({ name: '', email: '', subject: '', message: '' });
            clearAllErrors();
        } catch (error) {
            console.error('Failed to submit contact form:', error);
            const errorMessage = error?.data?.message || 'Failed to submit contact form. Please try again.';
            showNotification(errorMessage, 'error');
        }
    };


    const waText = SUPPORT_CHAT_TEXT;
    const fieldCls = (bad) => `rd-input font-inter text-ink${bad ? ' is-bad' : ''}`;
    const contacts = [
        { key: 'call', label: 'Call Support', value: '+91 91240 81005', note: 'Mon-Sat, 9AM - 7PM', href: 'tel:+919124081005' },
        { key: 'mail', label: 'Email Us', value: 'urbanadmin@urbannook.in', note: 'Guaranteed response in 24h', href: 'mailto:urbanadmin@urbannook.in' },
        { key: 'wa', label: 'Chat on WhatsApp', value: '+91 91240 81005', note: 'Available 24/7', href: getSupportWhatsAppUrl(waText), onClick: onSupportWhatsAppClick(waText), rel: 'noreferrer' },
    ];

    return (
        <DocShell wide eyebrow="Support" title="How can we assist you?">
            {/* tabs */}
            <div className="rd-seg rd-sup-tabs" role="tablist" aria-label="Support">
                {['contact', 'faq'].map((tab) => (
                    <button key={tab} type="button" role="tab" id={`sup-tab-${tab}`} aria-selected={activeTab === tab} aria-controls={`sup-panel-${tab}`} aria-pressed={activeTab === tab} onClick={() => setActiveTab(tab)} className="font-inter">
                        {tab === 'contact' ? 'Message Us' : 'Common Queries'}
                    </button>
                ))}
            </div>

            {/* contact form tab */}
            {activeTab === 'contact' && (
                <div id="sup-panel-contact" role="tabpanel" aria-labelledby="sup-tab-contact" className="rd-ct-grid rd-sup-grid">
                    <div>
                        <h2 className="rd-ct-h font-archivo text-ink">Send a Request</h2>
                        <p className="rd-ct-p font-inter text-muted">Our team typically responds within 2 hours.</p>
                        <form onSubmit={handleSubmit} className="rd-ct-form" noValidate>
                            <div className="rd-ct-row">
                                <div className="rd-fld">
                                    <label htmlFor="sup-name" className="font-mono uppercase text-muted">Your Name</label>
                                    <input id="sup-name" name="name" autoComplete="name" value={formData.name} onChange={handleInputChange} type="text" required className={fieldCls(errors.name)} aria-invalid={Boolean(errors.name) || undefined} placeholder="John Doe" />
                                    {errors.name && <p className="rd-fld-err" role="alert">{errors.name}</p>}
                                </div>
                                <div className="rd-fld">
                                    <label htmlFor="sup-email" className="font-mono uppercase text-muted">Email Address</label>
                                    <input id="sup-email" name="email" autoComplete="email" value={formData.email} onChange={handleInputChange} type="email" required className={fieldCls(errors.email)} aria-invalid={Boolean(errors.email) || undefined} placeholder="john@example.com" />
                                    {errors.email && <p className="rd-fld-err" role="alert">{errors.email}</p>}
                                </div>
                            </div>
                            <div className="rd-fld">
                                <label htmlFor="sup-topic" className="font-mono uppercase text-muted">Topic</label>
                                <select id="sup-topic" name="subject" value={formData.subject} onChange={handleInputChange} className={`${fieldCls(errors.subject)} rd-input--select`} aria-invalid={Boolean(errors.subject) || undefined}>
                                    {subjectOptions.map((o) => <option key={o.value || 'none'} value={o.value} disabled={o.disabled}>{o.label}</option>)}
                                </select>
                                {errors.subject && <p className="rd-fld-err" role="alert">{errors.subject}</p>}
                            </div>
                            <div className="rd-fld">
                                <label htmlFor="sup-message" className="font-mono uppercase text-muted">Message</label>
                                <textarea id="sup-message" name="message" value={formData.message} onChange={handleInputChange} required rows="5" className={`${fieldCls(errors.message)} rd-input--area`} aria-invalid={Boolean(errors.message) || undefined} placeholder="How can we help you today?"></textarea>
                                {errors.message && <p className="rd-fld-err" role="alert">{errors.message}</p>}
                            </div>
                            <button type="submit" disabled={isSubmitting} className="rd-btn font-inter">{isSubmitting ? 'Processing...' : 'Send Message'}</button>
                        </form>
                    </div>

                    <aside>
                        <ul className="rd-sup-contacts">
                            {contacts.map((c) => (
                                <li key={c.key}>
                                    <a href={c.href} onClick={c.onClick} rel={c.rel}>
                                        <span className="font-mono uppercase text-muted">{c.label}</span>
                                        <span className="rd-sup-v font-archivo text-ink">{c.value}</span>
                                        <span className="font-inter text-muted">{c.note}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </aside>
                </div>
            )}

            {/* FAQ tab: every answer stays in the markup, collapsed with CSS */}
            {activeTab === 'faq' && (
                <div id="sup-panel-faq" role="tabpanel" aria-labelledby="sup-tab-faq">
                    <div className="rd-faq-list">
                        {supportFaqs.map((faq, index) => {
                            const isOpen = expandedFaq === index;
                            return (
                                <div key={faq.id} className="rd-faq-row" data-open={isOpen ? '1' : '0'}>
                                    <h2 className="rd-faq-q">
                                        <button type="button" id={`supfaq-${faq.id}-q`} aria-expanded={isOpen} aria-controls={`supfaq-${faq.id}-a`} onClick={() => setExpandedFaq(isOpen ? null : index)} className="font-archivo text-ink">
                                            <span>{faq.question}</span>
                                            <span className="rd-faq-icon font-mono" aria-hidden="true">{isOpen ? '–' : '+'}</span>
                                        </button>
                                    </h2>
                                    <div id={`supfaq-${faq.id}-a`} role="region" aria-labelledby={`supfaq-${faq.id}-q`} className="rd-faq-a">
                                        <div><p className="font-inter text-muted">{faq.answer}</p></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <p className="rd-sup-more font-inter text-muted">Still need help? <button type="button" onClick={() => setActiveTab('contact')} className="rd-faq-talk font-inter text-ink">Write to us directly</button></p>
                </div>
            )}
        </DocShell>
    );
};

export default CustomerSupportPage;
