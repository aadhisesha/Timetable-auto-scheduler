import React, { useState, useEffect } from 'react';
import { courseService } from '../services/courseService';

const CourseForm = ({ course, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    credits: '',
    department: '',
    semester: '',
    type: 'UG',
    category: 'Theory',
    batches: '',
    ...course
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">
          {course ? 'Edit Course' : 'Add New Course'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Course Code</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Batches</label>
                  <input
                    type="text"
                    name="batches"
                    value={formData.batches}
                    onChange={handleChange}
                    placeholder="E.g. N,P,Q"
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Course Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Credits
            </label>
            <input
              type="number"
              name="credits"
              value={formData.credits}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Department
            </label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Semester</label>
            <select
              name="semester"
              value={formData.semester}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Semester</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
              <option value="3">Semester 3</option>
              <option value="4">Semester 4</option>
              <option value="5">Semester 5</option>
              <option value="6">Semester 6</option>
              <option value="7">Semester 7</option>
              <option value="8">Semester 8</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="UG">UG</option>
              <option value="PG">PG</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Theory">Theory</option>
              <option value="Lab Integrated Theory">Lab Integrated Theory</option>
              <option value="Lab">Lab</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-200"
            >
              {course ? 'Update Course' : 'Add Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [courseData, setCourseData] = useState({
    code: '',
    name: '',
    department: '',
    semester: '',
    type: 'UG',
    category: 'Theory',
    credits: ''
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await courseService.getAllCourses();
      setCourses(data);
    } catch (error) {
      setError('Failed to fetch courses');
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!courseData.code || !courseData.name || !courseData.department || !courseData.type || !courseData.category) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const newCourse = await courseService.addCourse(courseData);
      setCourses(prevCourses => [...prevCourses, newCourse]);
      setShowAddModal(false);
      setCourseData({
        code: '',
        name: '',
        department: '',
        semester: '',
        type: 'UG',
        category: 'Theory',
        credits: ''
      });
      setError(null);
    } catch (error) {
      console.error('Error adding course:', error);
      setError(error.response?.data?.message || 'Failed to save course. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCourseData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditCourse = (course) => {
    setSelectedCourse(course);
    setShowForm(true);
  };

  const handleDeleteCourse = async (courseId) => {
    console.log('Attempting to delete course with ID:', courseId); // Debug log
    
    if (!courseId) {
      setError('Course ID is missing');
      return;
    }

    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        setLoading(true);
        await courseService.deleteCourse(courseId);
        // Update the courses list after successful deletion
        setCourses(prevCourses => prevCourses.filter(course => (course._id || course.id) !== courseId));
        setError(null);
      } catch (error) {
        console.error('Error deleting course:', error);
        setError(error.message || 'Failed to delete course. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };
   const [file, setFile] = useState(null);
      const [message, setMessage] = useState('');
    
      const handleFileChange = (e) => {
        setFile(e.target.files[0]);
      };
    
      const handleUpload = async () => {
        const formData = new FormData();
        formData.append('pdf', file); // ✅ must match 'pdf'
      
        try {
          const res = await axios.post(
            'http://localhost:5000/api/courses/upload', // ✅ must match
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
          setMessage(res.data.message + ` (${res.data.count} courses inserted)`);
        } catch (err) {
          console.error("Upload Error:", err);
          setMessage(err.response?.data?.message || err.message || "Upload failed.");
        }
      };

  const handleSubmit = async (formData) => {
    try {
      if (selectedCourse) {
        // Update existing course
        const updatedCourse = await courseService.updateCourse(selectedCourse._id, formData);
        setCourses(courses.map(course => 
          course._id === selectedCourse._id ? updatedCourse : course
        ));
      } else {
        // Create new course
        const newCourse = await courseService.createCourse(formData);
        setCourses([...courses, newCourse]);
      }
      setShowForm(false);
    } catch (error) {
      setError('Failed to save course');
      console.error('Error saving course:', error);
    }
  };

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 max-w-md">
          <p className="text-red-200 text-center">{error}</p>
          <button 
            onClick={fetchCourses}
            className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
          >
            Retry
          </button>
        </div>
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
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Course Management</h1>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span>Add New Course</span>
            </button>
          </div>

          <div className="mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search courses by name, code, or faculty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-6 py-4 bg-white/10 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute right-4 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5">
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Course Code</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Course Name</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Semester</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Course Type</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Batches</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Credits</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredCourses.map(course => (
                    <tr key={course.id || course._id} className="hover:bg-white/5 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{course.code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{course.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{course.department}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{course.semester}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{course.courseType || course.type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {(() => {
                            const raw = (course.batches || course.batch || '').toString();
                            if (!raw) return '-';
                            const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
                            return parts.length ? parts.join(', ') : '-';
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{course.credits}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditCourse(course)}
                          className="text-blue-400 hover:text-blue-300 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            console.log('Course to delete:', course); // Debug log
                            handleDeleteCourse(course._id || course.id);
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <CourseForm
          course={selectedCourse}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Add New Course</h2>
            <form onSubmit={handleAddCourse}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300">Course Code</label>
                  <input
                    type="text"
                    name="code"
                    value={courseData.code}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Course Name</label>
                  <input
                    type="text"
                    name="name"
                    value={courseData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={courseData.department}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Semester</label>
                  <input
                    type="text"
                    name="semester"
                    value={courseData.semester}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Batches</label>
                  <input
                    type="text"
                    name="batches"
                    value={courseData.batches || ''}
                    onChange={handleInputChange}
                    placeholder="E.g. N,P,Q"
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Type</label>
                  <select
                    name="type"
                    value={courseData.type}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="UG">UG</option>
                    <option value="PG">PG</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Category</label>
                  <select
                    name="category"
                    value={courseData.category}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="Theory">Theory</option>
                    <option value="Lab Integrated Theory">Lab Integrated Theory</option>
                    <option value="Lab">Lab</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Credits</label>
                  <input
                    type="number"
                    name="credits"
                    value={courseData.credits}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Course Type</label>
                  <select
                    name="courseType"
                    value={courseData.courseType || courseData.type}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="UG">UG</option>
                    <option value="PG">PG</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Add Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagement; 