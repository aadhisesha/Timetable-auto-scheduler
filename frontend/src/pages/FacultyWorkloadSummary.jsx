import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { timetableService } from '../services/timetableService';
import { facultyService } from '../services/facultyService';

const FacultyWorkloadSummary = () => {
  const { facultyId } = useParams();
  const [faculty, setFaculty] = useState(null);
  const [workload, setWorkload] = useState([]);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Get faculty name from ID
      const allFaculties = await facultyService.getAllFaculty();
      const fac = (allFaculties.faculties || allFaculties).find(f => f._id === facultyId);
      setFaculty(fac);
      if (fac) {
        // Fetch all periods for this faculty
        const res = await timetableService.getTimetableByFacultyName(fac.name);
        const periods = res.periods || [];
        setTotalHours(periods.length);
        // Group by course and batch
        const grouped = {};
        periods.forEach(p => {
          const key = `${p.code}__${p.batch}`;
          if (!grouped[key]) grouped[key] = { course: p.name, code: p.code, batch: p.batch, count: 0 };
          grouped[key].count++;
        });
        setWorkload(Object.values(grouped));
      }
      setLoading(false);
    };
    fetchData();
  }, [facultyId]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-black mb-6">Workload Summary</h1>
      {loading ? (
        <div>Loading...</div>
      ) : faculty ? (
        <>
          <h2 className="text-xl font-semibold text-black mb-4">{faculty.name}</h2>
          <div className="mb-4 text-black font-medium">Total Hours per Week: {totalHours}</div>
          {workload.length > 0 ? (
            <table className="min-w-full bg-white border border-gray-300 text-black mb-4">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Course</th>
                  <th className="border px-2 py-1">Code</th>
                  <th className="border px-2 py-1">Batch</th>
                  <th className="border px-2 py-1">Hours</th>
                </tr>
              </thead>
              <tbody>
                {workload.map((row, idx) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1">{row.course}</td>
                    <td className="border px-2 py-1">{row.code}</td>
                    <td className="border px-2 py-1">{row.batch}</td>
                    <td className="border px-2 py-1">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="text-gray-600">No workload found.</div>}
        </>
      ) : <div className="text-gray-600">Faculty not found.</div>}
    </div>
  );
};

export default FacultyWorkloadSummary; 