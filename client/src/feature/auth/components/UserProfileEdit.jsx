import React, { useState } from 'react';

export default function UserProfileEdit() {
  const [user, setUser] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(user);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = () => {
    setUser(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(user);
    setIsEditing(false);
  };

  return (
    <div className="max-w-md mx-auto bg-bgPrimary p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-textPrimary mb-6">User Profile</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-textSecondary text-sm font-medium mb-2">
            Name
          </label>
          {isEditing ? (
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-bgSecondary rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          ) : (
            <p className="text-textPrimary">{user.name}</p>
          )}
        </div>

        <div>
          <label className="block text-textSecondary text-sm font-medium mb-2">
            Email
          </label>
          {isEditing ? (
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-bgSecondary rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          ) : (
            <p className="text-textPrimary">{user.email}</p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="bg-bgSecondary text-textSecondary px-4 py-2 rounded-md hover:bg-bgSecondary/80 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-accent text-white px-4 py-2 rounded-md hover:bg-accent/90 transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}