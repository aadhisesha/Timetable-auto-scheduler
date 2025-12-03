import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const courseService = {
  // Get all courses
  getAllCourses: async () => {
    try {
      const response = await api.get('/courses');
      return response.data;
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
  },

  // Get all faculty
  getAllFaculty: async () => {
    try {
      const response = await api.get('/faculty');
      return response.data;
    } catch (error) {
      console.error('Error fetching faculty:', error);
      throw error;
    }
  },

  // Get elective courses
  getElectiveCourses: async () => {
    try {
      const response = await api.get('/courses/electives');
      return response.data;
    } catch (error) {
      console.error('Error fetching elective courses:', error);
      throw error;
    }
  },

  // Submit elective preferences
  submitElectivePreferences: async (preferences) => {
    try {
      const response = await api.post('/courses/electives/preferences', preferences);
      return response.data;
    } catch (error) {
      console.error('Error submitting elective preferences:', error);
      throw error;
    }
  },

  // Get student's elective preferences
  getElectivePreferences: async (studentId) => {
    try {
      const response = await api.get(`/courses/electives/preferences/${studentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching elective preferences:', error);
      throw error;
    }
  },

  // Add a new course
  addCourse: async (courseData) => {
    try {
      // Validate required fields
      const requiredFields = ['name', 'code', 'department', 'semester', 'credits', 'type', 'category'];
      const missingFields = requiredFields.filter(field => !courseData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      console.log('Sending course data to server:', courseData); // Debug log

      const response = await api.post('/courses', courseData);
      return response.data;
    } catch (error) {
      console.error('Error adding course:', error.response?.data || error);
      throw error.response?.data || error;
    }
  },

  // Update a course
  updateCourse: async (courseId, courseData) => {
    try {
      const response = await api.put(`/courses/${courseId}`, courseData);
      return response.data;
    } catch (error) {
      console.error('Error updating course:', error);
      throw error;
    }
  },

  // Delete a course
  deleteCourse: async (courseId) => {
    try {
      const response = await api.delete(`/courses/${courseId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting course:', error);
      throw error;
    }
  },

  // Get courses by department and semester
  getCoursesByDepartmentAndSemester: async (department, semester) => {
    try {
      const response = await api.get('/courses/department-semester', {
        params: { department, semester }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching filtered courses:', error);
      throw error;
    }
  },

  // Add multiple courses
  addCourses: async (courses) => {
    try {
      const response = await api.post('/courses/bulk', { courses });
      return response.data;
    } catch (error) {
      console.error('Error adding multiple courses:', error.response?.data || error);
      throw error.response?.data || error;
    }
  },
}; 