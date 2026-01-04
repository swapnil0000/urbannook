import React from 'react';
import RegisterForm from '../component/RegisterForm';
import { useUI } from '../hooks/useRedux';

const RegisterPage = () => {
  const { notification, clearNotification } = useUI();

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <RegisterForm />
        
        {/* Notification Display */}
        {notification && (
          <div className="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg">
            <div className="flex justify-between items-center">
              <span>{notification}</span>
              <button 
                onClick={clearNotification}
                className="ml-4 text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;