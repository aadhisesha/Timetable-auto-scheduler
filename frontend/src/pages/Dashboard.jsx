import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../context/DashboardContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { stats, upcomingEvents, loading, error } = useDashboard();

  const quickActions = [
    {
      title: 'Create Timetable',
      icon: '📅',
      action: () => navigate('/timetable-builder'),
      color: 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800'
    },
    {
      title: 'View Workload',
      icon: '📊',
      action: () => navigate('/workload-report'),
      color: 'bg-gradient-to-br from-green-600 via-green-700 to-green-800'
    },
    {
      title: 'Manage Courses',
      icon: '📚',
      action: () => navigate('/courses'),
      color: 'bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800'
    },
    {
      title: 'Audit Reports',
      icon: '📋',
      action: () => navigate('/audit-reports'),
      color: 'bg-gradient-to-br from-orange-600 via-orange-700 to-orange-800'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6 relative"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-gray-900/90"></div>
      <div className="relative z-10 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`${action.color} p-6 rounded-lg shadow-lg text-white hover:opacity-90 transition-opacity`}
            >
              <div className="text-4xl mb-2">{action.icon}</div>
              <div className="text-xl font-semibold">{action.title}</div>
            </button>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Courses"
            value={stats?.totalCourses || 0}
            icon="📚"
          />
          <StatCard
            title="Total Faculty"
            value={stats?.totalFaculty || 0}
            icon="👨‍🏫"
          />
          <StatCard
            title="Total Students"
            value={stats?.totalStudents || 0}
            icon="👨‍🎓"
          />
          <StatCard
            title="Upcoming Events"
            value={stats?.upcomingEvents || 0}
            icon="📅"
          />
        </div>

        {/* Upcoming Events */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Upcoming Events</h2>
          <div className="space-y-4">
            {(upcomingEvents || []).map((event, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors duration-200">
                <div className="text-3xl bg-white/10 p-3 rounded-full shadow-sm">{event.icon || '📅'}</div>
                <div className="flex-1">
                  <p className="font-semibold text-white">{event.title || 'Event'}</p>
                  <p className="text-sm text-gray-300">{event.description || 'No description'}</p>
                </div>
                <div className="text-sm font-medium text-gray-300 bg-white/10 px-3 py-1 rounded-full shadow-sm">
                  {event.date || 'TBD'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-300">{title}</p>
        <p className="text-3xl font-bold text-white mt-2">{value.toLocaleString()}</p>
      </div>
      <div className="text-4xl bg-white/10 p-3 rounded-full">{icon}</div>
    </div>
  </div>
);

export default Dashboard; 