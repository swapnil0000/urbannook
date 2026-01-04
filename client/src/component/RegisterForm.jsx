import React, { useState } from 'react';
import { useRegisterMutation } from '../store/api/authApi';
import { useAuth, useUI } from '../hooks/useRedux';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    address: '',
    pinCode: '',
    mobile: '',
  });

  const [register, { isLoading, error }] = useRegisterMutation();
  const { login } = useAuth();
  const { showNotification } = useUI();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await register(formData).unwrap();
      
      // If registration successful and returns token
      if (result.token) {
        login(result.user, result.token);
        showNotification('Registration successful!');
      } else {
        showNotification('Registration successful! Please login.');
      }
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        address: '',
        pinCode: '',
        mobile: '',
      });
    } catch (err) {
      showNotification(err.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Register</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full p-3 border rounded-lg"
          />
        </div>
        
        <div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full p-3 border rounded-lg"
          />
        </div>
        
        <div>
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full p-3 border rounded-lg"
          />
        </div>
        
        <div>
          <input
            type="text"
            name="address"
            placeholder="Address"
            value={formData.address}
            onChange={handleChange}
            required
            className="w-full p-3 border rounded-lg"
          />
        </div>
        
        <div>
          <input
            type="number"
            name="pinCode"
            placeholder="Pin Code"
            value={formData.pinCode}
            onChange={handleChange}
            required
            className="w-full p-3 border rounded-lg"
          />
        </div>
        
        <div>
          <input
            type="tel"
            name="mobile"
            placeholder="Mobile Number"
            value={formData.mobile}
            onChange={handleChange}
            required
            className="w-full p-3 border rounded-lg"
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>
        
        {error && (
          <div className="text-red-500 text-sm">
            {error.data?.message || 'Registration failed'}
          </div>
        )}
      </form>
    </div>
  );
};

export default RegisterForm;