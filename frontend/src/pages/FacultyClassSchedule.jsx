import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { timetableService } from '../services/timetableService';
import { facultyService } from '../services/facultyService';

const FacultyClassSchedule = () => {
  const { facultyId } = useParams();
  const [faculty, setFaculty] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Get faculty name from ID
      const allFaculties = await facultyService.getAllFaculty();
      const fac = (allFaculties.faculties || allFaculties).find(f => f._id === facultyId);
      setFaculty(fac);
      if (fac) {
        // Fetch timetable periods for this faculty
        const res = await timetableService.getTimetableByFacultyName(fac.name);
        setSchedule(res.periods || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [facultyId]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-black mb-6">Class Schedule</h1>
      {loading ? (
        <div>Loading...</div>
      ) : faculty ? (
        <>
          <h2 className="text-xl font-semibold text-black mb-4">{faculty.name}</h2>
          {schedule.length > 0 ? (
            <table className="min-w-full bg-white border border-gray-300 text-black mb-4">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Day</th>
                  <th className="border px-2 py-1">Slot</th>
                  <th className="border px-2 py-1">Course</th>
                  <th className="border px-2 py-1">Batch</th>
                  <th className="border px-2 py-1">Venue</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((period, idx) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1">{period.day}</td>
                    <td className="border px-2 py-1">{period.slot}</td>
                    <td className="border px-2 py-1">{period.name}</td>
                    <td className="border px-2 py-1">{period.batch}</td>
                    <td className="border px-2 py-1">{period.venue || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="text-gray-600">No upcoming classes found.</div>}
        </>
      ) : <div className="text-gray-600">Faculty not found.</div>}
    </div>
  );
};

export default FacultyClassSchedule; 