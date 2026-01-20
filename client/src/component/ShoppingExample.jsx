import React, { useState } from 'react';
import {
  useGetUserProfileMutation,
  useUpdateUserProfileMutation,
  useAddToCartMutation,
  useGetCartQuery,
  useRemoveFromCartMutation,
} from '../store/api/userApi';
import { useGetProductsQuery } from '../store/api/productsApi';

const ShoppingExample = () => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [profileData, setProfileData] = useState(null);

  // API hooks
  const [getUserProfile] = useGetUserProfileMutation();
  const [updateUserProfile] = useUpdateUserProfileMutation();
  const [addToCart] = useAddToCartMutation();
  const [removeFromCart] = useRemoveFromCartMutation();
  
  const { data: cartData, refetch: refetchCart } = useGetCartQuery();
  const { data: productsData, isLoading: productsLoading } = useGetProductsQuery({
    page: 1,
    limit: 20
  });

  // Load user profile
  const loadProfile = async () => {
    try {
      const result = await getUserProfile({
        userEmail: "user@example.com" // Replace with actual email
      }).unwrap();
      setProfileData(result.data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  // Update profile
  const updateProfile = async (newData) => {
    try {
      await updateUserProfile(newData).unwrap();
      alert('Profile updated successfully!');
      loadProfile(); // Reload profile
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile');
    }
  };

  // Add products to cart
  const handleAddToCart = async () => {
    if (selectedProducts.length === 0) {
      alert('Please select products first');
      return;
    }

    try {
      await addToCart(selectedProducts).unwrap();
      alert('Products added to cart!');
      setSelectedProducts([]);
      refetchCart();
    } catch (error) {
      console.error('Failed to add to cart:', error);
      alert('Failed to add products to cart');
    }
  };

  // Remove from cart
  const handleRemoveFromCart = async (productId) => {
    try {
      await removeFromCart(productId).unwrap();
      alert('Product removed from cart!');
      refetchCart();
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      alert('Failed to remove product');
    }
  };

  // Add product to selection
  const addToSelection = (productName) => {
    const existing = selectedProducts.find(p => p.productName === productName);
    if (existing) {
      setSelectedProducts(prev => 
        prev.map(p => 
          p.productName === productName 
            ? { ...p, quantity: p.quantity + 1 }
            : p
        )
      );
    } else {
      setSelectedProducts(prev => [...prev, { productName, quantity: 1 }]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Shopping Demo</h1>

      {/* Profile Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Profile Management</h2>
        <div className="flex gap-4 mb-4">
          <button 
            onClick={loadProfile}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Load Profile
          </button>
          <button 
            onClick={() => updateProfile({
              userName: "Updated Name",
              userAddress: "New Address 123",
              userPinCode: "123456"
            })}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Update Profile
          </button>
        </div>
        {profileData && (
          <div className="bg-gray-100 p-4 rounded">
            <pre>{JSON.stringify(profileData, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Products Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Products</h2>
        {productsLoading ? (
          <p>Loading products...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productsData?.data?.listOfProducts?.listOfProducts?.map((product) => (
              <div key={product.productId} className="border rounded-lg p-4">
                <h3 className="font-semibold">{product.productName}</h3>
                <p className="text-gray-600">₹{product.sellingPrice}</p>
                <p className="text-sm text-gray-500">{product.productCategory}</p>
                <button
                  onClick={() => addToSelection(product.productName)}
                  className="mt-2 bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
                >
                  Select for Cart
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Products */}
      {selectedProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Selected Products</h2>
          <div className="space-y-2 mb-4">
            {selectedProducts.map((product, index) => (
              <div key={index} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                <span>{product.productName}</span>
                <span>Qty: {product.quantity}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleAddToCart}
            className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
          >
            Add Selected to Cart
          </button>
        </div>
      )}

      {/* Cart Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Current Cart</h2>
        {cartData?.data ? (
          <div className="space-y-2">
            {cartData.data.map((item, index) => (
              <div key={index} className="flex justify-between items-center bg-gray-100 p-3 rounded">
                <div>
                  <span className="font-medium">{item.productName}</span>
                  <span className="text-gray-600 ml-2">₹{item.sellingPrice}</span>
                </div>
                <button
                  onClick={() => handleRemoveFromCart(item.productId)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Cart is empty</p>
        )}
      </div>
    </div>
  );
};

export default ShoppingExample;