import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../services/courseService';

const ElectiveSubmission = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedElectives, setSelectedElectives] = useState([]);
  const [studentInfo, setStudentInfo] = useState({
    name: '',
    rollNumber: '',
    department: '',
    semester: '',
    email: ''
  });

  const departments = {
    'CSE': 'Computer Science',
    'ECE': 'Electronics',
    'MECH': 'Mechanical',
    'CIVIL': 'Civil'
  };

  const semesters = ['5', '6', '7', '8'];

  useEffect(() => {
    fetchElectiveCourses();
  }, []);

  const fetchElectiveCourses = async () => {
    try {
      setLoading(true);
      const data = await courseService.getElectiveCourses();
      setCourses(data);
    } catch (error) {
      console.error('Error fetching elective courses:', error);
      setError('Failed to fetch elective courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStudentInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleElectiveSelection = (courseId) => {
    setSelectedElectives(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      }
      if (prev.length < 3) {
        return [...prev, courseId];
      }
      return prev;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Validate form
      if (!studentInfo.name || !studentInfo.rollNumber || !studentInfo.department || 
          !studentInfo.semester || !studentInfo.email) {
        throw new Error('Please fill in all required fields');
      }

      if (selectedElectives.length === 0) {
        throw new Error('Please select at least one elective course');
      }

      // Prepare submission data
      const submissionData = {
        studentInfo,
        selectedElectives,
        submissionDate: new Date().toISOString()
      };

      // Submit preferences
      await courseService.submitElectivePreferences(submissionData);
      
      setSuccess('Elective preferences submitted successfully!');
      
      // Reset form after successful submission
      setStudentInfo({
        name: '',
        rollNumber: '',
        department: '',
        semester: '',
        email: ''
      });
      setSelectedElectives([]);
    } catch (error) {
      console.error('Error submitting elective preferences:', error);
      setError(error.message || 'Failed to submit preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Elective Course Selection</h1>
          
          {/* Student Information Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={studentInfo.name}
                  onChange={handleInputChange}
                  className="w-full rounded-md bg-white/5 border border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Roll Number</label>
                <input
                  type="text"
                  name="rollNumber"
                  value={studentInfo.rollNumber}
                  onChange={handleInputChange}
                  className="w-full rounded-md bg-white/5 border border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Department</label>
                <select
                  name="department"
                  value={studentInfo.department}
                  onChange={handleInputChange}
                  className="w-full rounded-md bg-white/5 border border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Department</option>
                  {Object.entries(departments).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Semester</label>
                <select
                  name="semester"
                  value={studentInfo.semester}
                  onChange={handleInputChange}
                  className="w-full rounded-md bg-white/5 border border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Semester</option>
                  {semesters.map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={studentInfo.email}
                  onChange={handleInputChange}
                  className="w-full rounded-md bg-white/5 border border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Elective Course Selection */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Select Elective Courses (Choose up to 3)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map(course => (
                  <div
                    key={course._id}
                    className={`p-4 rounded-lg cursor-pointer transition-colors duration-200 ${
                      selectedElectives.includes(course._id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                    onClick={() => handleElectiveSelection(course._id)}
                  >
                    <h3 className="font-semibold">{course.name}</h3>
                    <p className="text-sm opacity-75">{course.code}</p>
                    <p className="text-sm mt-2">{course.description}</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/10">
                        {course.credits} Credits
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-white/10">
                        {course.faculty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error and Success Messages */}
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg">
                <p className="text-red-200">{error}</p>
              </div>
            )}
            {success && (
              <div className="p-4 bg-green-500/20 border border-green-500 rounded-lg">
                <p className="text-green-200">{success}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                className={`px-6 py-3 rounded-lg shadow-lg transition-colors duration-200 flex items-center space-x-2 ${
                  loading
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-semibold`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                    </svg>
                    <span>Submit Preferences</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ElectiveSubmission; 