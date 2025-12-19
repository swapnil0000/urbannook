import React, { useState } from 'react';

const SignupForm = ({ onClose, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    console.log('Signup:', formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bgPrimary rounded-lg p-8 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-6 right-6 text-2xl text-textSecondary hover:text-textPrimary cursor-pointer" onClick={onClose}>×</button>
        
        <h2 className="text-3xl font-bold text-textPrimary mb-2 text-center">Create Account</h2>
        <p className="text-textSecondary mb-8 text-center">Join us today</p>
        
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-textPrimary">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="p-3 border border-borderPrimary bg-bgSecondary text-textPrimary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              placeholder="Enter your full name"
              required
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-textPrimary">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="p-3 border border-borderPrimary bg-bgSecondary text-textPrimary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-textPrimary">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="p-3 border border-borderPrimary bg-bgSecondary text-textPrimary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              placeholder="Create a password"
              required
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-textPrimary">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="p-3 border border-borderPrimary bg-bgSecondary text-textPrimary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              placeholder="Confirm your password"
              required
            />
          </div>
          
          <button type="submit" className="bg-primary text-white p-3 rounded-lg font-semibold hover:opacity-90 transition-all mt-4">
            Create Account
          </button>
        </form>
        
        <p className="text-sm text-center mt-4">
          <span className="text-textSecondary">Already have an account? </span>
          <span onClick={onSwitchToLogin} className="text-primary cursor-pointer font-semibold hover:underline">
            Sign in
          </span>
        </p>
      </div>
    </div>
  );
};

export default SignupForm;