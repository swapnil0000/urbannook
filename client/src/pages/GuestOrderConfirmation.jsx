import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const GuestOrderConfirmation = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [guestEmail, setGuestEmail] = useState('');

  useEffect(() => {
    const email = sessionStorage.getItem('guestEmail') || '';
    setGuestEmail(email);
    sessionStorage.removeItem('guestEmail');
  }, []);

  return (
    <div className="min-h-screen bg-[#2e443c] flex items-center justify-center px-4">
      <div className="bg-white rounded-[2rem] p-10 max-w-md w-full shadow-2xl text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="fa-solid fa-circle-check text-emerald-600 text-4xl"></i>
        </div>

        <h1 className="text-3xl font-serif text-[#2e443c] mb-3">Order Confirmed!</h1>
        <p className="text-gray-500 text-sm mb-2">
          Thank you for your purchase. Your order has been placed successfully.
        </p>

        {guestEmail && (
          <p className="text-sm text-gray-600 mb-6">
            A confirmation has been sent to <span className="font-semibold text-[#2e443c]">{guestEmail}</span>
          </p>
        )}

        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <p className="text-[10px] uppercase tracking-widest text-[#a89068] font-bold mb-1">Order Reference</p>
          <p className="text-sm font-mono text-[#2e443c] break-all">{orderId}</p>
        </div>

        <div className="bg-[#2e443c]/5 border border-[#2e443c]/10 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs font-bold text-[#2e443c] mb-1 flex items-center gap-2">
            <i className="fa-solid fa-user-plus text-[#a89068]"></i>
            Save your order history
          </p>
          <p className="text-xs text-gray-500">
            Create an account to track this order and get exclusive member benefits.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/products')}
            className="w-full py-3 bg-[#a89068] text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#2e443c] transition-all"
          >
            Continue Shopping
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 border border-gray-200 text-gray-600 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-50 transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestOrderConfirmation;
