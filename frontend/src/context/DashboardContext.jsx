import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDashboardStats, getRecentActivities, getUpcomingEvents } from '../services/dashboardService';

const DashboardContext = createContext();

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export const DashboardProvider = ({ children }) => {
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalFaculty: 0,
    totalStudents: 0,
    upcomingEvents: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsData, activitiesData, eventsData] = await Promise.all([
          getDashboardStats(),
          getRecentActivities(),
          getUpcomingEvents()
        ]);
        
        setStats(statsData);
        setRecentActivities(activitiesData);
        setUpcomingEvents(eventsData);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const value = {
    stats,
    recentActivities,
    upcomingEvents,
    loading,
    error
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}; 