import React from 'react';
import UserProfileEdit from '../feature/auth/components/UserProfileEdit';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-bgSecondary py-12 px-5">
      <UserProfileEdit />
    </div>
  );
}