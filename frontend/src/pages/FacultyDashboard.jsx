import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { facultyService } from '../services/facultyService';
import { timetableService } from '../services/timetableService';
import { useNavigate } from 'react-router-dom';

const FacultyDashboard = () => {
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [facultyDetails, setFacultyDetails] = useState(null);
  const [courseDetails, setCourseDetails] = useState({});
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Fetch all faculty names from faculties collection
  useEffect(() => {
    const fetchFaculties = async () => {
      try {
        setLoading(true);
        console.log('Fetching faculties from /api/faculties...');
        const response = await fetch('/api/faculties');
        console.log('Response status:', response.status);
        if (!response.ok) throw new Error('Failed to fetch faculties');
        const allFaculties = await response.json();
        console.log('Raw faculty data:', allFaculties);
        
        const normalizeName = name => name.replace(/\s+/g, ' ').trim().toLowerCase();
        const facultyMap = new Map();
        allFaculties.forEach(fac => {
          const normName = normalizeName(fac.name);
          if (!facultyMap.has(normName)) {
            facultyMap.set(normName, fac);
          }
        });
        const uniqueFaculties = Array.from(facultyMap.values());
        setFacultyList(uniqueFaculties);
      } catch (err) {
        console.error('Error fetching faculties:', err);
        setFacultyList([]);
        setError('Failed to fetch faculty list');
      } finally {
        setLoading(false);
      }
    };
    fetchFaculties();
  }, []);

  // Fetch faculty details when faculty is selected
  useEffect(() => {
    if (selectedFaculty) {
      setLoading(true);
      setError('');
      
      const fetchFacultyDetails = async () => {
        try {
          console.log(`Fetching details for faculty: ${selectedFaculty}`);
          
          // Fetch all faculty data from the existing /api/faculties route
          const response = await fetch('/api/faculties');
          if (!response.ok) {
            throw new Error('Failed to fetch faculty data');
          }
          const allFaculties = await response.json();
          
          // Find all faculty records with the same normalized name to combine their course assignments
          const normalizeName = name => name.replace(/\s+/g, ' ').trim().toLowerCase();
          const selectedNorm = normalizeName(selectedFaculty);
          const allFacultyRecords = allFaculties.filter(f => normalizeName(f.name) === selectedNorm);
          if (allFacultyRecords.length > 0) {
            // Combine course assignments from all records
            const combinedCourseHandled = [];
            allFacultyRecords.forEach(record => {
              if (record.courseHandled && record.courseHandled.length > 0) {
                combinedCourseHandled.push(...record.courseHandled);
              }
            });
            // Use the first record as the canonical faculty object
            const combinedFaculty = {
              ...allFacultyRecords[0],
              courseHandled: combinedCourseHandled
            };
            setFacultyDetails(combinedFaculty);
            
            // Fetch course details for each course handled by the faculty
            if (combinedFaculty.courseHandled && combinedFaculty.courseHandled.length > 0) {
              const courseDetailsMap = {};
              
              // Fetch course details from courses collection
              const courseResponse = await fetch('/api/courses');
              if (courseResponse.ok) {
                const allCourses = await courseResponse.json();
                
                // Create a map of course codes to course details
                combinedFaculty.courseHandled.forEach(course => {
                  if (course.courseCode && course.courseCode.trim() !== '') {
                    const courseInfo = allCourses.find(c => c.code === course.courseCode);
                    if (courseInfo) {
                      courseDetailsMap[course.courseCode] = {
                        name: courseInfo.name,
                        semester: courseInfo.semester,
                        type: courseInfo.type
                      };
                    }
                  }
                });
                
                // Count unique courses by course name
                const uniqueCourses = new Set();
                // Count unique batches
                const uniqueBatches = new Set();
                
                combinedFaculty.courseHandled.forEach(course => {
                  if (course.courseCode && course.courseCode.trim() !== '') {
                    const courseInfo = allCourses.find(c => c.code === course.courseCode);
                    if (courseInfo && courseInfo.name) {
                      uniqueCourses.add(courseInfo.name);
                    }
                  }
                  // Add batch to unique batches set
                  if (course.batch && course.batch.trim() !== '') {
                    uniqueBatches.add(course.batch);
                  }
                });
                
                setCourseDetails(courseDetailsMap);
                
                // Calculate overview from faculty details
                const totalClasses = combinedFaculty.courseHandled.length;
                const totalHours = combinedFaculty.courseHandled.reduce((sum, course) => {
                  // Estimate hours based on course type
                  return sum + (course.role === 'Theory Teacher' ? 3 : 2);
                }, 0);
                
                setOverview({
                  totalHours: uniqueBatches.size,
                  classesHandled: uniqueCourses.size
                });
              } else {
                // If course fetch fails, fall back to counting all entries
                const totalClasses = combinedFaculty.courseHandled.length;
                const totalHours = combinedFaculty.courseHandled.reduce((sum, course) => {
                  return sum + (course.role === 'Theory Teacher' ? 3 : 2);
                }, 0);
                
                // Count unique batches for fallback
                const uniqueBatches = new Set();
                combinedFaculty.courseHandled.forEach(course => {
                  if (course.batch && course.batch.trim() !== '') {
                    uniqueBatches.add(course.batch);
                  }
                });
                
                setOverview({
                  totalHours: uniqueBatches.size,
                  classesHandled: totalClasses
                });
              }
            } else {
              setCourseDetails({});
              setOverview({
                totalHours: 0,
                classesHandled: 0
              });
            }
          } else {
            setFacultyDetails(null);
            setCourseDetails({});
            setOverview(null);
            setError('Faculty not found');
          }
        } catch (err) {
          console.error('Error fetching faculty details:', err);
          setFacultyDetails(null);
          setCourseDetails({});
          setOverview(null);
          setError('Failed to fetch faculty details');
        } finally {
          setLoading(false);
        }
      };
      
      fetchFacultyDetails();
      // --- SYNC facultycourseassignments ---
      fetch('/api/faculties/course-assignments/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facultyName: selectedFaculty })
      })
      .then(res => res.json())
      .then(data => console.log('Synced faculty assignments:', data))
      .catch(err => console.error('Error syncing faculty assignments:', err));
      // --- END SYNC ---
    } else {
      setFacultyDetails(null);
      setCourseDetails({});
      setOverview(null);
    }
  }, [selectedFaculty]);

  return (
    <DashboardLayout role="faculty" title="Faculty Dashboard">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-black mb-6">Faculty Dashboard</h1>
        
        {/* Faculty Selection */}
        <div className="mb-6">
          <label className="block text-black mb-2 font-semibold">Select Faculty:</label>
          <select
            className="border rounded px-3 py-2 w-full text-black"
            value={selectedFaculty}
            onChange={e => setSelectedFaculty(e.target.value)}
            disabled={loading}
          >
            <option value="">-- Select Faculty --</option>
            {facultyList.map(fac => (
              <option key={fac._id || fac.name} value={fac.name}>{fac.name}</option>
            ))}
          </select>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Course Details */}
        {facultyDetails && facultyDetails.courseHandled && facultyDetails.courseHandled.length > 0 ? (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-black mb-4">Courses & Batches Handled</h2>
            <div className="space-y-4">
              {facultyDetails.courseHandled.map((course, index) => (
                <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Course Code</h4>
                      <p className="text-gray-600">{course.courseCode || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Course Name</h4>
                      <p className="text-gray-600">
                        {courseDetails[course.courseCode]?.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Semester</h4>
                      <p className="text-gray-600">
                        {courseDetails[course.courseCode]?.semester || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Course Type</h4>
                      <p className="text-gray-600">
                        {courseDetails[course.courseCode]?.type || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Role</h4>
                      <p className="text-gray-600">{course.role || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Batch</h4>
                      <p className="text-gray-600">{course.batch || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-black mb-4">Courses & Batches Handled</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-yellow-800">
              No courses assigned to {selectedFaculty}.
            </div>
          </div>
        )}

        {/* Overview Section */}
        {overview && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-black mb-4">Overview</h2>
            <div className="bg-white border border-gray-300 rounded p-6 text-black shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">{overview.totalHours}</div>
                  <div className="text-sm text-gray-600">Total Batches Handled</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">{overview.classesHandled}</div>
                  <div className="text-sm text-gray-600">Total Courses Handled</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timetable Viewer Navigation */}
        <div className="mb-6">
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-semibold"
            onClick={() => navigate('/faculty-dashboard/timetable-viewer')}
          >
            View My Timetable
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="text-blue-600 font-semibold">Loading...</div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FacultyDashboard; 