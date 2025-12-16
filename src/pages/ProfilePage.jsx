import React from 'react';
import UserProfile from '../feature/auth/components/UserProfile';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-bgSecondary py-12 px-4">
      <UserProfile />
    </div>
  );
}