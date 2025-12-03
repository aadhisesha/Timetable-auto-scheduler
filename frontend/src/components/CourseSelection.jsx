import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CourseSelection = () => {
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchAvailableCourses();
  }, []);

  const fetchAvailableCourses = async () => {
    try {
      const response = await axios.get('/api/courses/available');
      setAvailableCourses(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch courses');
      setLoading(false);
    }
  };

  const handleCourseSelect = (courseId) => {
    if (selectedCourses.includes(courseId)) {
      setSelectedCourses(selectedCourses.filter(id => id !== courseId));
    } else if (selectedCourses.length < 6) {
      setSelectedCourses([...selectedCourses, courseId]);
    } else {
      setError('You can only select up to 6 courses');
    }
  };

  const handleSubmit = async () => {
    try {
      await axios.post('/api/faculty/preferred-courses', {
        courseIds: selectedCourses
      });
      setSuccess(true);
      setError(null);
    } catch (err) {
      setError('Failed to save course preferences');
      setSuccess(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Select Your Preferred Courses</h2>
      <p className="text-gray-600 mb-4">Choose up to 6 UG courses you would like to teach</p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Course preferences saved successfully!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {availableCourses.map(course => (
          <div
            key={course._id}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedCourses.includes(course._id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
            onClick={() => handleCourseSelect(course._id)}
          >
            <h3 className="font-medium">{course.name}</h3>
            <p className="text-sm text-gray-600">Code: {course.code}</p>
            <p className="text-sm text-gray-600">Credits: {course.credits}</p>
            <p className="text-sm text-gray-600">Type: {course.type}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Selected: {selectedCourses.length}/6 courses
        </p>
        <button
          onClick={handleSubmit}
          disabled={selectedCourses.length === 0}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
};

export default CourseSelection; 