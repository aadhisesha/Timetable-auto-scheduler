import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Logo from './Logo';

const DashboardLayout = ({ children, role, title }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // TODO: Implement logout logic
    navigate('/login');
  };

  const getMenuItems = () => {
    switch (role) {
      case 'admin':
        return [
          { label: 'Upload Electives', path: '/admin/electives' },
          { label: 'System Management', path: '/admin/system' },
          { label: 'Reports', path: '/admin/reports' }
        ];
      case 'faculty':
        return [
          { label: 'Submit Preferences', path: '/faculty/preferences' },
          { label: 'View Schedule', path: '/faculty/schedule' }
        ];
      case 'hod':
        return [
          { label: 'View Allocations', path: '/hod/allocations' },
          { label: 'Department Reports', path: '/hod/reports' }
        ];
      case 'coordinator':
        return [
          { label: 'Timetable Builder', path: '/timetable-builder' },
          { label: 'Workload Management', path: '/coordinator/workload' }
        ];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Bar */}
      <header className="bg-white shadow-sm sticky top-0 z-50 w-full">
        <div className="flex items-center px-4 sm:px-8 py-3 gap-4">
          <Logo size="default" className="mr-2" role={role} />
          <div className="flex-1" />
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-800"
            >
              Logout
            </button>
        </div>
      </header>
        {/* Main Content */}
      <main className="flex-1 p-6 w-full max-w-7xl mx-auto">
          {children}
        </main>
    </div>
  );
};

export default DashboardLayout; 