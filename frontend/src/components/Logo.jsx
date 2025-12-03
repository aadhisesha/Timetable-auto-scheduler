import React from 'react';
import { FaUserShield, FaChalkboardTeacher, FaUserTie, FaUserGraduate } from 'react-icons/fa';

const Logo = ({ className = '', size = 'default', role = 'admin' }) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    default: 'w-10 h-10',
    large: 'w-12 h-12'
  };
  const isCoordinator = role === 'coordinator';
  const isFaculty = role === 'faculty';
  const isHOD = role === 'hod';
  return (
    <div className={`flex items-center ${className}`}>
      <div className={`${sizeClasses[size]} ${isCoordinator ? 'bg-green-700' : isFaculty ? 'bg-yellow-700' : isHOD ? 'bg-purple-700' : 'bg-blue-700'} rounded-lg flex items-center justify-center text-white`}>
        {isCoordinator ? (
          <FaChalkboardTeacher size={size === 'small' ? 20 : size === 'large' ? 32 : 24} />
        ) : isFaculty ? (
          <FaUserTie size={size === 'small' ? 20 : size === 'large' ? 32 : 24} />
        ) : isHOD ? (
          <FaUserGraduate size={size === 'small' ? 20 : size === 'large' ? 32 : 24} />
        ) : (
          <FaUserShield size={size === 'small' ? 20 : size === 'large' ? 32 : 24} />
        )}
      </div>
      <span className="ml-2 text-gray-900 font-semibold text-lg">
        {isCoordinator ? 'Coordinator Dashboard' : isFaculty ? 'Faculty Dashboard' : isHOD ? 'HOD Dashboard' : 'Admin Dashboard'}
      </span>
    </div>
  );
};

export default Logo; 