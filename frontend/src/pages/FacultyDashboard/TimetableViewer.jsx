import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { facultyService } from '../../services/facultyService';
import { timetableService } from '../../services/timetableService';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TimetableViewer = () => {
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [facultyTimetable, setFacultyTimetable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch all faculty names from faculties collection
    const fetchFaculties = async () => {
      try {
        const response = await fetch('/api/faculties');
        if (!response.ok) throw new Error('Failed to fetch faculties');
        const allFaculties = await response.json();
        // Remove duplicates by normalized name
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
      }
    };
    fetchFaculties();
  }, []);

  const handleFacultySubmit = async (e) => {
    e.preventDefault();
    if (!selectedFaculty) {
      setError('Please select a faculty name');
      return;
    }

    setLoading(true);
    setFacultyTimetable(null);
    setError('');

    try {
      // Fetch all faculties to get the canonical name for the selected normalized name
      const responseFac = await fetch('/api/faculties');
      const allFaculties = responseFac.ok ? await responseFac.json() : [];
      const normalizeName = name => name.replace(/\s+/g, ' ').trim().toLowerCase();
      const selectedNorm = normalizeName(selectedFaculty);
      // Find the first faculty record with the same normalized name
      const canonicalFac = allFaculties.find(f => normalizeName(f.name) === selectedNorm);
      const canonicalName = canonicalFac ? canonicalFac.name : selectedFaculty;
      // Fetch timetable by canonical faculty name using the backend endpoint
      const response = await facultyService.getFacultyTimetableViewer(canonicalName);
      setFacultyTimetable(response.timetable || null);
    } catch (err) {
      console.error('Error fetching faculty timetable:', err);
      setError('Could not fetch faculty timetable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDayOrder = () => {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  };

  const getTimeSlotOrder = () => {
    return [
      '08:30-09:20', '09:25-10:15', '10:30-11:20', '11:25-12:15',
      '01:10-02:00', '02:05-02:55', '03:00-03:50', '03:55-04:45'
    ];
  };

  // PDF download handler
  const handleDownloadPDF = () => {
    if (!facultyTimetable || !selectedFaculty) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Timetable for ${selectedFaculty}`, 105, 15, { align: 'center' });
    doc.setFontSize(10);
    const head = [
      ['Day', ...getTimeSlotOrder()]
    ];
    const body = getDayOrder().map(day => [
      day,
      ...getTimeSlotOrder().map(slot => {
        const period = facultyTimetable[day]?.[slot];
        if (!period) return '-';
        let text = period.name || '';
        if (period.batch) text += `\n ${period.batch}`;
        if (period.code) text += `\n${period.code}`;
        if (typeof period.isLab !== 'undefined') {
          text += `\n${period.isLab ? 'Lab Hour' : 'Theory Hour'}`;
        }
        return text;
      })
    ]);
    autoTable(doc, {
      head,
      body,
      startY: 25,
      styles: { fontSize: 8, valign: 'middle', halign: 'center' },
      headStyles: { fillColor: [220, 220, 220], textColor: 20, fontStyle: 'bold' },
      bodyStyles: { minCellHeight: 10 },
      margin: { left: 8, right: 10 },
      tableWidth: 'auto',
      columnStyles: {
        0: { cellWidth: 22 }, // Day column
        1: { cellWidth: 22 },
        2: { cellWidth: 22 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 22 },
        6: { cellWidth: 22 },
        7: { cellWidth: 22 },
        8: { cellWidth: 22 },
      }
    });
    doc.save(`Timetable_${selectedFaculty.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <DashboardLayout role="faculty" title="Timetable Viewer">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-black">Timetable Viewer</h1>
          <button
            onClick={() => navigate('/faculty-dashboard')}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Faculty Selection Form */}
        <div className="mb-6">
          <form onSubmit={handleFacultySubmit} className="bg-white border border-gray-300 rounded p-4">
            <h2 className="text-xl font-semibold text-black mb-4">Select Your Name</h2>
            <div className="mb-4">
              <label className="block text-black mb-2">Faculty Name:</label>
              <select
                className="border rounded px-3 py-2 w-full text-black"
                value={selectedFaculty}
                onChange={e => setSelectedFaculty(e.target.value)}
                required
              >
                <option value="">-- Select Your Name --</option>
                {facultyList.map(fac => (
                  <option key={fac._id || fac.name} value={fac.name}>{fac.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'View My Timetable'}
            </button>
            {error && <div className="text-red-600 mt-2">{error}</div>}
          </form>
        </div>

        {/* Faculty Timetable Display */}
        {facultyTimetable && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-black mb-4">
              Timetable for {selectedFaculty}
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-300 text-black">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Day</th>
                    {getTimeSlotOrder().map(slot => (
                      <th key={slot} className="border px-2 py-1">{slot}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getDayOrder().map(day => (
                    <tr key={day}>
                      <td className="border px-2 py-1 font-semibold">{day}</td>
                      {getTimeSlotOrder().map(slot => {
                        const period = facultyTimetable[day]?.[slot] || null;
                        return (
                          <td key={slot} className="border px-2 py-1">
                            {period ? (
                              <div>
                                <div className="font-medium">{period.name}</div>
                                <div className="text-xs">{period.batch}</div>
                                <div className="text-xs">{period.code}</div>
                                <div className="text-xs text-blue-600">{period.type}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={handleDownloadPDF}
            >
              Download PDF
            </button>
          </div>
        )}

        {facultyTimetable && Object.values(facultyTimetable).every(daySlots => Object.values(daySlots).every(slot => !slot)) && (
          <div className="text-center py-8">
            <div className="text-gray-600">No timetable found for {selectedFaculty}</div>
            <div className="text-sm text-gray-500 mt-2">
              The timetable may not have been generated yet or there are no classes assigned.
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-4">
            <div className="text-blue-600">Loading timetable...</div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TimetableViewer; 