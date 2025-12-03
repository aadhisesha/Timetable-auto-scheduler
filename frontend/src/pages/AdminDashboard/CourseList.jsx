import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const CourseList = (props) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courses`);
      setCourses(res.data);
    } catch (err) {
      toast.error('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  return (
    <div>
      {loading ? (
        <div style={{ color: 'black' }}>Loading courses...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'black' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: 4, color: 'black' }}>Code</th>
              <th style={{ border: '1px solid #ccc', padding: 4, color: 'black' }}>Name</th>
              <th style={{ border: '1px solid #ccc', padding: 4, color: 'black' }}>Credits</th>
              <th style={{ border: '1px solid #ccc', padding: 4, color: 'black' }}>Semester</th>
              <th style={{ border: '1px solid #ccc', padding: 4, color: 'black' }}>Department</th>
              <th style={{ border: '1px solid #ccc', padding: 4, color: 'black' }}>Type</th>
              <th style={{ border: '1px solid #ccc', padding: 4, color: 'black' }}>Category</th>
            </tr>
          </thead>
          <tbody>
            {courses.map(course => (
              <tr key={course._id || course.code}>
                <td style={{ border: '1px solid #ccc', padding: 4, color: 'black' }}>{course.code}</td>
                <td style={{ border: '1px solid #ccc', padding: 4, color: 'black' }}>{course.name}</td>
                <td style={{ border: '1px solid #ccc', padding: 4, color: 'black' }}>{course.credits}</td>
                <td style={{ border: '1px solid #ccc', padding: 4, color: 'black' }}>{course.semester}</td>
                <td style={{ border: '1px solid #ccc', padding: 4, color: 'black' }}>{course.department}</td>
                <td style={{ border: '1px solid #ccc', padding: 4, color: 'black' }}>{course.type}</td>
                <td style={{ border: '1px solid #ccc', padding: 4, color: 'black' }}>{course.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CourseList; 