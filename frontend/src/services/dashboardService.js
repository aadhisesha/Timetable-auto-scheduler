import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Mock data for development
const mockStats = {
  totalCourses: 25,
  totalFaculty: 15,
  totalStudents: 500,
  upcomingEvents: 3
};

const mockActivities = [
  {
    icon: '📚',
    title: 'New Course Added',
    description: 'Introduction to Computer Science was added to the curriculum',
    timestamp: '2 hours ago'
  },
  {
    icon: '👨‍🏫',
    title: 'Faculty Update',
    description: 'Dr. Smith updated their availability',
    timestamp: '4 hours ago'
  },
  {
    icon: '📅',
    title: 'Timetable Published',
    description: 'Spring 2024 timetable has been published',
    timestamp: '1 day ago'
  }
];

const mockEvents = [
  {
    icon: '📚',
    title: 'Course Registration',
    description: 'Fall 2024 course registration opens',
    date: '2024-08-01'
  },
  {
    icon: '👨‍🏫',
    title: 'Faculty Meeting',
    description: 'Department-wide faculty meeting',
    date: '2024-07-15'
  },
  {
    icon: '📅',
    title: 'Semester Start',
    description: 'Fall 2024 semester begins',
    date: '2024-09-01'
  }
];

export const getDashboardStats = async () => {
  try {
    // For development, return mock data
    return mockStats;
    
    // Uncomment when backend is ready
    // const response = await axios.get(`${API_URL}/dashboard/stats`);
    // return response.data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return mockStats; // Fallback to mock data
  }
};

export const getRecentActivities = async () => {
  try {
    // For development, return mock data
    return mockActivities;
    
    // Uncomment when backend is ready
    // const response = await axios.get(`${API_URL}/dashboard/activities`);
    // return response.data;
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return mockActivities; // Fallback to mock data
  }
};

export const getUpcomingEvents = async () => {
  try {
    // For development, return mock data
    return mockEvents;
    
    // Uncomment when backend is ready
    // const response = await axios.get(`${API_URL}/dashboard/events`);
    // return response.data;
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return mockEvents; // Fallback to mock data
  }
}; 