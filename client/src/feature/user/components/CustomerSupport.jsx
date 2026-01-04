import React, { useState } from 'react';

const CustomerSupport = () => {
  const [activeTab, setActiveTab] = useState('contact');
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'medium'
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Support request:', formData);
    // Submit support request
  };

  const faqs = [
    {
      question: 'How can I track my order?',
      answer: 'You can track your order by going to "My Orders" section and clicking on "Track Order" button.'
    },
    {
      question: 'What is your return policy?',
      answer: 'We offer 30-day return policy for all furniture items. Items must be in original condition.'
    },
    {
      question: 'Do you provide assembly service?',
      answer: 'Yes, we provide free assembly service for orders above ₹25,000. Additional charges apply for smaller orders.'
    },
    {
      question: 'How long does delivery take?',
      answer: 'Standard delivery takes 7-14 business days. Express delivery (2-5 days) is available for select items.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-headset text-2xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Customer Support</h1>
              <p className="text-purple-100">We're here to help you 24/7</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('contact')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'contact' 
                  ? 'border-b-2 border-purple-500 text-purple-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Contact Us
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'faq' 
                  ? 'border-b-2 border-purple-500 text-purple-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              FAQ
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'contact' && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Contact Form */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Send us a message</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    >
                      <option value="">Select a subject</option>
                      <option value="order">Order Related</option>
                      <option value="product">Product Inquiry</option>
                      <option value="delivery">Delivery Issue</option>
                      <option value="return">Return/Refund</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows="5"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Describe your issue or question..."
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    Send Message
                  </button>
                </form>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Other ways to reach us</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <i className="fa-solid fa-phone text-purple-600"></i>
                    </div>
                    <div>
                      <h4 className="font-medium">Phone Support</h4>
                      <p className="text-gray-600">+91 1800-123-4567</p>
                      <p className="text-sm text-gray-500">Mon-Sat, 9 AM - 8 PM</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <i className="fa-solid fa-envelope text-purple-600"></i>
                    </div>
                    <div>
                      <h4 className="font-medium">Email Support</h4>
                      <p className="text-gray-600">support@urbannook.com</p>
                      <p className="text-sm text-gray-500">Response within 24 hours</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <i className="fa-brands fa-whatsapp text-purple-600"></i>
                    </div>
                    <div>
                      <h4 className="font-medium">WhatsApp</h4>
                      <p className="text-gray-600">+91 9876543210</p>
                      <p className="text-sm text-gray-500">Quick responses</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div>
              <h3 className="text-lg font-semibold mb-6">Frequently Asked Questions</h3>
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">{faq.question}</h4>
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerSupport;