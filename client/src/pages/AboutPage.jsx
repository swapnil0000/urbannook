import React, { useEffect, useState } from 'react';
import Footer from '../component/layout/Footer';

const AboutPage = () => {
    useEffect(() => {
      window.scrollTo(0, 0);
    }, []);
  const [hoveredCard, setHoveredCard] = useState(null);

  const teamMembers = [
    {
      id: 1,
      name: "Arjun Sharma",
      role: "Founder & CEO",
      description: "Passionate about bringing aesthetic design to everyday life"
    },
    {
      id: 2,
      name: "Priya Patel",
      role: "Creative Director",
      description: "Expert in minimalist design and product curation"
    },
    {
      id: 3,
      name: "Rahul Kumar",
      role: "Operations Head",
      description: "Ensuring quality and timely delivery for every order"
    }
  ];

  const values = [
    {
      id: 1,
      icon: "fa-solid fa-heart",
      title: "Quality First",
      description: "Every product is carefully selected and tested for durability and aesthetic appeal",
      color: "emerald"
    },
    {
      id: 2,
      icon: "fa-solid fa-leaf",
      title: "Sustainable",
      description: "We prioritize eco-friendly materials and sustainable manufacturing processes",
      color: "green"
    },
    {
      id: 3,
      icon: "fa-solid fa-users",
      title: "Customer Centric",
      description: "Your satisfaction is our priority with dedicated support and easy returns",
      color: "blue"
    },
    {
      id: 4,
      icon: "fa-solid fa-lightbulb",
      title: "Innovation",
      description: "Constantly evolving our collection with trending and unique designs",
      color: "purple"
    }
  ];

  return (
    <div className="min-h-screen bg-[#e8e6e1]">
      {/* Hero Section with proper header spacing */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-100/30 to-emerald-100/30"></div>
        <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-orange-200/20 rounded-full blur-2xl"></div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <h1 className="text-6xl md:text-7xl font-serif text-gray-900 mb-6">
            About <span className="italic font-light text-emerald-700">UrbanNook</span>
          </h1>
          <div className="w-20 h-1 bg-emerald-600 mx-auto mb-8 rounded-full"></div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            We're passionate about transforming everyday spaces with carefully curated aesthetic essentials. 
            From minimalist keychains to stylish desk accessories, we bring beauty and functionality to your daily life.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-serif text-gray-900 mb-6">Our Story</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  UrbanNook was born from a simple belief: that beautiful, functional design should be accessible to everyone. 
                  Founded in 2023, we started as a small team of design enthusiasts who noticed a gap in the market for 
                  affordable yet aesthetic everyday items.
                </p>
                <p>
                  What began as a passion project has grown into a trusted brand that serves thousands of customers across India. 
                  We carefully curate each product, ensuring it meets our high standards for quality, design, and functionality.
                </p>
                <p>
                  Today, UrbanNook continues to evolve, always staying true to our mission of making beautiful design 
                  accessible and bringing joy to everyday moments.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-8 h-96 flex items-center justify-center shadow-lg border border-white/40">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center text-white font-serif text-3xl mb-4 mx-auto">
                    UN
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Since 2023</h3>
                  <p className="text-gray-600">Curating beautiful spaces</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif text-gray-900 mb-4">Our Values</h2>
            <div className="w-16 h-1 bg-emerald-600 mx-auto mb-6 rounded-full"></div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div
                key={value.id}
                onMouseEnter={() => setHoveredCard(value.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`
                  ${hoveredCard === value.id ? 'bg-white/90 scale-105 shadow-xl' : 'bg-white/80 shadow-lg'}
                  backdrop-blur-sm p-8 rounded-[2rem] text-center border border-white/40 transition-all duration-300 cursor-pointer
                `}
              >
                <div className={`w-16 h-16 mx-auto mb-6 rounded-full bg-${value.color}-100 flex items-center justify-center transition-all duration-300 ${hoveredCard === value.id ? 'rotate-12 scale-110' : ''}`}>
                  <i className={`${value.icon} text-2xl text-${value.color}-600`}></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{value.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif text-gray-900 mb-4">Meet Our Team</h2>
            <div className="w-16 h-1 bg-emerald-600 mx-auto mb-6 rounded-full"></div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              The passionate people behind UrbanNook
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-8 text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-white/40"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-gray-900 to-emerald-700 rounded-full mx-auto mb-6 flex items-center justify-center text-white font-bold text-2xl">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{member.name}</h3>
                <p className="text-emerald-600 font-semibold mb-4">{member.role}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{member.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 mx-6 mb-6 bg-gradient-to-r from-gray-900 to-emerald-700 text-white rounded-[2.5rem]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10K+</div>
              <div className="text-lg opacity-90">Happy Customers</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-lg opacity-90">Products</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-lg opacity-90">Cities</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99%</div>
              <div className="text-lg opacity-90">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;