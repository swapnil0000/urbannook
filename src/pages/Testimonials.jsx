import React, { useState } from 'react';

const testimonials = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Interior Designer",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
    content: "UrbanNook has completely transformed my workspace. The minimalist keychains and desk accessories are exactly what I needed for my aesthetic setup.",
    rating: 5,
    product: "Minimalist Desk Set"
  },
  {
    id: 2,
    name: "Alex Chen",
    role: "Content Creator",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    content: "The quality is outstanding! Every piece feels premium and the attention to detail is incredible. My followers always ask where I get my accessories.",
    rating: 5,
    product: "Aesthetic Keychain Collection"
  },
  {
    id: 3,
    name: "Emma Rodriguez",
    role: "Student",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    content: "Perfect for my dorm room! The posters and small accessories make my space feel so much more personalized and cozy. Great prices too!",
    rating: 5,
    product: "Dorm Essentials Bundle"
  },
  {
    id: 4,
    name: "Michael Park",
    role: "Software Engineer",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    content: "Fast shipping and excellent customer service. The products exceeded my expectations and really elevated my home office setup.",
    rating: 5,
    product: "Home Office Collection"
  }
];

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <i
        key={i}
        className={`fa-solid fa-star ${i < rating ? 'text-warning' : 'text-borderSecondary'}`}
      />
    ));
  };

  return (
    <section className="relative py-20 px-8 overflow-hidden">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-textPrimary via-gray-800 to-textPrimary"></div>
      
      {/* Testimonial background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M20 20c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8 8 3.6 8 8zm0-20c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8 8 3.6 8 8z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            What Our Customers Say
          </h2>
          <div className="w-20 h-1 bg-accent mx-auto mb-4"></div>
          <p className="text-lg text-textSecondary max-w-2xl mx-auto">
            Join thousands of satisfied customers who have transformed their spaces with our aesthetic essentials
          </p>
        </div>

        {/* Testimonials Carousel */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.slice(currentIndex, currentIndex + 3).map((testimonial) => (
              <div
                key={testimonial.id}
                className="bg-bgSecondary p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {renderStars(testimonial.rating)}
                </div>

                {/* Content */}
                <p className="text-textSecondary mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>

                {/* Product */}
                <div className="text-sm text-accent font-semibold mb-4">
                  {testimonial.product}
                </div>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-semibold text-textPrimary">
                      {testimonial.name}
                    </h4>
                    <p className="text-sm text-textMuted">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-4 mt-12">
            <button
              onClick={prevTestimonial}
              className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:bg-opacity-80 transition-all"
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <button
              onClick={nextTestimonial}
              className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:bg-opacity-80 transition-all"
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex ? 'bg-primary' : 'bg-borderSecondary'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-16 border-t border-borderPrimary">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">4.9/5</div>
            <div className="text-textSecondary">Average Rating</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">10K+</div>
            <div className="text-textSecondary">Happy Customers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">500+</div>
            <div className="text-textSecondary">Products Sold</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">99%</div>
            <div className="text-textSecondary">Satisfaction Rate</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;