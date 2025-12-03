import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const timetableService = {
  // Get available courses for a semester and department
  getAvailableCourses: async (semester, department) => {
    try {
      const response = await axios.get(`${API_URL}/courses/available`, {
        params: { semester, department }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching available courses:', error);
      throw error;
    }
  },

  // Generate timetable
  generateTimetable: async (timetableData) => {
    try {
      const response = await axios.post(`${API_URL}/timetables/generate`, timetableData);
      return response.data;
    } catch (error) {
      console.error('Error generating timetable:', error);
      throw error;
    }
  },

  // Auto schedule timetable with lab constraints
  autoScheduleTimetable: async (scheduleData) => {
    try {
      const response = await axios.post(`${API_URL}/timetables/auto-schedule`, scheduleData);
      return response.data;
    } catch (error) {
      console.error('Error auto-scheduling timetable:', error);
      throw error;
    }
  },

  // Save timetables
  saveTimetables: async (timetablesData) => {
    try {
      const response = await axios.post(`${API_URL}/timetables`, timetablesData);
      return response.data;
    } catch (error) {
      console.error('Error saving timetables:', error);
      throw error;
    }
  },

  // Save single timetable
  saveTimetable: async (timetableData) => {
    try {
      const response = await axios.post(`${API_URL}/timetables/save`, timetableData);
      return response.data;
    } catch (error) {
      console.error('Error saving timetable:', error);
      throw error;
    }
  },

  // Get timetable by ID
  getTimetable: async (timetableId) => {
    try {
      const response = await axios.get(`${API_URL}/timetables/${timetableId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching timetable:', error);
      throw error;
    }
  },

  // Update timetable
  updateTimetable: async (timetableId, timetableData) => {
    try {
      const response = await axios.put(`${API_URL}/timetables/${timetableId}`, timetableData);
      return response.data;
    } catch (error) {
      console.error('Error updating timetable:', error);
      throw error;
    }
  },

  // Delete timetable
  deleteTimetable: async (timetableId) => {
    try {
      const response = await axios.delete(`${API_URL}/timetables/${timetableId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting timetable:', error);
      throw error;
    }
  },

  // Get all saved timetables
  getAllTimetables: async () => {
    try {
      const response = await axios.get(`${API_URL}/timetables`);
      return response.data;
    } catch (error) {
      console.error('Error fetching all timetables:', error);
      throw error;
    }
  },

  // Get timetable by faculty name
  getTimetableByFacultyName: async (name) => {
    const response = await axios.get(`${API_URL}/timetables/by-faculty-name`, { params: { name } });
    return response.data;
  },

  // Get timetable by batch
  getTimetableByBatch: async (batch, semester, type) => {
    const params = {};
    if (type) params.type = type;
    if (batch) params.batch = batch;
    if (semester) params.semester = semester;
    const response = await axios.get(`${API_URL}/timetables/by-batch`, { params });
    return response.data;
  },

  // Get teaching overview for faculty
  getTeachingOverview: async (name) => {
    const response = await axios.get(`${API_URL}/timetables/teaching-overview`, { params: { name } });
    return response.data;
  },

  // Room/Lab Allocations
  getRoomAllocations: async () => {
    const response = await axios.get(`${API_URL}/timetables/room-allocations`);
    return response.data;
  },
  createRoomAllocation: async (allocation) => {
    const response = await axios.post(`${API_URL}/timetables/room-allocations`, allocation);
    return response.data;
  },
  deleteRoomAllocation: async (id) => {
    const response = await axios.delete(`${API_URL}/timetables/room-allocations/${id}`);
    return response.data;
  },
  updateRoomAllocation: async (id, allocation) => {
    const response = await axios.put(`${API_URL}/timetables/room-allocations/${id}`, allocation);
    return response.data;
  }
}; 