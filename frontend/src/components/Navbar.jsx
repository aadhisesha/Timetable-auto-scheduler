import React from 'react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const Navbar = () => {
  const { user } = useAuth();

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Logo size="small" />
          </div>
          <div className="flex items-center">
            <div className="ml-4 flex items-center md:ml-6">
              <div className="text-gray-300 mr-4">
                {user?.name || 'User'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 