import React, { useEffect, useState } from 'react';
import { facultyService } from '../services/facultyService';
import { useNavigate } from 'react-router-dom';

const Faculty = () => {
  const [faculties, setFaculties] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    facultyService.getAllFaculty().then(res => {
      setFaculties(res.faculties || res);
    });
  }, []);

  const handleFacultyChange = (e) => {
    const facultyId = e.target.value;
    const faculty = faculties.find(f => f._id === facultyId);
    setSelectedFaculty(faculty || null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-black mb-6">Faculty Information</h1>
      <div className="mb-6">
        <label className="block text-black mb-2">Select Faculty:</label>
        <select
          className="border rounded px-3 py-2 w-full text-black"
          value={selectedFaculty?._id || ''}
          onChange={handleFacultyChange}
        >
          <option value="">-- Select Faculty --</option>
          {faculties.map(fac => (
            <option key={fac._id} value={fac._id}>{fac.name}</option>
          ))}
        </select>
      </div>
      {selectedFaculty && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-black mb-2">Assigned Courses</h2>
          {selectedFaculty.courseHandled && selectedFaculty.courseHandled.length > 0 ? (
            <table className="min-w-full bg-white border border-gray-300 text-black mb-4">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Course Code</th>
                  <th className="border px-2 py-1">Batch</th>
                  <th className="border px-2 py-1">Semester</th>
                </tr>
              </thead>
              <tbody>
                {selectedFaculty.courseHandled.map((c, idx) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1">{c.courseCode}</td>
                    <td className="border px-2 py-1">{c.batch}</td>
                    <td className="border px-2 py-1">{c.semester || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="text-gray-600">No courses assigned.</div>}
          <div className="flex gap-4 mt-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => navigate(`/faculty/class-schedule/${selectedFaculty._id}`)}
            >
              View Class Schedule
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={() => navigate(`/faculty/workload-summary/${selectedFaculty._id}`)}
            >
              View Workload Summary
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Faculty; 