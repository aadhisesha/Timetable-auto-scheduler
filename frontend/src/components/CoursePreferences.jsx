import React, { useState, useEffect } from 'react';
import { courseService } from '../services/courseService';

const CoursePreferences = () => {
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchAvailableCourses();
  }, []);

  const fetchAvailableCourses = async () => {
    try {
      setLoading(true);
      const courses = await courseService.getAvailableCourses();
      setAvailableCourses(courses);
      setError(null);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to fetch available courses');
    } finally {
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
      setLoading(true);
      await courseService.submitCoursePreferences(selectedCourses);
      setSuccess('Course preferences submitted successfully');
      setError(null);
    } catch (error) {
      console.error('Error submitting preferences:', error);
      setError('Failed to submit course preferences');
      setSuccess(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Course Preferences</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="mb-6">
        <p className="text-gray-600">
          Select up to 6 courses in order of preference. Your first choice will be automatically assigned.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Selected courses: {selectedCourses.length}/6
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableCourses.map((course, index) => (
          <div
            key={course._id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedCourses.includes(course._id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
            onClick={() => handleCourseSelect(course._id)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{course.code}</h3>
                <p className="text-gray-600">{course.name}</p>
              </div>
              {selectedCourses.includes(course._id) && (
                <span className="text-blue-500 font-semibold">
                  #{selectedCourses.indexOf(course._id) + 1}
                </span>
              )}
            </div>
            <div className="mt-2 text-sm text-gray-500">
              <p>Department: {course.department}</p>
              <p>Credits: {course.credits}</p>
              <p>Semester: {course.semester}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={selectedCourses.length === 0 || loading}
          className={`px-6 py-2 rounded-md text-white font-semibold ${
            selectedCourses.length === 0 || loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {loading ? 'Submitting...' : 'Submit Preferences'}
        </button>
      </div>
    </div>
  );
};

export default CoursePreferences; 