import React, { useState } from "react";

const features = [
  {
    id: 1,
    icon: "fa-solid fa-award",
    title: "Premium Quality",
    description: "Handpicked products with superior craftsmanship and materials",
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
    stat: "10K+",
    statLabel: "Happy Customers"
  },
  {
    id: 2,
    icon: "fa-solid fa-truck-fast",
    title: "Fast Delivery",
    description: "Free shipping on orders above ₹999 with express delivery",
    colorClass: "text-accent",
    bgClass: "bg-accent/10",
    stat: "24-48hrs",
    statLabel: "Delivery Time"
  },
  {
    id: 3,
    icon: "fa-solid fa-shield-halved",
    title: "Secure Payment",
    description: "100% secure transactions with multiple payment options",
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
    stat: "100%",
    statLabel: "Secure"
  },
  {
    id: 4,
    icon: "fa-solid fa-headset",
    title: "24/7 Support",
    description: "Dedicated customer service team always ready to help",
    colorClass: "text-accent",
    bgClass: "bg-accent/10",
    stat: "24/7",
    statLabel: "Available"
  },
];

export default function WhyChooseUs() {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <section className="py-20 px-10 relative overflow-hidden">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-bgSecondary via-accent/5 to-primary/10"></div>
      
      {/* Geometric shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl transform rotate-45"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-accent/5 rounded-full blur-2xl transform -rotate-12"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary/3 transform -translate-x-1/2 -translate-y-1/2 rotate-12 blur-xl"></div>
      </div>
      {/* Animated Background Elements */}
      <div className="absolute top-[10%] left-[5%] w-25 h-25 rounded-full bg-primary/10 animate-float"></div>
      <div className="absolute bottom-[15%] right-[8%] w-38 h-38 rounded-full bg-accent/10 animate-float-reverse"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-15">
          <h2 className="text-primary text-4xl font-bold mb-3 animate-fadeInUp">
            Why Choose UrbanNook?
          </h2>
          <div className="w-15 h-1 bg-accent mx-auto mb-4 rounded-sm"></div>
          <p className="text-textSecondary text-lg opacity-80 max-w-2xl mx-auto">
            Experience the perfect blend of quality, service, and style
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              onMouseEnter={() => setHoveredId(feature.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`
                ${hoveredId === feature.id ? 'bg-bgSecondary border-primary shadow-2xl -translate-y-3 scale-105' : 'bg-bgPrimary border-bgSecondary shadow-md'}
                p-10 rounded-2xl text-center border-2 transition-all duration-500 ease-out cursor-pointer
                animate-fadeInUp
              `}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div
                className={`
                  w-20 h-20 mx-auto mb-6 rounded-full ${feature.bgClass} flex items-center justify-center
                  transition-all duration-400 ease-out
                  ${hoveredId === feature.id ? 'rotate-360 scale-110' : 'rotate-0 scale-100'}
                `}
              >
                <i className={`${feature.icon} text-4xl ${feature.colorClass} transition-all duration-300`}></i>
              </div>

              {/* Title */}
              <h3 className="text-textPrimary text-xl font-bold mb-3 transition-colors duration-300">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-textSecondary text-sm leading-relaxed opacity-70 mb-5">
                {feature.description}
              </p>

              {/* Stats */}
              <div
                className={`
                  mt-5 pt-5 border-t border-bgSecondary transition-opacity duration-300
                  ${hoveredId === feature.id ? 'opacity-100' : 'opacity-60'}
                `}
              >
                <div className={`${feature.colorClass} text-3xl font-extrabold mb-1`}>
                  {feature.stat}
                </div>
                <div className="text-textMuted text-xs opacity-60 uppercase tracking-wider">
                  {feature.statLabel}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-15">
          <button className="bg-primary hover:bg-accent text-white border-none py-4 px-10 rounded-full cursor-pointer text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 inline-flex items-center gap-3">
            Start Shopping
            <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </section>
  );
}
