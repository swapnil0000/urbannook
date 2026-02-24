import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubmitContactMutation } from '../../store/api/userApi';
import { useUI } from '../../hooks/useRedux';

// --- Reusable Accordion Component for FAQs (Updated for Light Theme) ---
const AccordionItem = ({ question, answer, isOpen, onClick }) => (
  <div className="border-b border-gray-200">
    <button 
      onClick={onClick} 
      className="w-full py-5 flex justify-between items-center text-left hover:text-[#a89068] transition-colors group"
      type="button"
    >
      <span className={`text-sm md:text-base font-serif transition-colors ${isOpen ? 'text-[#a89068]' : 'text-[#2e443c]'}`}>
        {question}
      </span>
      <span className={`flex items-center justify-center w-6 h-6 rounded-full border transition-all duration-300 ${isOpen ? 'rotate-180 border-[#a89068] bg-[#a89068] text-white' : 'border-gray-300 text-gray-400 group-hover:border-[#a89068] group-hover:text-[#a89068]'}`}>
        <i className="fa-solid fa-chevron-down text-[10px]"></i>
      </span>
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="pb-6 text-gray-500 text-sm leading-relaxed font-light pl-2 border-l-2 border-[#a89068]/20 ml-2 mt-2">
            {answer}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const ContactPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'Product Inquiry',
    message: ''
  });

  const [errors, setErrors] = useState({});
  const [activeInput, setActiveInput] = useState(null);
  const [openFaq, setOpenFaq] = useState(0); // First FAQ open by default

  const [submitContact, { isLoading }] = useSubmitContactMutation();
  const { showNotification } = useUI();

  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'name':
        if (!value.trim()) {
          newErrors.name = 'Name is required';
        } else if (value.trim().length < 2) {
          newErrors.name = 'Name must be at least 2 characters';
        } else if (value.trim().length > 50) {
          newErrors.name = 'Name cannot exceed 50 characters';
        } else {
          delete newErrors.name;
        }
        break;
      
      case 'email':
        if (!value.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/^\S+@\S+\.\S+$/.test(value)) {
          newErrors.email = 'Please provide a valid email address';
        } else {
          delete newErrors.email;
        }
        break;
      
      case 'message':
        if (!value.trim()) {
          newErrors.message = 'Message is required';
        } else if (value.trim().length < 10) {
          newErrors.message = 'Message must be at least 10 characters';
        } else if (value.trim().length > 2000) {
          newErrors.message = 'Message cannot exceed 2000 characters';
        } else {
          delete newErrors.message;
        }
        break;
      
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error when user starts typing
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
    setActiveInput(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields
    const isNameValid = validateField('name', formData.name);
    const isEmailValid = validateField('email', formData.email);
    const isMessageValid = validateField('message', formData.message);

    if (!isNameValid || !isEmailValid || !isMessageValid) {
      showNotification('Please fix the errors in the form', 'error');
      return;
    }

    try {
      await submitContact(formData).unwrap();
      
      // Show success notification
      showNotification('Thank you for contacting us! We will get back to you soon.', 'success');
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        subject: 'Product Inquiry',
        message: ''
      });
      setErrors({});
    } catch (error) {
      console.error('Failed to submit contact form:', error);
      const errorMessage = error?.data?.message || 'Failed to submit contact form. Please try again.';
      showNotification(errorMessage, 'error');
    }
  };

  const isFormValid = formData.name && formData.email && formData.message && Object.keys(errors).length === 0;

  // --- Animation Variants ---
  const fadeIn = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const contactInfo = [
    {
      id: 1,
      icon: "fa-solid fa-phone",
      title: "Contact Number",
      info: "+91 82996 38749",
      subInfo: "Mon-Sat, 9am - 7pm",
    },
    {
      id: 2,
      icon: "fa-solid fa-envelope",
      title: "Any Type Of Enquires",
      info: "support@urbannook.in",
      subInfo: "Response within 24h",
    },
    {
      id: 3,
      icon: "fa-solid fa-location-dot",
      title: "Our Office",
      info: "Gurgaon, India",
      subInfo: "Sector 51, 122001",
    }
  ];

  const faqs = [
    {
      question: "Do you offer custom 3D printed designs?",
      answer: "Yes, we love bringing your ideas to life. Whether it's a specific color variant or a completely bespoke piece, select 'Interior Design' in the form and detail your vision."
    },
    {
      question: "How long does standard shipping take?",
      answer: "All our pieces are made to order to ensure the highest quality. Please allow 3-5 business days for production, and an additional 3-4 days for pan-India delivery."
    },
    {
      question: "What is your return policy?",
      answer: "We offer a hassle-free 7-day return policy for any items damaged in transit. We just request a quick unboxing video to process replacements swiftly."
    },
    {
      question: "Do you ship internationally?",
      answer: "Currently, we are focusing on providing the best experience across India. International shipping is on our roadmap for late 2026."
    }
  ];

  return (
    <div className="bg-[#2e443c] min-h-screen text-gray-200 font-sans relative selection:bg-[#a89068] selection:text-white overflow-x-hidden">
      
      {/* 1. BACKGROUND ATMOSPHERE */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#3a554a] via-[#2e443c] to-[#1a2822] pointer-events-none z-0 opacity-50"></div>
      
      {/* Noise Texture */}
      <div className="fixed inset-0 opacity-[0.04] pointer-events-none z-0 mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      {/* --- HERO SECTION --- */}
      <section className="relative lg:pt-32 pt-24 px-6 lg:px-12 overflow-hidden flex items-center border-b border-[#a89068]/20 ">
        <div className="max-w-4xl mx-auto text-center">
             <motion.div 
               initial="hidden"
               animate="visible"
               variants={stagger}
               className="flex flex-col items-start"
             >
                <motion.div variants={fadeIn} className="flex items-center gap-4 mb-8">
                    <span className="h-[1px] w-12 md:w-16 bg-[#F5DEB3]"></span>
                    <span className="text-[10px] font-bold tracking-[0.3em] text-[#F5DEB3] uppercase">
                        Support & Inquiries
                    </span>
                    <span className="h-[1px] w-12 md:w-16 bg-[#F5DEB3]"></span>
                </motion.div>
             </motion.div>
        </div>
      </section>

      {/* --- CONTACT INFO GRID (LIGHT BOXES) --- */}
      <section className="py-4 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {contactInfo.map((item, index) => (
                    <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="group bg-[#f5f7f8] p-8 lg:p-10 rounded-[2rem] border border-transparent hover:border-[#a89068]/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 shadow-lg"
                    >
                        <div className="flex justify-between items-start mb-8">
                            <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-[#a89068] group-hover:bg-[#a89068] group-hover:text-white transition-colors duration-500">
                                <i className={item.icon}></i>
                            </div>
                            <span className="text-4xl font-serif text-[#2e443c]/10 group-hover:text-[#a89068]/20 transition-colors">
                                0{item.id}
                            </span>
                        </div>
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#a89068] mb-2">{item.title}</h3>
                        <p className="text-xl font-serif text-[#2e443c]">{item.info}</p>
                        <p className="text-xs text-gray-400 mt-1">{item.subInfo}</p>
                    </motion.div>
                ))}
            </div>
        </div>
      </section>

      {/* --- FORM & FAQ SECTION (LIGHT BOX) --- */}
      <section className="m-5 px-6 py-16 lg:py-24 relative z-10 bg-[#f5f7f8] rounded-[3rem] border-t border-white/5 mt-8 shadow-2xl">
        <div className="max-w-7xl mx-auto">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">
                
                {/* LEFT: THE FORM (Takes up 7 columns on Desktop) */}
                <div className="lg:col-span-7">
                    <div className="mb-10">
                        <h2 className="text-3xl md:text-4xl font-serif text-[#2e443c] mb-4">Send a Message</h2>
                        <p className="text-gray-500 font-light text-sm md:text-base leading-relaxed">
                            Have a specific question or custom request? Fill out the form below and our studio team will get back to you promptly.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        
                        {/* Row 1: Name & Email */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="relative group">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-[#a89068] mb-1.5 block ml-1">Your Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    onFocus={() => setActiveInput('name')}
                                    onBlur={handleBlur}
                                    required
                                    className={`w-full bg-white border rounded-xl px-5 py-4 text-[#2e443c] focus:outline-none transition-all duration-300 placeholder-gray-300 shadow-sm ${
                                      errors.name ? 'border-red-500' : 'border-gray-200 focus:border-[#a89068]'
                                    }`}
                                    placeholder="John Doe"
                                    id="name"
                                />
                                {errors.name && (
                                  <p className="text-red-500 text-xs mt-2 ml-1">{errors.name}</p>
                                )}
                            </div>

                            <div className="relative group">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-[#a89068] mb-1.5 block ml-1">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    onFocus={() => setActiveInput('email')}
                                    onBlur={handleBlur}
                                    required
                                    className={`w-full bg-white border rounded-xl px-5 py-4 text-[#2e443c] focus:outline-none transition-all duration-300 placeholder-gray-300 shadow-sm ${
                                      errors.email ? 'border-red-500' : 'border-gray-200 focus:border-[#a89068]'
                                    }`}
                                    placeholder="john@example.com"
                                    id="email"
                                />
                                {errors.email && (
                                  <p className="text-red-500 text-xs mt-2 ml-1">{errors.email}</p>
                                )}
                            </div>
                        </div>

                        {/* Subject Pills */}
                        <div>
                            <p className="block uppercase tracking-widest text-[10px] font-bold text-[#a89068] mb-3 ml-1">Inquiry Type</p>
                            <div className="flex flex-wrap gap-3">
                                {['Product Inquiry', 'Support'].map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => setFormData({...formData, subject: option})}
                                        className={`px-6 py-3 rounded-full text-xs font-bold transition-all duration-300 border shadow-sm ${
                                            formData.subject === option 
                                            ? 'bg-[#a89068] text-white border-[#a89068]' 
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-[#a89068] hover:text-[#a89068]'
                                        }`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Message */}
                        <div className="relative group">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#a89068] mb-1.5 block ml-1">Message</label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleInputChange}
                                onFocus={() => setActiveInput('message')}
                                onBlur={handleBlur}
                                required
                                rows="4"
                                className={`w-full bg-white border rounded-xl px-5 py-4 text-[#2e443c] focus:outline-none transition-all duration-300 placeholder-gray-300 resize-none shadow-sm ${
                                  errors.message ? 'border-red-500' : 'border-gray-200 focus:border-[#a89068]'
                                }`}
                                placeholder="How can we help?"
                                id="message"
                            ></textarea>
                            {errors.message && (
                              <p className="text-red-500 text-xs mt-2 ml-1">{errors.message}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-start pt-2">
                            <button
                                type="submit"
                                disabled={isLoading || !isFormValid}
                                className={`group relative w-full sm:w-auto px-10 py-4 overflow-hidden rounded-full font-bold uppercase tracking-widest text-[10px] transition-all duration-300 shadow-lg ${
                                  isLoading || !isFormValid
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-200'
                                    : 'bg-[#a89068] text-white hover:bg-[#2e443c] hover:shadow-[0_0_30px_rgba(46,68,60,0.4)] active:scale-95'
                                }`}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    {isLoading ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Sending...
                                      </>
                                    ) : (
                                      <>
                                        Send Request
                                        <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                                      </>
                                    )}
                                </span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* RIGHT: FAQs & SERVICE PROMISE (Takes up 5 columns on Desktop) */}
                <div className="lg:col-span-5 lg:pl-8 border-t lg:border-t-0 lg:border-l border-gray-200 pt-16 lg:pt-0">
                    
                    {/* Premium Service Badge */}
                    <div className="bg-white border border-gray-100 p-6 rounded-2xl mb-10 shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#a89068]/5 rounded-full blur-2xl transition-all group-hover:bg-[#a89068]/10"></div>
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-10 h-10 rounded-full bg-[#a89068]/10 flex items-center justify-center text-[#a89068]">
                                <i className="fa-solid fa-clock-rotate-left"></i>
                            </div>
                            <div>
                                <h4 className="text-[#2e443c] font-serif text-lg">Fast Response Guarantee</h4>
                                <p className="text-[10px] text-[#a89068] uppercase tracking-widest font-bold">Standard SLA</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 font-light leading-relaxed">
                            We aim to respond to all inquiries within <span className="text-[#2e443c] font-medium">2-4 business hours</span> during standard working days. Your space matters to us.
                        </p>
                    </div>

                    {/* FAQ Accordion */}
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2e443c] mb-6">Frequently Asked</h3>
                        <div className="border-t border-gray-200">
                            {faqs.map((faq, index) => (
                                <AccordionItem 
                                    key={index}
                                    question={faq.question}
                                    answer={faq.answer}
                                    isOpen={openFaq === index}
                                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                />
                            ))}
                        </div>
                    </div>

                </div>

            </div>
        </div>
      </section>

    </div>
  );
};

export default ContactPage;