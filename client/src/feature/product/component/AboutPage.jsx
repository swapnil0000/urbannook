import React, { useState } from 'react';
import NewHeader from '../../../component/layout/NewHeader';
import Footer from '../../../component/layout/Footer';

const AboutPage = () => {
  const [hoveredCard, setHoveredCard] = useState(null);

  const teamMembers = [
    {
      id: 1,
      name: "Arjun Sharma",
      role: "Founder & CEO",
      image: "/assets/team1.jpg",
      description: "Passionate about bringing aesthetic design to everyday life"
    },
    {
      id: 2,
      name: "Priya Patel",
      role: "Creative Director",
      image: "/assets/team2.jpg",
      description: "Expert in minimalist design and product curation"
    },
    {
      id: 3,
      name: "Rahul Kumar",
      role: "Operations Head",
      image: "/assets/team3.jpg",
      description: "Ensuring quality and timely delivery for every order"
    }
  ];

  const values = [
    {
      id: 1,
      icon: "fa-solid fa-heart",
      title: "Quality First",
      description: "Every product is carefully selected and tested for durability and aesthetic appeal",
      colorClass: "text-primary",
      bgClass: "bg-primary/10"
    },
    {
      id: 2,
      icon: "fa-solid fa-leaf",
      title: "Sustainable",
      description: "We prioritize eco-friendly materials and sustainable manufacturing processes",
      colorClass: "text-accent",
      bgClass: "bg-accent/10"
    },
    {
      id: 3,
      icon: "fa-solid fa-users",
      title: "Customer Centric",
      description: "Your satisfaction is our priority with dedicated support and easy returns",
      colorClass: "text-primary",
      bgClass: "bg-primary/10"
    },
    {
      id: 4,
      icon: "fa-solid fa-lightbulb",
      title: "Innovation",
      description: "Constantly evolving our collection with trending and unique designs",
      colorClass: "text-accent",
      bgClass: "bg-accent/10"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-bgSecondary via-accent/5 to-primary/10"></div>
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-accent/5 rounded-full blur-2xl"></div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <h1 className="text-5xl font-bold text-textPrimary mb-6 animate-fadeInUp">
            About <span className="text-primary">UrbanNook</span>
          </h1>
          <div className="w-20 h-1 bg-accent mx-auto mb-8 rounded-sm"></div>
          <p className="text-xl text-textSecondary max-w-3xl mx-auto leading-relaxed">
            We're passionate about transforming everyday spaces with carefully curated aesthetic essentials. 
            From minimalist keychains to stylish desk accessories, we bring beauty and functionality to your daily life.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-textPrimary mb-6">Our Story</h2>
              <div className="space-y-4 text-textSecondary leading-relaxed">
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
              <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-8 h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-white font-bold text-3xl mb-4 mx-auto">
                    UN
                  </div>
                  <h3 className="text-2xl font-bold text-textPrimary mb-2">Since 2023</h3>
                  <p className="text-textSecondary">Curating beautiful spaces</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-8 bg-bgSecondary">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-textPrimary mb-4">Our Values</h2>
            <div className="w-16 h-1 bg-accent mx-auto mb-6 rounded-sm"></div>
            <p className="text-lg text-textSecondary max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div
                key={value.id}
                onMouseEnter={() => setHoveredCard(value.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`
                  ${hoveredCard === value.id ? 'bg-bgPrimary border-primary shadow-2xl -translate-y-2 scale-105' : 'bg-bgPrimary border-borderPrimary shadow-md'}
                  p-8 rounded-2xl text-center border-2 transition-all duration-500 ease-out cursor-pointer
                  animate-fadeInUp
                `}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div
                  className={`
                    w-16 h-16 mx-auto mb-6 rounded-full ${value.bgClass} flex items-center justify-center
                    transition-all duration-400 ease-out
                    ${hoveredCard === value.id ? 'rotate-360 scale-110' : 'rotate-0 scale-100'}
                  `}
                >
                  <i className={`${value.icon} text-2xl ${value.colorClass}`}></i>
                </div>
                <h3 className="text-xl font-bold text-textPrimary mb-4">{value.title}</h3>
                <p className="text-textSecondary text-sm leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-textPrimary mb-4">Meet Our Team</h2>
            <div className="w-16 h-1 bg-accent mx-auto mb-6 rounded-sm"></div>
            <p className="text-lg text-textSecondary max-w-2xl mx-auto">
              The passionate people behind UrbanNook
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <div
                key={member.id}
                className="bg-bgPrimary rounded-2xl p-8 text-center shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 animate-fadeInUp"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full mx-auto mb-6 flex items-center justify-center text-white font-bold text-2xl">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <h3 className="text-xl font-bold text-textPrimary mb-2">{member.name}</h3>
                <p className="text-primary font-semibold mb-4">{member.role}</p>
                <p className="text-textSecondary text-sm leading-relaxed">{member.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-8 bg-gradient-to-r from-primary to-accent text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
              <div className="text-4xl font-bold mb-2">10K+</div>
              <div className="text-lg opacity-90">Happy Customers</div>
            </div>
            <div className="animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-lg opacity-90">Products</div>
            </div>
            <div className="animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-lg opacity-90">Cities</div>
            </div>
            <div className="animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
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