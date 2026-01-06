import React, { useState, useEffect } from 'react';
import Footer from '../component/layout/Footer';

const ContactPage = () => {
  // --- ADDED: Scroll to top on mount ---
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'Product Inquiry', // Set a default value to match the select option
    message: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Add logic here to send data to backend API
  };

  const contactInfo = [
    {
      icon: "fa-solid fa-phone",
      title: "Talk to us",
      info: "+91 63864 55982",
      subInfo: "Mon-Sat 9AM-7PM",
      accent: "from-emerald-400 to-emerald-600"
    },
    {
      icon: "fa-solid fa-envelope",
      title: "Email support",
      info: "support@urbannook.in",
      subInfo: "Reply in 24 hours",
      accent: "from-blue-400 to-blue-600"
    },
    {
      icon: "fa-solid fa-location-dot",
      title: "Visit showroom",
      info: "Gurgaon, India",
      subInfo: "Open for walk-ins",
      accent: "from-purple-400 to-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8f7f4] font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* 1. ARCHITECTURAL HERO */}
      <section className="relative pt-40 pb-24 px-6 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 w-[40%] h-full bg-emerald-50/50 -skew-x-12 translate-x-20 pointer-events-none"></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-200/20 rounded-full blur-[120px]"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-end justify-between gap-8">
            <div className="max-w-2xl">
              <span className="inline-block px-4 py-1.5 mb-6 text-[10px] font-bold tracking-[0.3em] text-emerald-800 uppercase bg-emerald-100/50 backdrop-blur-md rounded-full border border-emerald-200/50">
                Contact Urban Nook
              </span>
              <h1 className="text-6xl md:text-8xl font-serif text-slate-900 leading-[0.9] mb-8">
                Let's start a <br />
                <span className="italic font-light text-emerald-700">conversation.</span>
              </h1>
            </div>
            <div className="pb-4">
              <p className="text-lg text-slate-500 max-w-sm leading-relaxed border-l-2 border-emerald-500 pl-6">
                Whether you have a question about our air technology or need home styling advice, our team is ready to assist.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CONTACT INFO ACTION BAR */}
      <section className="px-6 -mt-12 relative z-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1 shadow-2xl rounded-[3rem] overflow-hidden border border-white/50">
            {contactInfo.map((info, index) => (
              <div
                key={index}
                className="bg-white/90 backdrop-blur-xl p-10 flex flex-col items-center text-center hover:bg-white transition-all group"
              >
                <div className={`w-14 h-14 mb-6 rounded-2xl bg-gradient-to-br ${info.accent} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  <i className={`${info.icon} text-xl`}></i>
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{info.title}</h3>
                <p className="text-xl font-serif text-slate-900 mb-1">{info.info}</p>
                <p className="text-sm text-slate-500">{info.subInfo}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. SPLIT FORM & MAP SECTION */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-start">
            
            {/* Left Column: Visual & Social */}
            <div className="lg:col-span-2 space-y-12">
              <div>
                <h2 className="text-4xl font-serif text-slate-900 mb-6">Our Location</h2>
                <div className="aspect-square bg-slate-200 rounded-[3rem] overflow-hidden relative group shadow-inner">
                   {/* Placeholder for Interactive Map */}
                   <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center grayscale hover:grayscale-0 transition-all duration-700"></div>
                   <div className="absolute inset-0 flex items-center justify-center bg-emerald-900/10 backdrop-blur-[2px] group-hover:backdrop-blur-0 transition-all">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl animate-bounce">
                        <i className="fa-solid fa-location-dot text-emerald-600 text-2xl"></i>
                      </div>
                   </div>
                </div>
                <p className="mt-6 text-slate-600 font-medium">Urban Nook HQ, Sector 44, Gurgaon, India</p>
              </div>

              <div>
                <h3 className="text-xl font-serif text-slate-900 mb-6">Social Constellation</h3>
                <div className="flex gap-4">
                  {['instagram', 'facebook', 'twitter', 'linkedin'].map((social) => (
                    <a key={social} href="#" className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-900 hover:bg-slate-900 hover:text-white hover:-translate-y-2 transition-all shadow-sm">
                      <i className={`fa-brands fa-${social} text-lg`}></i>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Form */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-[4rem] p-10 md:p-16 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100">
                <div className="mb-12">
                  <h2 className="text-4xl font-serif text-slate-900 mb-4">Send a message</h2>
                  <p className="text-slate-500">Expect a personalized response from our concierge team.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700 ml-1">Full Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700 ml-1">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700 ml-1">Subject</label>
                    <select
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all appearance-none"
                    >
                        <option value="Product Inquiry">Product Inquiry</option>
                        <option value="Technical Support">Technical Support</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700 ml-1">Message</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows="5"
                      className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all resize-none"
                      placeholder="How can we help you?"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="group w-full bg-slate-900 text-white py-6 px-8 rounded-3xl font-bold uppercase tracking-[0.2em] text-xs transition-all hover:bg-emerald-700 shadow-xl hover:shadow-emerald-900/20 flex items-center justify-center gap-4 overflow-hidden relative"
                  >
                    <span className="relative z-10">Dispatch Message</span>
                    <i className="fa-solid fa-arrow-right-long relative z-10 group-hover:translate-x-2 transition-transform"></i>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SEAMLESS CTA */}
      <section className="px-6 mb-20">
        <div className="max-w-7xl mx-auto relative rounded-[4rem] overflow-hidden bg-slate-900 py-24 px-12 text-center group">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-serif text-white mb-6">Prefer instant answers?</h2>
            <p className="text-slate-400 text-lg mb-12 max-w-lg mx-auto italic">
               Our live concierge is active Monday through Saturday to handle immediate concerns.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button className="bg-emerald-500 text-white px-10 py-5 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20">
                Start Live Chat
              </button>
              <span className="text-slate-500 font-serif">or</span>
              <a href="tel:+916386455982" className="text-white font-bold border-b border-white/20 pb-2 hover:border-emerald-500 transition-all">
                Call Concierge
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;