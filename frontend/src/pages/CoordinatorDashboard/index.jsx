import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { timetableService } from '../../services/timetableService';
import { courseService } from '../../services/courseService';
import { facultyService } from '../../services/facultyService';
import { toast } from 'react-toastify';
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
  const [activeTab, setActiveTab] = useState('subject-mapping');

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
  const [facultySearchInput, setFacultySearchInput] = useState('');
  const [showFacultyDropdown, setShowFacultyDropdown] = useState(false);
  const [selectedCourseCode, setSelectedCourseCode] = useState('');
  const [courseSearchInput, setCourseSearchInput] = useState('');
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedCourseType, setSelectedCourseType] = useState('UG');
  const [manualMappings, setManualMappings] = useState([]); // [{facultyId, courseCode, role, batch, semester, courseType}]
  const [manualMsg, setManualMsg] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // Close faculty and course dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFacultyDropdown && !event.target.closest('.faculty-search-container')) {
        setShowFacultyDropdown(false);
      }
      if (showCourseDropdown && !event.target.closest('.course-search-container')) {
        setShowCourseDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFacultyDropdown, showCourseDropdown]);

  // Subject mapping from Excel state
  const [mappingFile, setMappingFile] = useState(null);
  const [uploadResults, setUploadResults] = useState(null); // { successful: [], failed: [] }
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  // Faculty summary
  const [facultyCount, setFacultyCount] = useState(0);
  const [allAssignments, setAllAssignments] = useState([]);

  // Course Management State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseData, setCourseData] = useState({
    code: '',
    name: '',
    department: 'CSE',
    semester: '1',
    credits: 5,
    type: 'UG',
    category: 'Theory',
    batches: 1
  });
  const [courseError, setCourseError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState({ sheetsProcessed: 0, totalRecords: 0 });

  // Faculty Management State
  const [facultyName, setFacultyName] = useState('');
  const [facultyEmail, setFacultyEmail] = useState('');
  const [facultyFile, setFacultyFile] = useState(null);
  const [facultyUploadPreview, setFacultyUploadPreview] = useState([]);

  const departments = {
    'CSE': 'Computer Science',
    'ECE': 'Electronics',
    'MECH': 'Mechanical',
    'CIVIL': 'Civil',
    'MATHEMATICS': 'Mathematics',
    'PHYSICS': 'Physics',
    'CHEMISTRY': 'Chemistry'
  };

  const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];

  useEffect(() => {
    fetchCourses();
    facultyService.getAllFaculty().then(setFaculties).catch(() => setFaculties([]));
    facultyService.getFacultySummary().then(res => setFacultyCount(res.totalFaculties)).catch(() => setFacultyCount(0));
    fetchAssignments();
  }, []);
  const [deletingAll, setDeletingAll] = useState(false);

  const fetchCourses = async () => {
    try {
      const data = await courseService.getAllCourses();
      setCourses(data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await facultyService.getAllSubjectMappings();
      console.log('Fetched subject mappings:', res.mappings);
      console.log('First mapping sample:', res.mappings && res.mappings[0] ? {
        ...res.mappings[0],
        batchType: typeof res.mappings[0].batch,
        semesterType: typeof res.mappings[0].semester,
        batchValue: res.mappings[0].batch,
        semesterValue: res.mappings[0].semester
      } : 'No mappings');
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
        'Role': m.role || '',
        'Batch': m.batch || '',
        'Semester': m.semester || '',
        'Course Type': m.courseType || course.type || 'UG'
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
        m.role || '',
        m.batch || '',
        m.semester || '',
        m.courseType || course.type || 'UG'
      ];
    });
    autoTable(doc, {
      head: [['Faculty ID', 'Faculty Name', 'Subject Code', 'Subject Name', 'Role', 'Batch', 'Semester', 'Course Type']],
      body: rows
    });
    doc.save('subject_mappings.pdf');
  };

  // Create Course Faculty Mapping - validates form inputs and submits directly
  const handleManualMappingSubmit = async (e) => {
    e.preventDefault();
    setManualMsg('');
    setManualLoading(true);
    
    try {
      // Step 1: Validate all required form fields
      if (!selectedFacultyId || !selectedCourseCode || !selectedRole || !selectedBatch || !selectedSemester) {
        setManualMsg('⚠️ Please fill in all required fields: Faculty, Course, Role, Batch, and Semester.');
        setManualLoading(false);
        return;
      }

      // Step 2: Validate course exists
      const selectedCourse = courses.find(c => c.code === selectedCourseCode);
      if (!selectedCourse) {
        setManualMsg('⚠️ Selected course not found.');
        setManualLoading(false);
        return;
      }

      // Step 3: Validate batch based on course type
      const courseType = selectedCourse.type || 'UG';
      const validBatches = courseType === 'PG' ? ['PG'] : ['N', 'P', 'Q'];
      
      if (!validBatches.includes(selectedBatch.trim())) {
        setManualMsg(`⚠️ Invalid batch. For ${courseType} courses, valid batches are: ${validBatches.join(', ')}`);
        setManualLoading(false);
        return;
      }

      // Step 4: Validate semester
      if (!selectedSemester.trim()) {
        setManualMsg('⚠️ Semester is required.');
        setManualLoading(false);
        return;
      }

      // Step 5: Normalize and validate courseType
      const batchValue = String(selectedBatch).trim();
      const semesterValue = String(selectedSemester).trim();
      const courseTypeValue = String(selectedCourseType).trim().toUpperCase();

      if (courseTypeValue !== 'UG' && courseTypeValue !== 'PG') {
        setManualMsg('⚠️ Course Type must be UG or PG.');
        setManualLoading(false);
        return;
      }

      // Step 6: Check for duplicates in existing database mappings
      const isDuplicate = allAssignments.some(
        existing =>
          existing.facultyId === selectedFacultyId &&
          existing.courseCode === selectedCourseCode &&
          existing.role === selectedRole &&
          (existing.batch || '').trim() === batchValue
      );

      if (isDuplicate) {
        setManualMsg('⚠️ This faculty+role+batch combination already exists in the database. Please select a different combination.');
        setManualLoading(false);
        return;
      }

      // Step 7: Prepare mapping for submission
      const mappingToSubmit = {
        facultyId: String(selectedFacultyId).trim(),
        courseCode: String(selectedCourseCode).trim(),
        role: String(selectedRole).trim(),
        batch: batchValue,
        semester: semesterValue,
        courseType: courseTypeValue
      };

      console.log('Submitting mapping:', mappingToSubmit);

      // Step 8: Submit to backend (as array with single mapping)
      const result = await facultyService.createSubjectMappings([mappingToSubmit]);
      console.log('Create mapping result:', result);
      
      // Step 9: Handle backend response
      if (result && typeof result === 'object' && ('successful' in result || 'failed' in result)) {
        const successful = result.successful || 0;
        const failed = result.failed || 0;
        
        if (successful > 0) {
          // Success - clear form and refresh table
          setManualMsg('✅ Course Faculty Mapping created successfully!');
          toast.success('Course Faculty Mapping created successfully!');
          
          // Clear form fields
          setSelectedFacultyId('');
          setFacultySearchInput('');
          setShowFacultyDropdown(false);
          setSelectedCourseCode('');
          setCourseSearchInput('');
          setShowCourseDropdown(false);
          setSelectedRole(ROLES[0]);
          setSelectedBatch('');
          setSelectedSemester('');
          setSelectedCourseType('UG');
          
          // Show errors if any
          if (result.errors && result.errors.length > 0) {
            console.error('Mapping errors:', result.errors);
            const errorPreview = result.errors.slice(0, 3).join(', ');
            setManualMsg(prev => prev + `\n\nErrors: ${errorPreview}`);
          }
          
          // Refresh the assignments table
          await fetchAssignments();
          setTimeout(async () => {
            await fetchAssignments();
          }, 1000);
        } else {
          // Failed
          const errorMsg = result.errors && result.errors.length > 0
            ? `❌ Failed to create mapping. Error: ${result.errors[0]}`
            : '❌ Failed to create mapping. Please check the console for details.';
          setManualMsg(errorMsg);
          toast.error('Failed to create mapping. Please check the details below.');
          console.error('Mapping creation failed:', result);
        }
      } else {
        // Unexpected response
        console.warn('Unexpected response format:', result);
        setManualMsg('⚠️ Mapping submitted. Please check the table to verify.');
        toast.warning('Please check the table to verify mapping was created.');
        // Clear form
        setSelectedFacultyId('');
        setFacultySearchInput('');
        setShowFacultyDropdown(false);
        setSelectedCourseCode('');
        setCourseSearchInput('');
        setShowCourseDropdown(false);
        setSelectedRole(ROLES[0]);
        setSelectedBatch('');
        setSelectedSemester('');
        setSelectedCourseType('UG');
        // Refresh table
        await fetchAssignments();
      }
    } catch (err) {
      console.error('Error creating subject mappings:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Error creating subject mappings.';
      setManualMsg(`❌ Error: ${errorMessage}`);
      toast.error(`Error: ${errorMessage}`);
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
          const facultyNameIndex = compositeHeaders.findIndex(h => h.includes('faculty name'));
          const courseCodeIndex = compositeHeaders.findIndex(h => h.includes('course code'));
          const courseNameIndex = compositeHeaders.findIndex(h => h.includes('course name'));
          const roleIndex = compositeHeaders.findIndex(h => h.includes('role'));
          const batchIndex = compositeHeaders.findIndex(h => h.includes('batch'));
          const semesterIndex = compositeHeaders.findIndex(h => h.includes('semester'));
          const courseTypeIndex = compositeHeaders.findIndex(h => h.includes('course type') || h.includes('coursetype'));

          for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!Array.isArray(row) || row.every(cell => cell === null)) continue;
            
            const facultyId = row[facultyIdIndex];
            const courseCode = row[courseCodeIndex];
            const role = row[roleIndex];

            if (!facultyId || !courseCode || !role) continue;

            // Get batch, semester, and courseType from file
            let batch = '';
            if (batchIndex !== -1 && row[batchIndex] !== null && row[batchIndex] !== undefined && row[batchIndex] !== '') {
              batch = String(row[batchIndex]).trim();
            }

            let semester = '';
            if (semesterIndex !== -1 && row[semesterIndex] !== null && row[semesterIndex] !== undefined && row[semesterIndex] !== '') {
              semester = String(row[semesterIndex]).trim();
            }

            // Get courseType from Excel or try to get from course in state
            let courseType = '';
            if (courseTypeIndex !== -1 && row[courseTypeIndex] !== null && row[courseTypeIndex] !== undefined && row[courseTypeIndex] !== '') {
              courseType = String(row[courseTypeIndex]).trim().toUpperCase();
            }
            
            // If courseType not in Excel, try to get from course in state
            if (!courseType || (courseType !== 'UG' && courseType !== 'PG')) {
              const course = courses.find(c => c.code === String(courseCode).trim());
              if (course && course.type) {
                courseType = String(course.type).trim().toUpperCase();
              }
            }
            
            // Default to UG if still not found
            if (!courseType || (courseType !== 'UG' && courseType !== 'PG')) {
              courseType = 'UG';
            }

            allMappings.push({
              facultyId: String(facultyId).trim(),
              courseCode: String(courseCode).trim(),
              role: String(role).trim(),
              batch: batch,
              semester: semester,
              courseType: courseType
            });
          }
        } catch (err) {
          console.error('Error processing sheet:', sheetName, err);
          continue;
        }
      }

      if (allMappings.length === 0) {
        setUploadResults({ successful: 0, failed: 1, error: 'No valid mappings found in the file. Ensure headers: Faculty ID, Course Code, Role, Batch (optional), Semester (optional)' });
      } else {
        // First, check for duplicates within the file itself (faculty+role+batch+semester combination)
        const seenInFile = new Set();
        const duplicatesInFile = [];
        const uniqueMappings = [];
        
        for (const mapping of allMappings) {
          const key = `${mapping.facultyId}-${mapping.courseCode}-${mapping.role}-${mapping.batch || ''}-${mapping.semester || ''}`;
          if (seenInFile.has(key)) {
            duplicatesInFile.push(`${mapping.facultyId}-${mapping.courseCode}-${mapping.role}-Batch:${mapping.batch || ''}-Sem:${mapping.semester || ''}`);
          } else {
            seenInFile.add(key);
            uniqueMappings.push(mapping);
          }
        }

        // Then check for duplicates with existing mappings in the database
        const duplicatesInDB = [];
        const validMappings = [];
        
        for (const mapping of uniqueMappings) {
          const isDuplicate = allAssignments.some(
            existing => 
              existing.facultyId === mapping.facultyId && 
              existing.courseCode === mapping.courseCode && 
              existing.role === mapping.role &&
              (existing.batch || '') === (mapping.batch || '') &&
              (existing.semester || '') === (mapping.semester || '')
          );
          if (isDuplicate) {
            duplicatesInDB.push(`${mapping.facultyId}-${mapping.courseCode}-${mapping.role}-Batch:${mapping.batch || ''}-Sem:${mapping.semester || ''}`);
          } else {
            validMappings.push(mapping);
          }
        }

        if (validMappings.length === 0) {
          setUploadResults({ 
            successful: 0, 
            failed: allMappings.length, 
            error: `All mappings in the file are duplicates (${duplicatesInFile.length} within file, ${duplicatesInDB.length} in database).` 
          });
        } else {
          // Send valid mappings to backend with batch, semester, and courseType
          const mappingsToSubmit = validMappings.map(m => ({
            facultyId: m.facultyId,
            courseCode: m.courseCode,
            role: m.role,
            batch: m.batch || '',
            semester: m.semester || '',
            courseType: m.courseType || 'UG'
          }));
          
          const result = await facultyService.bulkCreateSubjectMappings(mappingsToSubmit);
          const failedCount = (result.failed || 0) + duplicatesInDB.length;
          setUploadResults({ 
            successful: result.successful || validMappings.length, 
            failed: failedCount,
            duplicatesInFile: duplicatesInFile.length > 0 ? duplicatesInFile.length : undefined,
            duplicatesInDB: duplicatesInDB.length > 0 ? duplicatesInDB.length : undefined
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

  // Course Management Handlers
  const handleDeleteCourse = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await courseService.deleteCourse(courseId);
        toast.success('Course deleted successfully');
        fetchCourses();
      } catch (error) {
        toast.error('Error deleting course');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCourseData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setCourseData({
      code: '',
      name: '',
      department: 'CSE',
      semester: '1',
      credits: 5,
      type: 'UG',
      category: 'Theory',
      batches: 1
    });
    setIsEditing(false);
    setSelectedCourse(null);
    setCourseError(null);
  };

  const handleOpenModal = (course = null) => {
    if (course) {
      setCourseData({
        ...course,
        credits: course.credits || 5,
        batches: course.batches || 1
      });
      setIsEditing(true);
      setSelectedCourse(course);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCourseError(null);
    setIsSubmitting(true);

    try {
      if (!courseData.code || !courseData.name || !courseData.type || !courseData.category) {
        throw new Error('Please fill in all required fields');
      }

      const courseDataToSubmit = {
        ...courseData,
        credits: parseInt(courseData.credits, 10),
        batches: parseInt(courseData.batches, 10)
      };

      if (isEditing) {
        await courseService.updateCourse(selectedCourse._id, courseDataToSubmit);
        toast.success('Course updated successfully');
      } else {
        await courseService.addCourse(courseDataToSubmit);
        toast.success('Course added successfully');
      }
      
      handleCloseModal();
      await fetchCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save course. Please try again.';
      setCourseError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const parseFile = async (file) => {
    if (!file) return;
    setUploadLoading(true);
    setPreviewData([]);
    setUploadErrors([]);
    setUploadSummary({ sheetsProcessed: 0, totalRecords: 0 });
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const allCourses = [];
      const allErrors = [];
      let totalSheetsProcessed = 0;
      let totalRecords = 0;

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        if (rows.length < 2) {
          allErrors.push(`Sheet "${sheetName}": The sheet is empty or does not contain enough data.`);
          continue;
        }

        let headerRowIndex = -1;
        let headers = [];
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (Array.isArray(row) && (row.includes('Course Code') || row.includes('code'))) {
            headerRowIndex = i;
            headers = row.map(h => (h ? String(h).trim() : ''));
            break;
          }
        }

        if (headerRowIndex === -1) {
          allErrors.push(`Sheet "${sheetName}": Could not find the header row.`);
          continue;
        }

        const codeIndex = headers.findIndex(h => h === 'Course Code' || h === 'code');
        const nameIndex = headers.findIndex(h => h === 'Course Name' || h === 'name');
        const typeIndex = headers.findIndex(h => h === 'Course Type' || h === 'category');
        const creditsIndex = headers.findIndex(h => h === 'Credits' || h === 'credits');
        const classIndex = headers.findIndex(h => h === 'Class' || h === 'class');
        let batchesIndex = headers.findIndex(h => {
          if (!h) return false;
          const lh = h.toLowerCase();
          return lh === 'batches' || lh === 'batch' || lh.includes('batch');
        });

        if (batchesIndex === -1) {
          for (let r = headerRowIndex + 1; r < Math.min(rows.length, headerRowIndex + 11); r++) {
            const dataRow = rows[r];
            if (!Array.isArray(dataRow)) continue;
            for (let c = 0; c < dataRow.length; c++) {
              const cell = dataRow[c];
              if (cell == null) continue;
              const s = String(cell).trim();
              if (/^[A-Za-z](\s*,\s*[A-Za-z])+$/.test(s)) {
                batchesIndex = c;
                break;
              }
            }
            if (batchesIndex !== -1) break;
          }
        }

        const sheetCourses = [];
        let lastClass = null;
        let lastType = null;
        let lastCredits = null;

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!Array.isArray(row) || row.every(cell => cell === null)) continue;

          const courseCode = row[codeIndex];
          const courseName = row[nameIndex];
          
          if (row[classIndex]) lastClass = row[classIndex];
          if (row[typeIndex]) lastType = row[typeIndex];
          if (row[creditsIndex]) lastCredits = row[creditsIndex];

          if (!courseCode || !courseName) continue;

          let semester = '1';
          let type = 'UG';

          if (lastClass && typeof lastClass === 'string') {
            const match = lastClass.match(/([IVXLCDM]+)\s*Sem/i);
            if (match) {
              const romanMap = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8 };
              semester = romanMap[match[1].toUpperCase()] || '1';
            }

            if (lastClass.toUpperCase().includes('M.E')) {
              type = 'PG';
            } else if (lastClass.toUpperCase().includes('B.E')) {
              type = 'UG';
            }
          }

          let credits = 0;
          if (lastCredits) {
            const creditString = String(lastCredits);
            const match = creditString.match(/(\d+(\.\d+)?)/);
            if(match) {
              credits = parseFloat(match[0]);
            }
          }
          
          let category = 'Lab';
          const typeStr = lastType ? String(lastType).toUpperCase().trim() : '';
          if (typeStr.startsWith('T')) {
            category = 'Theory';
          } else if (typeStr === 'LIT') {
            category = 'Lab Integrated Theory';
          }

          let batchesValue = '';
          if (batchesIndex !== -1 && row[batchesIndex] != null) {
            batchesValue = String(row[batchesIndex]).trim();
          }
          if (!batchesValue) {
            batchesValue = '1';
          }

          sheetCourses.push({
            code: String(courseCode),
            name: String(courseName),
            department: 'CSE',
            semester: String(semester),
            credits: credits,
            type: type,
            category: category,
            batches: batchesValue,
            sourceSheet: sheetName
          });
        }

        if (sheetCourses.length > 0) {
          allCourses.push(...sheetCourses);
          totalSheetsProcessed++;
          totalRecords += sheetCourses.length;
        } else {
          allErrors.push(`Sheet "${sheetName}": No valid course data could be extracted.`);
        }
      }

      if (allCourses.length === 0) {
        setUploadErrors(['No valid course data could be extracted from any sheet.']);
        setPreviewData([]);
        setUploadSummary({ sheetsProcessed: 0, totalRecords: 0 });
      } else {
        setPreviewData(allCourses);
        setUploadErrors(allErrors);
        setUploadSummary({ sheetsProcessed: totalSheetsProcessed, totalRecords: totalRecords });
        toast.success(`Processed ${totalSheetsProcessed} sheet(s) with ${totalRecords} total course(s).`);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      setUploadErrors(['An unexpected error occurred while parsing the file.']);
      setUploadSummary({ sheetsProcessed: 0, totalRecords: 0 });
      toast.error('An unexpected error occurred while parsing the file.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      parseFile(file);
    }
  };

  const handleUpload = async () => {
    setIsSubmitting(true);
    setUploadErrors([]);
    try {
      const coursesToUpload = previewData.map(course => {
        const { sourceSheet, batches, credits, semester, type, category, department, ...rest } = course;
        let batchesCount = 1;
        if (batches != null) {
          const raw = String(batches).trim();
          if (raw.includes(',')) {
            batchesCount = raw.split(',').map(s => s.trim()).filter(Boolean).length || 1;
          } else if (raw === '') {
            batchesCount = 1;
          } else if (!isNaN(Number(raw))) {
            batchesCount = Number(raw) || 1;
          } else {
            batchesCount = 1;
          }
        }

        const creditsNum = credits != null ? Number(credits) : 0;
        const semesterStr = semester != null ? String(semester) : '';

        return {
          ...rest,
          code: String(course.code || ''),
          name: String(course.name || ''),
          department: department || 'CSE',
          semester: semesterStr,
          credits: creditsNum,
          type: type || 'UG',
          category: category || 'Theory',
          batches: batchesCount
        };
      });
      
      await courseService.addCourses(coursesToUpload);
      toast.success('Courses uploaded successfully');
      setShowUploadModal(false);
      setSelectedFile(null);
      setPreviewData([]);
      await fetchCourses();
    } catch (error) {
      console.error('Error uploading courses:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload courses.';
      setUploadErrors([errorMessage]);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Faculty Management Handlers
  const handleAddFaculty = async (e) => {
    e.preventDefault();
    if (!facultyName || !facultyEmail) return toast.error('Name and email required');
    try {
      await facultyService.addFacultyManual({ name: facultyName, email: facultyEmail });
      toast.success('Faculty added');
      setFacultyName('');
      setFacultyEmail('');
      const data = await facultyService.getAllFaculty();
      setFaculties(data || []);
      await facultyService.getFacultySummary().then(res => setFacultyCount(res.totalFaculties)).catch(() => setFacultyCount(0));
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      toast.error(msg);
    }
  };

  const handleFacultyFile = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFacultyFile(f);
    try {
      const data = await f.arrayBuffer();
      const workbook = XLSX.read(data);
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      const normalized = rows.map(r => ({
        name: r.name || r.Name || r['Faculty Name'] || r['Name'] || '',
        email: (r.email || r.Email || r['Email ID'] || r['Email Id'] || '').toString()
      }));
      setFacultyUploadPreview(normalized);
    } catch (err) {
      toast.error('Failed to parse file');
    }
  };

  const handleFacultyUpload = async () => {
    if (!facultyUploadPreview.length) return toast.error('No records to upload');

    const toUpload = facultyUploadPreview.map(r => ({
      name: (r.name || '').toString().trim(),
      email: (r.email || '').toString().trim().toLowerCase()
    })).filter(r => r.name && r.email);

    if (!toUpload.length) return toast.error('No valid rows (name+email) to upload');

    try {
      const res = await facultyService.uploadFacultyExcel(toUpload);
      toast.success(res.message || 'Uploaded faculties');
      if (res.errors && res.errors.length) {
        console.warn('Upload errors:', res.errors);
        toast.info(`${res.errors.length} rows had errors, check console.`);
      }
      setFacultyFile(null);
      setFacultyUploadPreview([]);
      const data = await facultyService.getAllFaculty();
      setFaculties(data || []);
      await facultyService.getFacultySummary().then(res => setFacultyCount(res.totalFaculties)).catch(() => setFacultyCount(0));
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      toast.error(msg);
    }
  };

  const handleDeleteFaculty = async (facultyId) => {
    if (!window.confirm('Are you sure you want to delete this faculty?')) return;
    try {
      await facultyService.deleteFaculty(facultyId);
      toast.success('Faculty deleted');
      const data = await facultyService.getAllFaculty();
      setFaculties(data || []);
      await facultyService.getFacultySummary().then(res => setFacultyCount(res.totalFaculties)).catch(() => setFacultyCount(0));
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      toast.error(msg);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = (course.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (course.code?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesDepartment = !filterDepartment || course.department === filterDepartment;
    const matchesSemester = !filterSemester || course.semester === filterSemester;
    return matchesSearch && matchesDepartment && matchesSemester;
  });

  return (
    <DashboardLayout role="coordinator" title="Coordinator Dashboard">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('subject-mapping')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'subject-mapping'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Subject Mapping
              </button>
              <button
                onClick={() => setActiveTab('faculty-management')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'faculty-management'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Faculty Management
              </button>
              <button
                onClick={() => setActiveTab('course-management')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'course-management'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Course Management
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'subject-mapping' && (
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
        )}

        {activeTab === 'faculty-management' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-black mb-4">Faculty Management</h2>
              
              {/* Add Faculty Manual */}
              <div className="bg-gray-50 rounded shadow p-4 mb-6">
                <h3 className="text-lg font-semibold mb-3">Add Faculty (Manual)</h3>
                <form onSubmit={handleAddFaculty} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input 
                    className="p-2 border rounded text-black" 
                    placeholder="Name" 
                    value={facultyName} 
                    onChange={e => setFacultyName(e.target.value)} 
                  />
                  <input 
                    className="p-2 border rounded text-black" 
                    placeholder="Email" 
                    type="email"
                    value={facultyEmail} 
                    onChange={e => setFacultyEmail(e.target.value)} 
                  />
                  <div className="flex items-center">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded" type="submit">Add Faculty</button>
                  </div>
                </form>
              </div>

              {/* Upload Faculties */}
              <div className="bg-gray-50 rounded shadow p-4 mb-6">
                <h3 className="text-lg font-semibold mb-3">Upload Faculties (Excel)</h3>
                <p className="text-sm text-gray-600 mb-2">Excel should contain columns with faculty name and email.</p>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFacultyFile} />
                {facultyUploadPreview.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-medium">Preview ({facultyUploadPreview.length})</h4>
                    <div className="max-h-60 overflow-y-auto border mt-2">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="p-2 text-left text-gray-700 font-medium">#</th>
                            <th className="p-2 text-left text-gray-700 font-medium">Name (editable)</th>
                            <th className="p-2 text-left text-gray-700 font-medium">Email (editable)</th>
                            <th className="p-2 text-left text-gray-700 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {facultyUploadPreview.map((r, i) => (
                            <tr key={i} className="border-t bg-white text-gray-900 hover:bg-gray-50">
                              <td className="p-2">{i+1}</td>
                              <td className="p-2">
                                <input
                                  className="w-full p-1 border rounded"
                                  value={r.name || ''}
                                  onChange={e => {
                                    const copy = [...facultyUploadPreview];
                                    copy[i] = { ...copy[i], name: e.target.value };
                                    setFacultyUploadPreview(copy);
                                  }}
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  className="w-full p-1 border rounded"
                                  value={r.email || ''}
                                  onChange={e => {
                                    const copy = [...facultyUploadPreview];
                                    copy[i] = { ...copy[i], email: e.target.value };
                                    setFacultyUploadPreview(copy);
                                  }}
                                />
                              </td>
                              <td className="p-2">
                                <button
                                  className="px-2 py-1 text-sm bg-red-500 text-white rounded"
                                  onClick={() => {
                                    const copy = facultyUploadPreview.filter((_, idx) => idx !== i);
                                    setFacultyUploadPreview(copy);
                                  }}
                                >Remove</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 flex items-center space-x-2">
                      <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={handleFacultyUpload}>Upload</button>
                      <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => { setFacultyUploadPreview([]); setFacultyFile(null); }}>Clear</button>
                    </div>
                  </div>
                )}
              </div>

              {/* All Faculties */}
              <div className="bg-gray-50 rounded shadow p-4">
                <h3 className="text-lg font-semibold mb-3">All Faculties</h3>
                <div className="flex space-x-2 mb-3">
                  <button
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-500"
                    onClick={() => {
                      try {
                        const data = faculties.map(f => ({ 'Faculty ID': f.userId || '', Name: f.name || '', Email: f.email || '' }));
                        const ws = XLSX.utils.json_to_sheet(data);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, 'Faculties');
                        XLSX.writeFile(wb, 'faculties.xlsx');
                      } catch (err) {
                        toast.error('Failed to export Excel');
                      }
                    }}
                  >
                    Export Excel
                  </button>
                  <button
                    className="px-3 py-1 bg-gray-800 text-white rounded text-sm hover:bg-gray-700"
                    onClick={() => {
                      try {
                        const doc = new jsPDF();
                        const rows = faculties.map(f => [f.userId || '', f.name || '', f.email || '']);
                        autoTable(doc, {
                          head: [['Faculty ID', 'Name', 'Email']],
                          body: rows,
                          startY: 10,
                        });
                        doc.save('faculties.pdf');
                      } catch (err) {
                        console.error(err);
                        toast.error('Failed to export PDF');
                      }
                    }}
                  >
                    Export PDF
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left text-gray-700 font-medium">Name</th>
                        <th className="p-2 text-left text-gray-700 font-medium">Email</th>
                        <th className="p-2 text-left text-gray-700 font-medium">Login ID</th>
                        <th className="p-2 text-left text-gray-700 font-medium">Department</th>
                        <th className="p-2 text-left text-gray-700 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faculties.map(f => (
                        <tr key={f._id} className="border-t bg-white text-gray-900 hover:bg-gray-50">
                          <td className="p-2">{f.name}</td>
                          <td className="p-2">{f.email}</td>
                          <td className="p-2">{f.userId}</td>
                          <td className="p-2">{f.department}</td>
                          <td className="p-2">
                            <button
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-500"
                              onClick={() => handleDeleteFaculty(f._id)}
                            >Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'course-management' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-black">Course Management</h3>
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                  >
                    Add New Course
                  </button>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                  >
                    Upload From File
                  </button>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black"
                />
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black"
                >
                  <option value="">All Departments</option>
                  {Object.entries(departments).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
                <select
                  value={filterSemester}
                  onChange={(e) => setFilterSemester(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black"
                >
                  <option value="">All Semesters</option>
                  {semesters.map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              </div>

              {/* Course List */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Course Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Course Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Semester</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Credits</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">No. of Batches</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCourses.map((course) => (
                      <tr key={course._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{course.code}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{course.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{departments[course.department]}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">Semester {course.semester}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{course.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{course.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{course.credits}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{course.batches}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleOpenModal(course)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Subject Mapping Tab Content - moved here */}
        {activeTab === 'subject-mapping' && (
          <>
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
              <div className="relative faculty-search-container">
                <label className="block text-gray-700 mb-2">Search Faculty (ID or Name)</label>
                <input
                  type="text"
                  value={facultySearchInput}
                  onChange={(e) => {
                    setFacultySearchInput(e.target.value);
                    setShowFacultyDropdown(true);
                    if (!e.target.value) {
                      setSelectedFacultyId('');
                    }
                  }}
                  onFocus={() => setShowFacultyDropdown(true)}
                  placeholder="Type faculty ID (csXXX) or name to search..."
                  className="w-full border rounded px-3 py-2 text-black"
                />
                {showFacultyDropdown && facultySearchInput && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                    {(() => {
                      const searchLower = facultySearchInput.toLowerCase().trim();
                      const filteredFaculties = faculties.filter(f => {
                        const userId = (f.userId || '').toLowerCase();
                        const name = (f.name || '').toLowerCase();
                        const email = (f.email || '').toLowerCase();
                        return userId.includes(searchLower) || 
                               name.includes(searchLower) || 
                               email.includes(searchLower);
                      });
                      
                      if (filteredFaculties.length === 0) {
                        return (
                          <div className="px-3 py-2 text-gray-500 text-sm">
                            No faculty found matching "{facultySearchInput}"
                          </div>
                        );
                      }
                      
                      return filteredFaculties.map(f => (
                        <div
                          key={f._id}
                          onClick={() => {
                            setSelectedFacultyId(f.userId);
                            setFacultySearchInput(`${f.userId} - ${f.name}`);
                            setShowFacultyDropdown(false);
                          }}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-semibold text-black">{f.userId}</div>
                          <div className="text-sm text-gray-600">{f.name}</div>
                          <div className="text-xs text-gray-500">{f.email}</div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
                {selectedFacultyId && (
                  <div className="mt-1 text-sm text-green-600">
                    Selected: {faculties.find(f => f.userId === selectedFacultyId)?.name || selectedFacultyId}
                  </div>
                )}
              </div>
              <div className="relative course-search-container">
                <label className="block text-gray-700 mb-2">Search Course (Code or Name)</label>
                <input
                  type="text"
                  value={courseSearchInput}
                  onChange={(e) => {
                    setCourseSearchInput(e.target.value);
                    setShowCourseDropdown(true);
                    if (!e.target.value) {
                      setSelectedCourseCode('');
                      setSelectedSemester('');
                      setSelectedCourseType('UG');
                      setSelectedBatch('');
                    }
                  }}
                  onFocus={() => setShowCourseDropdown(true)}
                  placeholder="Type course code or name to search..."
                  className="w-full border rounded px-3 py-2 text-black"
                />
                {showCourseDropdown && courseSearchInput && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                    {(() => {
                      const searchLower = courseSearchInput.toLowerCase().trim();
                      const filteredCourses = courses.filter(c => {
                        const code = (c.code || '').toLowerCase();
                        const name = (c.name || '').toLowerCase();
                        return code.includes(searchLower) || 
                               name.includes(searchLower);
                      });
                      
                      if (filteredCourses.length === 0) {
                        return (
                          <div className="px-3 py-2 text-gray-500 text-sm">
                            No course found matching "{courseSearchInput}"
                          </div>
                        );
                      }
                      
                      return filteredCourses.map(c => (
                        <div
                          key={c._id}
                          onClick={() => {
                            setSelectedCourseCode(c.code);
                            setCourseSearchInput(`${c.code} - ${c.name}`);
                            setShowCourseDropdown(false);
                            // Auto-populate semester and courseType from selected course
                            setSelectedSemester(c.semester || '');
                            setSelectedCourseType(c.type || 'UG');
                            // Reset batch when course changes (will be validated based on course type)
                            setSelectedBatch('');
                          }}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-semibold text-black">{c.code}</div>
                          <div className="text-sm text-gray-600">{c.name}</div>
                          <div className="text-xs text-gray-500">
                            {c.type || 'UG'} | Semester: {c.semester || '-'} | Credits: {c.credits || '-'}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
                {selectedCourseCode && (
                  <div className="mt-1 text-sm text-green-600">
                    Selected: {courses.find(c => c.code === selectedCourseCode)?.name || selectedCourseCode}
                  </div>
                )}
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
                <label className="block text-gray-700 mb-2">Batch *</label>
                <select
                  value={selectedBatch}
                  onChange={e => setSelectedBatch(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-black"
                  required
                >
                  <option value="">Select Batch</option>
                  {(() => {
                    const selectedCourse = courses.find(c => c.code === selectedCourseCode);
                    const courseType = selectedCourse?.type || 'UG';
                    
                    if (courseType === 'PG') {
                      return <option value="PG">PG</option>;
                    } else {
                      // UG courses: Only N, P, Q
                      return (
                        <>
                          <option value="N">N</option>
                          <option value="P">P</option>
                          <option value="Q">Q</option>
                        </>
                      );
                    }
                  })()}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Semester *</label>
                <input
                  type="text"
                  value={selectedSemester}
                  onChange={e => setSelectedSemester(e.target.value)}
                  placeholder="e.g., 1, 2, 3, 4"
                  className="w-full border rounded px-3 py-2 text-black"
                  required
                />
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
                  <div>
                    <span className="font-semibold">Course Type:</span> {selectedCourseType || '-'}
                  </div>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" 
              disabled={manualLoading}
            >
              {manualLoading ? 'Creating...' : 'Create Course Faculty Mapping'}
            </button>
            {manualMsg && (
              <div className={`mt-2 p-3 rounded whitespace-pre-line text-sm ${
                manualMsg.includes('✅') || manualMsg.includes('Successfully')
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : manualMsg.includes('❌') || manualMsg.includes('Error') || manualMsg.includes('Failed')
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : manualMsg.includes('⚠️')
                  ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                {manualMsg}
              </div>
            )}
          </form>
        </section>
        {/* Subject Mapping Upload */}
        <section className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold text-black mb-4">Upload and Assign Faculty (Excel)</h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload an Excel file with columns: <strong>Faculty ID</strong> (csXXX), <strong>Faculty Name</strong>, <strong>Course Code</strong>, <strong>Course Name</strong>, <strong>Role</strong>, <strong>Batch</strong> (required - 'N', 'P', 'Q' for UG, 'PG' for PG), <strong>Semester</strong> (required), <strong>Course Type</strong> (required - 'UG' or 'PG'). 
            If Course Type is not provided, it will be fetched from the course database. Duplicate combinations of Faculty+Role+Batch+Semester will be automatically filtered (only one kept).
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
              {uploadResults.duplicatesInFile > 0 && (
                <p className="text-yellow-700">⚠️ {uploadResults.duplicatesInFile} duplicate mappings found within the file (only one of each kept).</p>
              )}
              {uploadResults.duplicatesInDB > 0 && (
                <p className="text-yellow-700">⚠️ {uploadResults.duplicatesInDB} mappings were skipped (already exist in database).</p>
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
                  <th className="border px-2 py-1">Batch</th>
                  <th className="border px-2 py-1">Semester</th>
                  <th className="border px-2 py-1">Course Type</th>
                  <th className="border px-2 py-1">Action</th>
                </tr>
              </thead>
              <tbody>
                {allAssignments.length > 0 ? (
                  allAssignments.map((item) => {
                    const faculty = faculties.find(f => (f.userId || f.user?.userId) === item.facultyId) || faculties.find(f => f._id === item.facultyId) || {};
                    const course = courses.find(c => c.code === item.courseCode) || {};
                    const facultyName = faculty.name || item.facultyName || '';
                    const courseName = course.name || item.courseName || '';
                    // Display batch, semester, and courseType - show actual values, empty string if not present
                    const batchDisplay = item.batch != null && String(item.batch).trim() !== '' ? String(item.batch).trim() : '';
                    const semesterDisplay = item.semester != null && String(item.semester).trim() !== '' ? String(item.semester).trim() : '';
                    const courseTypeDisplay = item.courseType != null ? String(item.courseType).trim().toUpperCase() : (course.type || 'UG');
                    return (
                      <tr key={item._id || item.id || `${item.facultyId}-${item.courseCode}-${item.role}`}>
                          <td className="border px-2 py-1">{item.facultyId}</td>
                          <td className="border px-2 py-1">{facultyName}</td>
                          <td className="border px-2 py-1">{item.courseCode}</td>
                          <td className="border px-2 py-1">{courseName}</td>
                          <td className="border px-2 py-1">{item.role}</td>
                          <td className="border px-2 py-1">{batchDisplay}</td>
                          <td className="border px-2 py-1">{semesterDisplay}</td>
                          <td className="border px-2 py-1">{courseTypeDisplay}</td>
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
                    <td colSpan={9} className="border px-2 py-1 text-center text-gray-500">
                      No subject mappings found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        </>
        )}

        {/* Course Management Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-[600px] max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4 text-black">{isEditing ? 'Edit Course' : 'Add New Course'}</h2>
              {courseError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {courseError}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black">Course Code *</label>
                    <input
                      type="text"
                      name="code"
                      value={courseData.code}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Course Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={courseData.name}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Type *</label>
                    <select
                      name="type"
                      value={courseData.type}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black"
                      required
                    >
                      <option value="UG">UG</option>
                      <option value="PG">PG</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Category *</label>
                    <select
                      name="category"
                      value={courseData.category}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black"
                      required
                    >
                      <option value="Theory">Theory</option>
                      <option value="Lab Integrated Theory">Lab Integrated Theory</option>
                      <option value="Lab">Lab</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Department</label>
                    <select
                      name="department"
                      value={courseData.department}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black"
                    >
                      {Object.entries(departments).map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Semester</label>
                    <select
                      name="semester"
                      value={courseData.semester}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black"
                    >
                      {semesters.map(sem => (
                        <option key={sem} value={sem}>{sem}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Credits</label>
                    <input
                      type="number"
                      name="credits"
                      value={courseData.credits}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">No. of Batches</label>
                    <input
                      type="number"
                      name="batches"
                      value={courseData.batches}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black"
                      min="1"
                      required
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-black hover:bg-gray-50"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : isEditing ? 'Update Course' : 'Add Course'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-[800px] max-h-[90vh] overflow-y-auto text-black">
              <h2 className="text-xl font-bold mb-4">Upload Courses from File</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV or Excel file
                </label>
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  All sheets in the Excel file will be processed. Required columns: Course Code, Course Name. Optional: Course Type, Credits, Class.
                </p>
              </div>

              {uploadLoading && <div className="mb-4">Parsing all sheets in file...</div>}
              
              {!uploadLoading && uploadSummary.totalRecords > 0 && (
                <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                  <h4 className="font-semibold mb-1">Processing Summary:</h4>
                  <p className="text-sm">• Sheets processed: {uploadSummary.sheetsProcessed}</p>
                  <p className="text-sm">• Total courses found: {uploadSummary.totalRecords}</p>
                </div>
              )}
              
              {uploadErrors.length > 0 && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  <h4 className="font-semibold mb-2">Processing Issues:</h4>
                  {uploadErrors.map((error, index) => (
                    <p key={index} className="text-sm">{error}</p>
                  ))}
                </div>
              )}
              
              <div className="mt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => { 
                    setShowUploadModal(false); 
                    setPreviewData([]); 
                    setUploadErrors([]); 
                    setSelectedFile(null); 
                    setUploadSummary({ sheetsProcessed: 0, totalRecords: 0 });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                  disabled={uploadLoading || previewData.length === 0 || isSubmitting}
                  onClick={handleUpload}
                >
                  {isSubmitting ? 'Uploading...' : `Upload ${previewData.length} Courses from All Sheets`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CoordinatorDashboard; 