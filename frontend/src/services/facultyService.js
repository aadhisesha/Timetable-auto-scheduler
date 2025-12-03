import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// create axios instance that injects auth token from localStorage
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (err) => Promise.reject(err));

// Get faculty timetable for viewer
const getFacultyTimetableViewer = async (name) => {
  const response = await fetch(`/api/faculties/faculty-timetable-viewer?name=${encodeURIComponent(name)}`);
  if (!response.ok) throw new Error('Failed to fetch faculty timetable');
  return await response.json();
};

export const facultyService = {
  register: async (data) => {
    const res = await axios.post(`${API_URL}/faculties/register`, data);
    return res.data;
  },
  getUGCourses: async () => {
    const res = await axios.get(`${API_URL}/faculties/ug-courses`);
    return res.data;
  },
  storeFacultyName: async (name) => {
    const res = await axios.post(`${API_URL}/faculties/store-name`, { name });
    return res.data;
  },
  addFacultyManual: async (data) => {
    const res = await api.post(`/faculties/manual-add`, data);
    return res.data;
  },
  uploadFacultyExcel: async (faculties) => {
    const res = await api.post(`/faculties/excel-upload`, { faculties });
    return res.data;
  },
  deleteFaculty: async (id) => {
    const res = await api.delete(`/faculties/${id}`);
    return res.data;
  },
  getFacultySummary: async () => {
    const res = await api.get(`/faculties/summary`);
    return res.data;
  },
  uploadWorkloadExcel: async (workloads) => {
    const res = await axios.post(`${API_URL}/faculties/workload/excel`, { workloads });
    return res.data;
  },
  getAllFaculty: async () => {
    const res = await axios.get(`${API_URL}/faculties`);
    return res.data;
  },
  uploadFacultyAssignments: async (assignments) => {
    const res = await axios.post(`${API_URL}/hod/assignments`, { assignments });
    return res.data;
  },
  getAllAssignments: async () => {
    const res = await axios.get(`${API_URL}/hod/assignments`);
    return res.data;
  },
  getBatchSpecificAssignments: async (courseCode) => {
    const res = await axios.get(`${API_URL}/hod/assignments/${courseCode}`);
    return res.data;
  },
  getFacultyCourseAssignments: async () => {
    const res = await axios.get(`${API_URL}/faculties/assignments/timetable`);
    return res.data;
  },
  getFacultyAssignmentsForSemester: async (semester, courseType) => {
    const res = await axios.get(`${API_URL}/faculties/assignments/semester/${semester}/${courseType}`);
    return res.data;
  },
  getFacultyAssignmentsForCourseBatch: async (params) => {
    const queryParams = new URLSearchParams(params);
    const res = await axios.get(`${API_URL}/faculties/assignments/course-batch?${queryParams}`);
    return res.data;
  },
  getFacultyCourseAssignmentsByFaculty: async (facultyName) => {
    const res = await axios.get(`${API_URL}/faculties/course-assignments/name?name=${encodeURIComponent(facultyName)}`);
    return res.data;
  },
  getAllFacultyCourseAssignments: async () => {
    const res = await axios.get(`${API_URL}/faculties/course-assignments/all`);
    return res.data;
  },
  getFacultyTimetableViewer,
  createSubjectMappings: async (mappings) => {
    const res = await api.post(`/timetable-coordinator/subject-mappings`, { mappings });
    return res.data;
  },
  bulkCreateSubjectMappings: async (mappings) => {
    const res = await api.post(`/timetable-coordinator/subject-mappings/bulk`, { mappings });
    return res.data;
  },
  getAllSubjectMappings: async () => {
    const res = await api.get(`/timetable-coordinator/subject-mappings`);
    return res.data;
  },
}; 