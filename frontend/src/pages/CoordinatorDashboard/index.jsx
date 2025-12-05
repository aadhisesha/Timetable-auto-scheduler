import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { timetableService } from '../../services/timetableService';
import { courseService } from '../../services/courseService';
import { facultyService } from '../../services/facultyService';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ROOM_INFRA = {
  UG: {
    rooms: [
      ...Array.from({ length: 10 }, (_, i) => `101`.replace('101', `${101 + i}`)),
      ...Array.from({ length: 10 }, (_, i) => `201`.replace('201', `${201 + i}`)),
      ...Array.from({ length: 10 }, (_, i) => `301` .replace('301', `${301 + i}`)),
      ...Array.from({ length: 10 }, (_, i) => `401` .replace('401', `${401 + i}`)),
    ],
    labs: ['Ground Floor Lab', 'Second Floor Lab', 'Third Floor Lab'],
  },
  PG: {
    rooms: ['R1', 'R2'],
    labs: ['First Floor Lab (PG only)'],
    semRoomMap: {
      '1': ['R1' ],
      '2': ['R1'],
      '3': ['R2'],
      '4': ['R2'],
    },
  },
};
const UG_BATCHES = ['N', 'P', 'Q'];

const SEMESTERS = ['1','2','3','4','5','6','7','8'];

const UG_SEM_1_2_ROOMS = ['Class 73', 'Class 74', 'Class 75']; // Red Building
const UG_KP_ROOMS = [
  ...Array.from({ length: 10 }, (_, i) => `${101 + i}`),
  ...Array.from({ length: 10 }, (_, i) => `${201 + i}`),
  ...Array.from({ length: 10 }, (_, i) => `${301 + i}`),
  ...Array.from({ length: 10 }, (_, i) => `${401 + i}`),
];

const PG_SEMESTERS = ['1', '2', '3', '4'];

const RoomAllocationPanel = ({ user }) => {
  const [semesterType, setSemesterType] = useState('Odd');
  const [courseType, setCourseType] = useState('UG');
  const [semester, setSemester] = useState('1');
  const [batch, setBatch] = useState('N');
  const [room, setRoom] = useState('');
  const [allocations, setAllocations] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [hasDisabledStudents, setHasDisabledStudents] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [roomUploadLoading, setRoomUploadLoading] = useState(false);
  const [roomUploadResults, setRoomUploadResults] = useState(null);

  // Fetch allocations on mount and after changes
  useEffect(() => {
    fetchAllocations();
  }, []);

  const fetchAllocations = async () => {
    try {
      const data = await timetableService.getRoomAllocations();
      console.log('Fetched Room Allocations:', data); // Add this
      setAllocations(data);
    } catch (err) {
      console.error('Error fetching room allocations:', err);
      setError('Failed to fetch room allocations');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this allocation?')) return;
    try {
      await timetableService.deleteRoomAllocation(id);
      await fetchAllocations();
    } catch (err) {
      setError('Failed to delete allocation');
    }
  };

  const handleEdit = (allocation) => {
    setEditingId(allocation._id);
    setEditData({ ...allocation });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    try {
      await timetableService.updateRoomAllocation(editData._id, editData);
      setEditingId(null);
      setEditData({});
      await fetchAllocations();
    } catch (err) {
      setError('Failed to update allocation');
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const getRoomOptions = () => {
    if (
      hasDisabledStudents &&
      courseType === 'UG' &&
      Number(semester) >= 3 &&
      Number(semester) <= 8
    ) {
      return Array.from({ length: 10 }, (_, i) => `${101 + i}`);
    }
    if (courseType === 'UG') {
      if (semester === '1' || semester === '2') {
        return UG_SEM_1_2_ROOMS;
      } else {
        return UG_KP_ROOMS;
      }
    }
    if (courseType === 'PG') {
      if (semester === '1' || semester === '2') {
        return ['R1'];
      } else if (semester === '3' || semester === '4') {
        return ['R2'];
      }
    }
    return [];
  };

  const getBatchOptions = () => {
    if (courseType === 'UG') return UG_BATCHES;
    return [];
  };

  const getSemesterOptions = () => {
    let semesters = [];
    if (courseType === 'UG') semesters = SEMESTERS;
    if (courseType === 'PG') semesters = PG_SEMESTERS;
    return semesters.filter(s => {
      const num = parseInt(s, 10);
      if (semesterType === 'Odd') return num % 2 === 1;
      if (semesterType === 'Even') return num % 2 === 0;
      return true;
    });
  };

  const handleAssign = async () => {
    setError('');
    if (!room) {
      setError('Please enter a room.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        courseType,
        semester,
        batch: courseType === 'UG' ? batch : null,
        room,
        assignedBy: user?.email || user?.id || 'coordinator',
        semesterType,
      };
      await timetableService.createRoomAllocation(payload);
      setRoom('');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      await fetchAllocations();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to assign room.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUploadRoomAllocations = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setRoomUploadLoading(true);
    setRoomUploadResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const rowsAll = [];

      for (const sheetName of workbook.SheetNames) {
        try {
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
          if (rows.length === 0) continue;

          // Find header row
          let headerRowIndex = -1;
          let headers = [];
          const required = ['course type', 'semester', 'batch', 'room'];
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!Array.isArray(row)) continue;
            const lower = row.map(h => (h ? String(h).toLowerCase().trim() : ''));
            if (required.every(r => lower.some(h => h.includes(r)))) {
              headerRowIndex = i;
              headers = lower;
              break;
            }
          }
          if (headerRowIndex === -1) continue;

          const idxCourseType = headers.findIndex(h => h.includes('course type'));
          const idxSemester = headers.findIndex(h => h.includes('semester'));
          const idxBatch = headers.findIndex(h => h.includes('batch'));
          const idxRoom = headers.findIndex(h => h.includes('room'));

          for (let r = headerRowIndex + 1; r < rows.length; r++) {
            const row = rows[r];
            if (!Array.isArray(row) || row.every(c => c === null)) continue;
            const courseType = row[idxCourseType] ? String(row[idxCourseType]).trim() : '';
            const semesterVal = row[idxSemester] ? String(row[idxSemester]).trim() : '';
            const batchVal = row[idxBatch] ? String(row[idxBatch]).trim() : '';
            const roomVal = row[idxRoom] ? String(row[idxRoom]).trim() : '';
            if (!courseType || !semesterVal || !roomVal) {
              // skip incomplete rows
              continue;
            }
            rowsAll.push({ courseType: courseType.toUpperCase(), semester: semesterVal, batch: batchVal || null, room: roomVal });
          }
        } catch (err) {
          console.error('Sheet parse error', sheetName, err);
        }
      }

      if (rowsAll.length === 0) {
        setRoomUploadResults({ successful: 0, failed: 0, error: 'No valid rows found. Ensure headers: Course Type, Semester, Batch, Room' });
        setRoomUploadLoading(false);
        return;
      }

      const results = { successful: 0, failed: 0, errors: [] };

      for (const row of rowsAll) {
        try {
          // determine semesterType if possible
          let semesterTypeForRow = semesterType;
          const semNum = parseInt(row.semester, 10);
          if (!isNaN(semNum)) semesterTypeForRow = semNum % 2 === 1 ? 'Odd' : 'Even';

          const payload = {
            courseType: row.courseType,
            semester: row.semester,
            batch: row.batch,
            room: row.room,
            assignedBy: user?.email || user?.id || 'coordinator',
            semesterType: semesterTypeForRow,
          };
          await timetableService.createRoomAllocation(payload);
          results.successful += 1;
        } catch (err) {
          results.failed += 1;
          results.errors.push({ row, error: err.response?.data?.message || err.message });
        }
      }

      setRoomUploadResults(results);
      await fetchAllocations();
    } catch (err) {
      setRoomUploadResults({ successful: 0, failed: 1, error: err.message });
    } finally {
      setRoomUploadLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 rounded-lg p-6 mt-8">
      <h3 className="text-lg font-semibold mb-4 text-blue-900">Room Allocation Panel</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-black">Semester Type</label>
          <select value={semesterType} onChange={e => {
            setSemesterType(e.target.value);
            const filtered = (courseType === 'UG' ? SEMESTERS : PG_SEMESTERS).filter(s => {
              const num = parseInt(s, 10);
              if (e.target.value === 'Odd') return num % 2 === 1;
              if (e.target.value === 'Even') return num % 2 === 0;
              return true;
            });
            setSemester(filtered[0] || '1');
            setBatch('N');
            setRoom('');
          }} className="w-full rounded border-gray-300 text-black">
            <option value="Odd">Odd</option>
            <option value="Even">Even</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-black">Course Type</label>
          <select value={courseType} onChange={e => {
            setCourseType(e.target.value);
            const filtered = (e.target.value === 'UG' ? SEMESTERS : PG_SEMESTERS).filter(s => {
              const num = parseInt(s, 10);
              if (semesterType === 'Odd') return num % 2 === 1;
              if (semesterType === 'Even') return num % 2 === 0;
              return true;
            });
            setSemester(filtered[0] || '1');
            setBatch('N');
            setRoom('');
          }} className="w-full rounded border-gray-300 text-black">
            <option value="UG">UG</option>
            <option value="PG">PG</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-black">Semester</label>
          <select value={semester} onChange={e => {
            setSemester(e.target.value);
            setBatch('N');
            setRoom('');
          }} className="w-full rounded border-gray-300 text-black">
            {getSemesterOptions().map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {courseType === 'UG' && (
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Batch</label>
            <select value={batch} onChange={e => setBatch(e.target.value)} className="w-full rounded border-gray-300 text-black">
              {getBatchOptions().map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}
        {courseType === 'UG' && (
          <div className="col-span-1 flex items-center mt-6">
            <input
              id="disabled-students-checkbox"
              type="checkbox"
              checked={hasDisabledStudents}
              onChange={e => setHasDisabledStudents(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="disabled-students-checkbox" className="text-sm text-black">
              Disabled students in batch
            </label>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1 text-black">Room</label>
          <input
            type="text"
            value={room}
            onChange={e => setRoom(e.target.value)}
            placeholder="Enter room number/name"
            className="w-full rounded border-gray-300 text-black px-2 py-1"
          />
        </div>
        <div className="flex items-end">
          <button onClick={handleAssign} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Assign</button>
        </div>
        <div className="col-span-2 md:col-span-5">
          <label className="block text-sm font-medium mb-1 text-black">Bulk Upload (Excel/CSV)</label>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUploadRoomAllocations} className="w-full" />
          {roomUploadLoading && <div className="text-sm text-gray-600 mt-2">Uploading and creating allocations...</div>}
          {roomUploadResults && (
            <div className="mt-2">
              {roomUploadResults.successful > 0 && <div className="text-green-700">Created {roomUploadResults.successful} allocations</div>}
              {roomUploadResults.failed > 0 && <div className="text-red-700">Failed {roomUploadResults.failed} rows</div>}
              {roomUploadResults.error && <div className="text-red-700">Error: {roomUploadResults.error}</div>}
            </div>
          )}
          <div className="text-xs text-gray-600 mt-2">Expected headers: <strong>Course Type</strong>, <strong>Semester</strong>, <strong>Batch</strong>, <strong>Room</strong></div>
        </div>
      </div>
      {/* Allocations Table */}
      <div className="mt-8">
        <h4 className="text-md font-semibold mb-2 text-blue-900">Allocated Rooms</h4>
        <table className="min-w-full bg-white border border-gray-300 text-black">
          <thead>
            <tr>
              <th className="border px-2 py-1">Room</th>
              <th className="border px-2 py-1">Batch</th>
              <th className="border px-2 py-1">Semester</th>
              <th className="border px-2 py-1">Course Type</th>
              <th className="border px-2 py-1">Semester Type</th>
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((alloc) => (
              <tr key={alloc._id}>
                {editingId === alloc._id ? (
                  <>
                    <td className="border px-2 py-1"><input name="room" value={editData.room} onChange={handleEditChange} className="border rounded px-2 py-1 w-full" /></td>
                    <td className="border px-2 py-1"><input name="batch" value={editData.batch || ''} onChange={handleEditChange} className="border rounded px-2 py-1 w-full" /></td>
                    <td className="border px-2 py-1"><input name="semester" value={editData.semester} onChange={handleEditChange} className="border rounded px-2 py-1 w-full" /></td>
                    <td className="border px-2 py-1"><input name="courseType" value={editData.courseType} onChange={handleEditChange} className="border rounded px-2 py-1 w-full" /></td>
                    <td className="border px-2 py-1"><input name="semesterType" value={editData.semesterType} onChange={handleEditChange} className="border rounded px-2 py-1 w-full" /></td>
                    <td className="border px-2 py-1">
                      <button onClick={handleEditSave} className="bg-green-500 text-white px-2 py-1 rounded mr-2">Save</button>
                      <button onClick={handleEditCancel} className="bg-gray-400 text-white px-2 py-1 rounded">Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border px-2 py-1">{alloc.room}</td>
                    <td className="border px-2 py-1">{alloc.batch || '-'}</td>
                    <td className="border px-2 py-1">{alloc.semester}</td>
                    <td className="border px-2 py-1">{alloc.courseType}</td>
                    <td className="border px-2 py-1">{alloc.semesterType}</td>
                    <td className="border px-2 py-1">
                      <button onClick={() => handleEdit(alloc)} className="bg-yellow-500 text-white px-2 py-1 rounded mr-2">Edit</button>
                      <button onClick={() => handleDelete(alloc._id)} className="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {allocations.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-500 py-2">No allocations found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {showToast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow z-50 transition-all">Room allocated successfully</div>
      )}
      {error && <div className="text-red-600 mb-2">{error}</div>}
    </div>
  );
};

const ROLES = ['Theory Teacher', 'Lab Incharge', 'Lab Assistant'];

const CoordinatorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCreateTimetable = () => {
    if (user?.role === 'coordinator') {
      navigate('/timetable-builder');
    } else {
      console.error('User is not authorized as coordinator');
    }
  };

  // Manual subject mapping state
  const [courses, setCourses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedCourseCode, setSelectedCourseCode] = useState('');
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [manualMappings, setManualMappings] = useState([]); // [{facultyId, courseCode, role, batch, semester}]
  const [manualMsg, setManualMsg] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // Subject mapping from Excel state
  const [mappingFile, setMappingFile] = useState(null);
  const [uploadResults, setUploadResults] = useState(null); // { successful: [], failed: [] }
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  // Faculty summary
  const [facultyCount, setFacultyCount] = useState(0);
  const [allAssignments, setAllAssignments] = useState([]);

  useEffect(() => {
    courseService.getAllCourses().then(setCourses).catch(() => setCourses([]));
    facultyService.getAllFaculty().then(setFaculties).catch(() => setFaculties([]));
    facultyService.getFacultySummary().then(res => setFacultyCount(res.totalFaculties)).catch(() => setFacultyCount(0));
    fetchAssignments();
  }, []);
  const [deletingAll, setDeletingAll] = useState(false);

  const fetchAssignments = async () => {
    try {
      const res = await facultyService.getAllSubjectMappings();
      setAllAssignments(res.mappings || []);
    } catch (error) {
      console.error("Failed to fetch subject mappings", error);
    }
  };

  const handleDeleteMapping = async (id) => {
    if (!window.confirm('Are you sure you want to remove this subject assignment?')) return;
    try {
      await facultyService.deleteSubjectMapping(id);
      await fetchAssignments();
    } catch (err) {
      console.error('Failed to delete mapping', err);
      setManualMsg('Failed to delete mapping.');
    }
  };

  const handleExportSubjectMappingsExcel = () => {
    if (allAssignments.length === 0) {
      setManualMsg('No mappings to export');
      return;
    }
    const rows = allAssignments.map(m => {
      const faculty = faculties.find(f => (f.userId || f.user?.userId) === m.facultyId) || {};
      const course = courses.find(c => c.code === m.courseCode) || {};
      return {
        'Faculty ID': m.facultyId || '',
        'Faculty Name': faculty.name || '',
        'Subject Code': m.courseCode || '',
        'Subject Name': course.name || '',
        'Role': m.role || ''
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Subject Mappings');
    XLSX.writeFile(wb, 'subject_mappings.xlsx');
  };

  const handleExportSubjectMappingsPDF = () => {
    if (allAssignments.length === 0) {
      setManualMsg('No mappings to export');
      return;
    }
    const doc = new jsPDF();
    const rows = allAssignments.map(m => {
      const faculty = faculties.find(f => (f.userId || f.user?.userId) === m.facultyId) || {};
      const course = courses.find(c => c.code === m.courseCode) || {};
      return [
        m.facultyId || '',
        faculty.name || '',
        m.courseCode || '',
        course.name || '',
        m.role || ''
      ];
    });
    autoTable(doc, {
      head: [['Faculty ID', 'Faculty Name', 'Subject Code', 'Subject Name', 'Role']],
      body: rows
    });
    doc.save('subject_mappings.pdf');
  };

  // Manual subject mapping handlers
  const handleAddMappingRow = () => {
    if (selectedFacultyId && selectedCourseCode && selectedRole && selectedBatch && selectedSemester) {
      // Check for duplicates in the current manual mappings list
      const isDuplicateInList = manualMappings.some(
        m => m.facultyId === selectedFacultyId && m.courseCode === selectedCourseCode && m.role === selectedRole
      );
      if (isDuplicateInList) {
        setManualMsg('⚠️ This mapping already exists in the list.');
        return;
      }

      // Check for duplicates in existing database mappings
      const isDuplicateInDB = allAssignments.some(
        m => m.facultyId === selectedFacultyId && m.courseCode === selectedCourseCode && m.role === selectedRole
      );
      if (isDuplicateInDB) {
        setManualMsg('⚠️ This faculty is already assigned to this subject with this role. Please select a different combination.');
        return;
      }

      setManualMappings([...manualMappings, { 
        facultyId: selectedFacultyId, 
        courseCode: selectedCourseCode, 
        role: selectedRole,
        batch: selectedBatch,
        semester: selectedSemester
      }]);
      setSelectedFacultyId('');
      setSelectedCourseCode('');
      setSelectedRole(ROLES[0]);
      setSelectedBatch('');
      setSelectedSemester('');
      setManualMsg('');
    } else {
      setManualMsg('Please fill in all fields: Faculty, Course, Role, Batch, and Semester.');
    }
  };

  const handleRemoveMappingRow = (idx) => {
    setManualMappings(manualMappings.filter((_, i) => i !== idx));
  };

  // Manual subject mapping submit
  const handleManualMappingSubmit = async (e) => {
    e.preventDefault();
    setManualMsg('');
    setManualLoading(true);
    try {
      if (manualMappings.length === 0) {
        setManualMsg('Please add at least one faculty-course mapping.');
        setManualLoading(false);
        return;
      }

      // Check for duplicates with existing mappings in the database
      const duplicates = [];
      for (const newMapping of manualMappings) {
        const isDuplicate = allAssignments.some(
          existing => 
            existing.facultyId === newMapping.facultyId && 
            existing.courseCode === newMapping.courseCode && 
            existing.role === newMapping.role
        );
        if (isDuplicate) {
          duplicates.push(`${newMapping.facultyId} - ${newMapping.courseCode} - ${newMapping.role}`);
        }
      }

      if (duplicates.length > 0) {
        setManualMsg(`⚠️ The following mappings already exist (duplicates):\n${duplicates.join('\n')}\n\nPlease remove these from the list before submitting.`);
        setManualLoading(false);
        return;
      }

      await facultyService.createSubjectMappings(manualMappings);
      setManualMsg('Subject mappings created successfully!');
      setManualMappings([]);
      setSelectedFacultyId('');
      setSelectedCourseCode('');
      setSelectedRole(ROLES[0]);
      fetchAssignments();
    } catch (err) {
      setManualMsg(err.response?.data?.message || err.message || 'Error creating subject mappings.');
    } finally {
      setManualLoading(false);
    }
  };

  // Helper function to extract batch from course name
  const extractBatchFromCourseName = (courseName) => {
    if (!courseName) return null;
    const courseNameStr = String(courseName).trim();
    // Check for batch in parentheses: (N), (P), (Q)
    const parenthesesMatch = courseNameStr.match(/\(([NPQ])\)/);
    if (parenthesesMatch) {
      return parenthesesMatch[1];
    }
    // Check for batch separated by space: Course Name N, Course Name P, Course Name Q
    const words = courseNameStr.split(' ');
    const lastWord = words[words.length - 1];
    if (["N", "P", "Q"].includes(lastWord)) {
      return lastWord;
    }
    return null;
  };

  const handleFileUploadSubjectMapping = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setAssignmentLoading(true);
    setUploadResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      const allMappings = [];

      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        try {
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

          if (rows.length === 0) continue;

          // Find header row with expected columns
          let headerRowIndex = -1;
          let mainHeaders = [];
          const mainHeaderKeywords = ['Faculty ID', 'Course Code'];
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (Array.isArray(row) && mainHeaderKeywords.every(k => row.some(h => h && String(h).toLowerCase().includes(k.toLowerCase())))) {
              headerRowIndex = i;
              mainHeaders = row.map(h => (h ? String(h).trim() : ''));
              break;
            }
          }
          if (headerRowIndex === -1) continue;

          const compositeHeaders = mainHeaders.map((mainHeader) => mainHeader ? String(mainHeader).toLowerCase().trim() : '');

          const facultyIdIndex = compositeHeaders.findIndex(h => h.includes('faculty id') || h.includes('csid'));
          const courseCodeIndex = compositeHeaders.findIndex(h => h.includes('course code'));
          const roleIndex = compositeHeaders.findIndex(h => h.includes('role'));
          // Batch and semester are optional in the file (can be derived from course), but we'll parse them if present
          const batchIndex = compositeHeaders.findIndex(h => h.includes('batch'));
          const semesterIndex = compositeHeaders.findIndex(h => h.includes('semester'));

          for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!Array.isArray(row) || row.every(cell => cell === null)) continue;
            
            const facultyId = row[facultyIdIndex];
            const courseCode = row[courseCodeIndex];
            const role = row[roleIndex];

            if (!facultyId || !courseCode || !role) continue;

            // Get batch and semester from course or from file
            const courseObj = courses.find(c => c.code === String(courseCode).trim());
            const batch = batchIndex !== -1 && row[batchIndex] ? String(row[batchIndex]).trim() : (courseObj?.batches || 1);
            const semester = semesterIndex !== -1 && row[semesterIndex] ? String(row[semesterIndex]).trim() : (courseObj?.semester || 'Unknown');

            allMappings.push({
              facultyId: String(facultyId).trim(),
              courseCode: String(courseCode).trim(),
              role: String(role).trim(),
              batch,
              semester
            });
          }
        } catch (err) {
          console.error('Error processing sheet:', sheetName, err);
          continue;
        }
      }

      if (allMappings.length === 0) {
        setUploadResults({ successful: 0, failed: 1, error: 'No valid mappings found in the file.' });
      } else {
        // Check for duplicates with existing mappings in the database
        const duplicates = [];
        const validMappings = [];
        for (const mapping of allMappings) {
          const isDuplicate = allAssignments.some(
            existing => 
              existing.facultyId === mapping.facultyId && 
              existing.courseCode === mapping.courseCode && 
              existing.role === mapping.role
          );
          if (isDuplicate) {
            duplicates.push(`${mapping.facultyId}-${mapping.courseCode}-${mapping.role}`);
          } else {
            validMappings.push(mapping);
          }
        }

        if (validMappings.length === 0) {
          setUploadResults({ 
            successful: 0, 
            failed: allMappings.length, 
            error: `All ${allMappings.length} mappings in the file already exist.` 
          });
        } else {
          // Send only valid (non-duplicate) mappings to backend
          // Extract just the core fields for submission (facultyId, courseCode, role)
          const mappingsToSubmit = validMappings.map(m => ({
            facultyId: m.facultyId,
            courseCode: m.courseCode,
            role: m.role
          }));
          const result = await facultyService.bulkCreateSubjectMappings(mappingsToSubmit);
          const failedCount = (result.failed || 0) + duplicates.length;
          setUploadResults({ 
            successful: result.successful || validMappings.length, 
            failed: failedCount,
            duplicates: duplicates.length > 0 ? duplicates : undefined
          });
          fetchAssignments();
        }
      }
    } catch (err) {
      setUploadResults({ successful: 0, failed: 1, error: err.message });
    } finally {
      setAssignmentLoading(false);
    }
  };

  return (
    <DashboardLayout role="coordinator" title="Coordinator Dashboard">
      <div className="space-y-6">
        {/* Main Content */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Timetable Management</h2>
            <button
              onClick={handleCreateTimetable}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Create New Timetable
            </button>
          </div>

          {/* Additional dashboard content can go here */}
          
          {/* Room/Lab Allocation Panel */}
          <RoomAllocationPanel user={user} />
        </div>
        {/* Faculty Summary */}
        <section className="bg-white rounded-lg shadow p-6 flex items-center justify-between mt-8">
          <h2 className="text-xl font-semibold text-black">Faculty Summary</h2>
          <div className="text-2xl font-bold text-blue-700">{facultyCount}</div>
        </section>
        {/* Manual Subject Mapping */}
        <section className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold text-black mb-4">Manual Subject Mapping</h2>
          <form onSubmit={handleManualMappingSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Select Faculty (csXXX ID)</label>
                <select 
                  value={selectedFacultyId} 
                  onChange={e => setSelectedFacultyId(e.target.value)} 
                  className="w-full border rounded px-3 py-2 text-black"
                >
                  <option value="">Select Faculty</option>
                  {faculties.map(f => (
                    <option key={f._id} value={f.userId}>
                      {f.userId} - {f.name} - {f.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Select Course</label>
                <select 
                  value={selectedCourseCode} 
                  onChange={e => {
                    setSelectedCourseCode(e.target.value);
                    // Auto-populate batch and semester from selected course
                    const course = courses.find(c => c.code === e.target.value);
                    if (course) {
                      setSelectedBatch(String(course.batches));
                      setSelectedSemester(course.semester);
                    }
                  }} 
                  className="w-full border rounded px-3 py-2 text-black"
                >
                  <option value="">Select Course</option>
                  {courses.map(c => (
                    <option key={c._id} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Role</label>
                <select 
                  value={selectedRole} 
                  onChange={e => setSelectedRole(e.target.value)} 
                  className="w-full border rounded px-3 py-2 text-black"
                >
                  {ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Batch</label>
                <input
                  type="text"
                  value={selectedBatch}
                  onChange={e => setSelectedBatch(e.target.value)}
                  placeholder="e.g., 1, 2, 3"
                  className="w-full border rounded px-3 py-2 text-black"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Semester</label>
                <input
                  type="text"
                  value={selectedSemester}
                  onChange={e => setSelectedSemester(e.target.value)}
                  placeholder="e.g., 1, 2, 3, 4"
                  className="w-full border rounded px-3 py-2 text-black"
                />
              </div>
              <div className="flex items-end">
                <button 
                  type="button" 
                  onClick={handleAddMappingRow}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Add Mapping
                </button>
              </div>
            </div>

            {/* Preview of selected values */}
            {(selectedFacultyId || selectedCourseCode) && (
              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <h4 className="font-semibold text-black mb-2">Preview:</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm text-black">
                  <div>
                    <span className="font-semibold">Faculty ID:</span> {selectedFacultyId || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Faculty Name:</span> {faculties.find(f => f.userId === selectedFacultyId)?.name || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Course Code:</span> {selectedCourseCode || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Course Name:</span> {courses.find(c => c.code === selectedCourseCode)?.name || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Semester:</span> {selectedSemester || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Batch:</span> {selectedBatch || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Role:</span> {selectedRole || '-'}
                  </div>
                </div>
              </div>
            )}

            {/* Mappings Table */}
            <div className="mt-4">
              <h3 className="text-md font-semibold text-black mb-2">Mappings to be Created</h3>
              <table className="min-w-full bg-gray-50 border border-gray-300 text-black">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 py-1">Faculty ID</th>
                    <th className="border px-2 py-1">Faculty Name</th>
                    <th className="border px-2 py-1">Course Code</th>
                    <th className="border px-2 py-1">Course Name</th>
                    <th className="border px-2 py-1">Semester</th>
                    <th className="border px-2 py-1">Batch</th>
                    <th className="border px-2 py-1">Role</th>
                    <th className="border px-2 py-1">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {manualMappings.length > 0 ? (
                    manualMappings.map((row, idx) => {
                      const faculty = faculties.find(f => f.userId === row.facultyId) || {};
                      const course = courses.find(c => c.code === row.courseCode) || {};
                      return (
                        <tr key={idx}>
                          <td className="border px-2 py-1">{row.facultyId}</td>
                          <td className="border px-2 py-1">{faculty.name || '-'}</td>
                          <td className="border px-2 py-1">{row.courseCode}</td>
                          <td className="border px-2 py-1">{course.name || '-'}</td>
                          <td className="border px-2 py-1">{row.semester}</td>
                          <td className="border px-2 py-1">{row.batch}</td>
                          <td className="border px-2 py-1">{row.role}</td>
                          <td className="border px-2 py-1">
                            <button 
                              type="button"
                              onClick={() => handleRemoveMappingRow(idx)}
                              className="text-red-600 font-bold hover:text-red-800"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="border px-2 py-1 text-center text-gray-500">
                        No mappings added yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" 
              disabled={manualLoading || manualMappings.length === 0}
            >
              {manualLoading ? 'Creating...' : 'Create Subject Mappings'}
            </button>
            {manualMsg && <div className="mt-2 text-blue-700">{manualMsg}</div>}
          </form>
        </section>
        {/* Subject Mapping Upload */}
        <section className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold text-black mb-4">Upload and Assign Faculty (Excel)</h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload an Excel file with columns: Faculty ID (csXXX), Faculty Name, Course Code, Course Name, Role, Batch (optional), Semester (optional). 
            If Batch and Semester are not provided, they will be auto-populated from the course master data.
          </p>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileUploadSubjectMapping}
            className="mb-4" 
          />
          {uploadResults && (
            <div className="mt-2">
              {uploadResults.successful > 0 && (
                <p className="text-green-700">✓ Successfully created {uploadResults.successful} subject mappings.</p>
              )}
              {uploadResults.duplicates > 0 && (
                <p className="text-yellow-700">⚠️ {uploadResults.duplicates} mappings were skipped (already exist).</p>
              )}
              {uploadResults.failed > 0 && (
                <p className="text-red-700">✗ Failed to create {uploadResults.failed} mappings.</p>
              )}
              {uploadResults.error && (
                <p className="text-red-700">Error: {uploadResults.error}</p>
              )}
            </div>
          )}
        </section>
        {/* Subject Mappings Table */}
        <section className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold text-black mb-4">Subject Mappings</h2>
            <div className="flex justify-end gap-2 mb-4">
              <button
                onClick={handleExportSubjectMappingsExcel}
                disabled={allAssignments.length === 0}
                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                Export Excel
              </button>
              <button
                onClick={handleExportSubjectMappingsPDF}
                disabled={allAssignments.length === 0}
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                Export PDF
              </button>
              <button
                onClick={async () => {
                  if (!window.confirm('Are you sure you want to remove ALL subject mappings? This action cannot be undone.')) return;
                  setDeletingAll(true);
                  setManualMsg('');
                  try {
                    const res = await facultyService.deleteAllSubjectMappings();
                    console.log('Bulk delete response:', res);
                    setManualMsg(res.message || 'All mappings deleted');
                    await fetchAssignments();
                  } catch (err) {
                    console.error('Bulk delete failed, falling back to per-item deletion', err);
                    // fallback: delete one-by-one
                    try {
                      const items = allAssignments.slice();
                      let success = 0;
                      let failed = 0;
                      for (const it of items) {
                        try {
                          const id = it._id || it.id;
                          if (!id) {
                            failed++;
                            continue;
                          }
                          await facultyService.deleteSubjectMapping(id);
                          success++;
                        } catch (err2) {
                          console.error('Failed deleting mapping item', it, err2);
                          failed++;
                        }
                      }
                      setManualMsg(`Deleted ${success} mappings. ${failed} failed.`);
                      await fetchAssignments();
                    } catch (err3) {
                      console.error('Fallback deletion also failed', err3);
                      setManualMsg('Failed to delete mappings. Check console for details.');
                    }
                  } finally {
                    setDeletingAll(false);
                  }
                }}
                disabled={deletingAll}
                className={`px-3 py-1 rounded ${deletingAll ? 'bg-gray-400 text-white' : 'bg-red-600 text-white hover:bg-red-700'}`}
              >
                {deletingAll ? 'Removing...' : 'Remove All'}
              </button>
            </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full bg-white border border-gray-300 text-black">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1">Faculty ID</th>
                  <th className="border px-2 py-1">Faculty Name</th>
                  <th className="border px-2 py-1">Course ID</th>
                  <th className="border px-2 py-1">Course Name</th>
                  <th className="border px-2 py-1">Role</th>
                </tr>
              </thead>
              <tbody>
                {allAssignments.length > 0 ? (
                  allAssignments.map((item) => {
                    const faculty = faculties.find(f => (f.userId || f.user?.userId) === item.facultyId) || faculties.find(f => f._id === item.facultyId) || {};
                    const course = courses.find(c => c.code === item.courseCode) || {};
                    const facultyName = faculty.name || item.facultyName || '';
                    const courseName = course.name || item.courseName || '';
                    return (
                      <tr key={item._id || item.id || `${item.facultyId}-${item.courseCode}-${item.role}`}>
                          <td className="border px-2 py-1">{item.facultyId}</td>
                          <td className="border px-2 py-1">{facultyName}</td>
                          <td className="border px-2 py-1">{item.courseCode}</td>
                          <td className="border px-2 py-1">{courseName}</td>
                          <td className="border px-2 py-1">{item.role}</td>
                          <td className="border px-2 py-1">
                            <button
                              onClick={() => handleDeleteMapping(item._id || item.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="border px-2 py-1 text-center text-gray-500">
                      No subject mappings found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default CoordinatorDashboard; 