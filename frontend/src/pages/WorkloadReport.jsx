import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const WorkloadReport = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workloadData, setWorkloadData] = useState({
    totalHours: 0,
    courses: [],
    departments: [],
    semesters: []
  });

  useEffect(() => {
    fetchWorkloadData();
  }, []);

  const fetchWorkloadData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      const mockData = {
        totalHours: 45,
        courses: [
          { name: 'Mathematics', hours: 15, department: 'Science', semester: '1' },
          { name: 'Physics', hours: 12, department: 'Science', semester: '2' },
          { name: 'Computer Science', hours: 18, department: 'Engineering', semester: '3' }
        ],
        departments: [
          { name: 'Science', hours: 27 },
          { name: 'Engineering', hours: 18 }
        ],
        semesters: [
          { name: 'Fall 2024', hours: 27 },
          { name: 'Spring 2025', hours: 18 }
        ]
      };
      setWorkloadData(mockData);
    } catch (err) {
      setError('Failed to fetch workload data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="bg-red-900 bg-opacity-50 p-4 rounded-lg">
          <p className="text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1501504905252-473c47e087f8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80')] bg-cover bg-center opacity-10"></div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Workload Report</h1>
          <p className="text-gray-400">Overview of teaching workload distribution</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 rounded-lg p-6 shadow-lg"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Total Teaching Hours</h3>
            <p className="text-3xl font-bold text-indigo-400">{workloadData.totalHours}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 rounded-lg p-6 shadow-lg"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Departments</h3>
            <p className="text-3xl font-bold text-indigo-400">{workloadData.departments.length}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 rounded-lg p-6 shadow-lg"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Active Semesters</h3>
            <p className="text-3xl font-bold text-indigo-400">{workloadData.semesters.length}</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800 rounded-lg p-6 shadow-lg"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Department Distribution</h3>
            <div className="space-y-4">
              {workloadData.departments.map((dept, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-300">{dept.name}</span>
                  <div className="flex items-center">
                    <div className="w-32 h-2 bg-gray-700 rounded-full mr-2">
                      <div
                        className="h-2 bg-indigo-500 rounded-full"
                        style={{ width: `${(dept.hours / workloadData.totalHours) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-gray-300">{dept.hours}h</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-800 rounded-lg p-6 shadow-lg"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Course Details</h3>
            <div className="space-y-4">
              {workloadData.courses.map((course, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="text-white font-medium">{course.name}</h4>
                    <p className="text-sm text-gray-400">{course.department} • {course.semester}</p>
                  </div>
                  <span className="text-indigo-400 font-semibold">{course.hours}h</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default WorkloadReport; 