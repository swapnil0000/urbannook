import React, { useState } from 'react';

const LoginForm = ({ onClose, onSwitchToSignup }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSuccess = (credentialResponse) => {
    console.log("Google login success:", credentialResponse);
    // TODO: Send token to backend for verification & login
  };

  // const handleError = () => {
  //   console.log("Google login failed");
  // };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login:', formData);
  };

  const handleLoginWithOutOpt = (type) => {
    console.log('Login with out opt');
    if (type === 'google') {
      console.log('Login with google');
    } else if (type === 'facebook') {
      console.log('Login with facebook');
    } else {
      console.log('Login with email')
    }
  }

const handleGoogleLogin = () => {
  window.google.accounts.id.initialize({
    client_id: "YOUR_GOOGLE_CLIENT_ID",
    callback: handleGoogleResponse
  });
  
  window.google.accounts.id.renderButton(
    document.getElementById("google-signin-button"),
    { 
      theme: "outline", 
      size: "large",
      width: "100%"
    }
  );
  
  // Or use one-tap
  window.google.accounts.id.prompt();
};

const handleGoogleResponse = (response) => {
  console.log("Encoded JWT ID token: " + response.credential);
  // Send to your backend for verification
};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 max-w-screen-2xl" onClick={onClose}>
      <div className="bg-bgPrimary rounded-lg p-8 w-full max-w-lg shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-6 right-6 text-2xl text-textSecondary hover:text-textPrimary cursor-pointer" onClick={onClose}>×</button>

        <h2 className="text-2xl font-bold text-textPrimary mb-2 text-center">Welcome to <span className='text-primary cursor-pointer font-semibold'>Urban Nook</span></h2>
        <p className="text-textSecondary mb-8 text-center">Sign in to your account</p>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
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
              placeholder="Enter your password"
              required
            />
          </div>

          <span className='text-center text-textSecondary text-sm'>Or login with</span>

          <div className='flex flex-row justify-between gap-3'>
            <div className='bg-white rounded-lg shadow-lg border border-borderPrimary flex-1'>
              <div id="google-signin-button"></div>
              {/* Fallback custom button */}
              <button onClick={handleGoogleLogin} className='w-full flex items-center justify-center gap-3 py-3 px-4 hover:bg-bgSecondary transition-colors rounded-md'>
                <img src='/assets/onboardIcon-gp.svg' className='w-5 h-5' />
                <span className='text-sm font-medium text-textPrimary'>Google</span>
              </button>
            </div>

            <div className='bg-white rounded-lg shadow-lg border border-borderPrimary flex-1'>
              <button onClick={() => handleLoginWithOutOpt('facebook')} className='w-full flex items-center justify-center gap-3 py-3 px-4 hover:bg-bgSecondary transition-colors rounded-md'>
                <img src='/assets/onboardIcon-fb.svg' className='w-5 h-5' />
                <span className='text-sm font-medium text-textPrimary'>Facebook</span>
              </button>
            </div>

            <div className='bg-white rounded-lg shadow-lg border border-borderPrimary flex-1'>
              <button onClick={() => handleLoginWithOutOpt('mobile')} className='w-full flex items-center justify-center gap-3 py-3 px-4 hover:bg-bgSecondary transition-colors rounded-md'>
                <img src='/assets/onboardIcon-mail.svg' className='w-5 h-5' />
                <span className='text-sm font-medium text-textPrimary'>Mobile No</span>
              </button>
            </div>
          </div>

          <button type="submit" className="bg-primary text-white p-3 rounded-lg font-semibold hover:opacity-90 transition-all mt-4">
            Sign In
          </button>
        </form>

        <p className="text-sm text-center mt-4">
          <span className="text-textSecondary">Don't have an account? </span>
          <span onClick={onSwitchToSignup} className="text-primary cursor-pointer font-semibold hover:underline">
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
