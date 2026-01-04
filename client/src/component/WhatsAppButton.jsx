import React from 'react';

const WhatsAppButton = () => {
  const handleWhatsAppClick = () => {
    const phoneNumber = '+919876543210'; // Replace with your WhatsApp number
    const message = 'Hi! I am interested in your products from Urban Nook.';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <button 
        onClick={handleWhatsAppClick}
        className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#1da851] hover:scale-110 transition-all duration-300 animate-pulse"
        aria-label="Contact us on WhatsApp"
      >
        <i className="fab fa-whatsapp text-2xl"></i>
      </button>
    </div>
  );
};

export default WhatsAppButton;