import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubmitContactMutation } from '../../store/api/userApi';
import { useUI } from '../../hooks/useRedux';
// import Footer from '../../component/layout/Footer';
// import NewHeader from '../../component/layout/NewHeader';

// --- Reusable Accordion Component for FAQs ---
const AccordionItem = ({ question, answer, isOpen, onClick }) => (
  <div className="border-b border-[#F5DEB3]/10">
    <button 
      onClick={onClick} 
      className="w-full py-5 flex justify-between items-center text-left hover:text-[#F5DEB3] transition-colors group"
      type="button"
    >
      <span className={`text-sm md:text-base font-serif transition-colors ${isOpen ? 'text-[#F5DEB3]' : 'text-white'}`}>
        {question}
      </span>
      <span className={`flex items-center justify-center w-6 h-6 rounded-full border transition-all duration-300 ${isOpen ? 'rotate-180 border-[#F5DEB3] bg-[#F5DEB3] text-[#1c3026]' : 'border-white/20 text-[#F5DEB3] group-hover:border-[#F5DEB3]'}`}>
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
          <div className="pb-6 text-green-100/60 text-sm leading-relaxed font-light pl-2 border-l border-[#F5DEB3]/20 ml-2 mt-2">
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
    <div className="bg-[#2e443c] min-h-screen text-[#E2E8F0] font-sans relative selection:bg-[#F5DEB3] selection:text-[#0F261F] overflow-x-hidden">
      {/* <NewHeader /> */}
      
      {/* --- CSS OVERRIDE FOR CHROME AUTOFILL WHITE BACKGROUND FIX --- */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active,
        textarea:-webkit-autofill,
        textarea:-webkit-autofill:hover,
        textarea:-webkit-autofill:focus,
        textarea:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 50px #253832 inset !important;
            -webkit-text-fill-color: #F5DEB3 !important;
            transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
      
      {/* 1. BACKGROUND ATMOSPHERE */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#3a554a] via-[#2e443c] to-[#1a2822] pointer-events-none z-0 opacity-50"></div>
      
      {/* Noise Texture */}
      <div className="fixed inset-0 opacity-[0.04] pointer-events-none z-0 mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-36 pb-1 lg:pb-1 px-6 lg:px-12 z-10 ">
        <div className="max-w-4xl mx-auto text-center">
             <motion.div 
               initial="hidden"
               animate="visible"
               variants={stagger}
               className="flex flex-col items-center"
             >
                <motion.div variants={fadeIn} className="flex items-center gap-4 mb-8">
                    <span className="h-[1px] w-12 md:w-16 bg-[#F5DEB3]/40"></span>
                    <span className="text-[10px] font-bold tracking-[0.3em] text-[#F5DEB3] uppercase">
                        Support & Inquiries
                    </span>
                    <span className="h-[1px] w-12 md:w-16 bg-[#F5DEB3]/40"></span>
                </motion.div>
                
                {/* <motion.h1 variants={fadeIn} className="text-5xl md:text-6xl lg:text-8xl font-serif text-white leading-[1.1] mb-6">
                    Start a <br className="hidden md:block" />
                    <span className="text-[#F5DEB3] opacity-90 italic font-light">Conversation.</span>
                </motion.h1> */}
             </motion.div>
        </div>
      </section>

      {/* --- CONTACT INFO GRID --- */}
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
                        className="group bg-[#233630] p-8 lg:p-10 rounded-[2rem] border border-white/5 hover:border-[#F5DEB3]/30 hover:bg-[#1A3C32] transition-all duration-500 shadow-xl"
                    >
                        <div className="flex justify-between items-start mb-8">
                            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-[#F5DEB3] group-hover:bg-[#F5DEB3] group-hover:text-[#1c3026] transition-colors duration-500">
                                <i className={item.icon}></i>
                            </div>
                            <span className="text-4xl font-serif text-[#F5DEB3]/10 group-hover:text-[#F5DEB3]/20 transition-colors">
                                0{item.id}
                            </span>
                        </div>
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#F5DEB3] mb-2">{item.title}</h3>
                        <p className="text-xl font-serif text-white">{item.info}</p>
                        <p className="text-xs text-green-100/40 mt-1">{item.subInfo}</p>
                    </motion.div>
                ))}
            </div>
        </div>
      </section>

      {/* --- FORM & FAQ SECTION (TWO COLUMNS) --- */}
      <section className=" m-5 px-6 py-16 lg:py-24  relative z-10 bg-[#253832] rounded-t-[3rem] border-t border-white/5 mt-8 shadow-2xl">
        <div className="max-w-7xl mx-auto">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">
                
                {/* LEFT: THE FORM (Takes up 7 columns on Desktop) */}
                <div className="lg:col-span-7">
                    <div className="mb-10">
                        <h2 className="text-3xl md:text-4xl font-serif text-[#F5DEB3] mb-4">Send a Message</h2>
                        <p className="text-green-100/60 font-light text-sm md:text-base leading-relaxed">
                            Have a specific question or custom request? Fill out the form below and our studio team will get back to you promptly.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-12">
                        
                        {/* Row 1: Name & Email */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="relative group">
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    onFocus={() => setActiveInput('name')}
                                    onBlur={handleBlur}
                                    required
                                    className={`w-full bg-transparent border-b py-4 text-lg text-[#F5DEB3] focus:outline-none transition-all duration-500 placeholder-transparent ${
                                      errors.name ? 'border-red-500' : 'border-[#F5DEB3]/20 focus:border-[#F5DEB3]'
                                    }`}
                                    placeholder="Name"
                                    id="name"
                                />
                                <label 
                                    htmlFor="name" 
                                    className={`absolute left-0 transition-all duration-300 pointer-events-none uppercase tracking-widest text-[10px] font-bold ${
                                        activeInput === 'name' || formData.name 
                                        ? '-top-4 text-[#F5DEB3]' 
                                        : 'top-5 text-green-100/50'
                                    }`}
                                >
                                    Your Name
                                </label>
                                {errors.name && (
                                  <p className="text-red-400 text-xs mt-2">{errors.name}</p>
                                )}
                            </div>

                            <div className="relative group">
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    onFocus={() => setActiveInput('email')}
                                    onBlur={handleBlur}
                                    required
                                    className={`w-full bg-transparent border-b py-4 text-lg text-[#F5DEB3] focus:outline-none transition-all duration-500 placeholder-transparent ${
                                      errors.email ? 'border-red-500' : 'border-[#F5DEB3]/20 focus:border-[#F5DEB3]'
                                    }`}
                                    placeholder="Email"
                                    id="email"
                                />
                                <label 
                                    htmlFor="email" 
                                    className={`absolute left-0 transition-all duration-300 pointer-events-none uppercase tracking-widest text-[10px] font-bold ${
                                        activeInput === 'email' || formData.email 
                                        ? '-top-4 text-[#F5DEB3]' 
                                        : 'top-5 text-green-100/50'
                                    }`}
                                >
                                    Email Address
                                </label>
                                {errors.email && (
                                  <p className="text-red-400 text-xs mt-2">{errors.email}</p>
                                )}
                            </div>
                        </div>

                        {/* Subject Pills */}
                        <div>
                            <p className="block uppercase tracking-widest text-[10px] font-bold text-green-100/50 mb-5">Inquiry Type</p>
                            <div className="flex flex-wrap gap-3">
                                {['Product Inquiry',  'Support'].map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => setFormData({...formData, subject: option})}
                                        className={`px-5 py-2.5 rounded-full text-xs transition-all duration-300 border ${
                                            formData.subject === option 
                                            ? 'bg-[#F5DEB3] text-[#1c3026] border-[#F5DEB3] font-bold shadow-lg shadow-[#F5DEB3]/20' 
                                            : 'bg-transparent text-green-100/60 border-[#F5DEB3]/20 hover:border-[#F5DEB3] hover:text-[#F5DEB3]'
                                        }`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Message */}
                        <div className="relative group">
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleInputChange}
                                onFocus={() => setActiveInput('message')}
                                onBlur={handleBlur}
                                required
                                rows="1"
                                className={`w-full bg-transparent border-b py-4 text-lg text-[#F5DEB3] focus:outline-none transition-all duration-500 placeholder-transparent resize-none min-h-[80px] ${
                                  errors.message ? 'border-red-500' : 'border-[#F5DEB3]/20 focus:border-[#F5DEB3]'
                                }`}
                                placeholder="Message"
                                id="message"
                            ></textarea>
                            <label 
                                htmlFor="message" 
                                className={`absolute left-0 transition-all duration-300 pointer-events-none uppercase tracking-widest text-[10px] font-bold ${
                                    activeInput === 'message' || formData.message 
                                    ? 'top-0 text-[#F5DEB3]' 
                                    : 'top-8 text-green-100/50'
                                }`}
                            >
                                How can we help?
                            </label>
                            {errors.message && (
                              <p className="text-red-400 text-xs mt-2">{errors.message}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-start pt-4">
                            <button
                                type="submit"
                                disabled={isLoading || !isFormValid}
                                className={`group relative w-full sm:w-auto px-10 py-4 overflow-hidden rounded-full font-bold uppercase tracking-widest text-[10px] transition-all duration-300 shadow-lg ${
                                  isLoading || !isFormValid
                                    ? 'bg-[#F5DEB3]/20 text-[#F5DEB3]/40 cursor-not-allowed border border-[#F5DEB3]/20'
                                    : 'bg-[#F5DEB3] text-[#1c3026] hover:bg-white hover:shadow-[0_0_30px_rgba(245,222,179,0.4)] active:scale-95'
                                }`}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    {isLoading ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-[#1c3026]/30 border-t-[#1c3026] rounded-full animate-spin"></div>
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
                <div className="lg:col-span-5 lg:pl-8 border-t lg:border-t-0 lg:border-l border-white/10 pt-16 lg:pt-0">
                    
                    {/* Premium Service Badge */}
                    <div className="bg-[#1a2822] border border-[#F5DEB3]/10 p-6 rounded-2xl mb-10 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#F5DEB3]/5 rounded-full blur-2xl"></div>
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-10 h-10 rounded-full bg-[#F5DEB3]/10 flex items-center justify-center text-[#F5DEB3]">
                                <i className="fa-solid fa-clock-rotate-left"></i>
                            </div>
                            <div>
                                <h4 className="text-white font-serif text-lg">Fast Response Guarantee</h4>
                                <p className="text-[10px] text-[#F5DEB3] uppercase tracking-widest font-bold">Standard SLA</p>
                            </div>
                        </div>
                        <p className="text-sm text-green-100/60 font-light leading-relaxed">
                            We aim to respond to all inquiries within <span className="text-white font-medium">2-4 business hours</span> during standard working days. Your space matters to us.
                        </p>
                    </div>

                    {/* FAQ Accordion */}
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-6">Frequently Asked</h3>
                        <div className="border-t border-[#F5DEB3]/10">
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

      {/* --- MAP BANNER --- */}
      {/* <section className="h-[250px] w-full relative z-10 border-t border-[#F5DEB3]/10 overflow-hidden">
         <img 
            src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1200&auto=format&fit=crop" 
            className="w-full h-full object-cover grayscale opacity-30 hover:grayscale-0 hover:opacity-60 transition-all duration-[2s]"
            alt="Location"
         />
         <div className="absolute inset-0 flex items-center justify-center p-4">
             <div className="bg-[#1c3026]/90 backdrop-blur-xl px-10 py-6 border border-[#F5DEB3]/20 rounded-2xl text-center shadow-2xl">
                 <i className="fa-solid fa-map-pin text-[#F5DEB3] text-xl mb-3"></i>
                 <p className="text-[#F5DEB3] font-serif text-xl italic mb-1">Our Workshop</p>
                 <p className="text-green-100/60 text-[10px] uppercase tracking-widest">Sector 44, Gurgaon</p>
             </div>
         </div>
      </section> */}

      {/* <Footer /> */}
    </div>
  );
};

export default ContactPage;