import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { courseService } from '../services/courseService';
import { motion } from 'framer-motion';
import CourseList from './AdminDashboard/CourseList';
import FacultyManagement from './AdminDashboard/FacultyManagement';
import bgImage from '../assets/th.jpg';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [courses, setCourses] = useState([]);
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
  const [error, setError] = useState(null);
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
  const [semesterTypeFilter, setSemesterTypeFilter] = useState('ALL');
  const navigate = useNavigate();

  const departments = {
    'CSE': 'Computer Science',
    'ECE': 'Electronics',
    'MECH': 'Mechanical',
    'CIVIL': 'Civil',
    'MATHEMATICS': 'Mathematics',
    'PHYSICS': 'Physics',
    'CHEMISTRY': 'Chemistry'
  };

  const semesters = [
    '1', '2', '3', '4', '5', '6', '7', '8', // UG
  
  ];

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const data = await courseService.getAllCourses();
      setCourses(data);
    } catch (error) {
      toast.error('Error fetching courses');
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

      // Process all sheets in the workbook
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        // Convert sheet to an array of arrays to handle complex headers
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        if (rows.length < 2) { // Need at least a header and a data row
          allErrors.push(`Sheet "${sheetName}": The sheet is empty or does not contain enough data.`);
          continue;
        }

        // 1. Find the header row
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
          allErrors.push(`Sheet "${sheetName}": Could not find the header row. Please ensure columns "Course Code" and "Course Name" exist.`);
          continue;
        }

        // 2. Find column indices from headers
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

        // If header not explicit, try to heuristically detect the batches column
        if (batchesIndex === -1) {
          for (let r = headerRowIndex + 1; r < Math.min(rows.length, headerRowIndex + 11); r++) {
            const dataRow = rows[r];
            if (!Array.isArray(dataRow)) continue;
            for (let c = 0; c < dataRow.length; c++) {
              const cell = dataRow[c];
              if (cell == null) continue;
              const s = String(cell).trim();
              // look for comma-separated single-letter or short codes like N,P,Q or A,B,C
              if (/^[A-Za-z](\s*,\s*[A-Za-z])+$/.test(s)) {
                batchesIndex = c;
                break;
              }
            }
            if (batchesIndex !== -1) break;
          }
        }

        const sheetCourses = [];
        
        // 3. Process rows with carry-down logic
        let lastClass = null;
        let lastType = null;
        let lastCredits = null;

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!Array.isArray(row) || row.every(cell => cell === null)) continue; // Skip empty rows

          const courseCode = row[codeIndex];
          const courseName = row[nameIndex];
          
          // Update carry-down values if present in the current row
          if (row[classIndex]) lastClass = row[classIndex];
          if (row[typeIndex]) lastType = row[typeIndex];
          if (row[creditsIndex]) lastCredits = row[creditsIndex];

          if (!courseCode || !courseName) {
              // Skip rows that don't have the essentials, like sub-headers or empty lines
              continue;
          }

          // 4. Extract and clean data
          let semester = '1';
          let type = 'UG'; // Default type

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

          // determine batches value: prefer explicit column if present, else default to '1'
          let batchesValue = '';
          if (batchesIndex !== -1 && row[batchesIndex] != null) {
            batchesValue = String(row[batchesIndex]).trim();
          }
          if (!batchesValue) {
            // default to '1' when no batches info is provided in sheet
            batchesValue = '1';
          }

          sheetCourses.push({
            code: String(courseCode),
            name: String(courseName),
            department: 'CSE', // Default value
            semester: String(semester),
            credits: credits,
            type: type,
            category: category,
            batches: batchesValue,
            sourceSheet: sheetName // Track which sheet this course came from
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
        setUploadErrors(['No valid course data could be extracted from any sheet. Please check the file content and structure.']);
        setPreviewData([]);
        setUploadSummary({ sheetsProcessed: 0, totalRecords: 0 });
      } else {
        setPreviewData(allCourses);
        setUploadErrors(allErrors);
        setUploadSummary({ sheetsProcessed: totalSheetsProcessed, totalRecords: totalRecords });
        
        // Show summary of processing
        const summaryMessage = `Processed ${totalSheetsProcessed} sheet(s) with ${totalRecords} total course(s).`;
        if (allErrors.length > 0) {
          toast.warning(`${summaryMessage} Some sheets had issues.`);
        } else {
          toast.success(summaryMessage);
        }
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      setUploadErrors(['An unexpected error occurred while parsing the file.']);
      setUploadSummary({ sheetsProcessed: 0, totalRecords: 0 });
      toast.error('An unexpected error occurred while parsing the file. Please check the file format and try again.');
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
      // Remove sourceSheet field and normalize fields before uploading
      const coursesToUpload = previewData.map(course => {
        const { sourceSheet, batches, credits, semester, type, category, department, ...rest } = course;
        // Normalize batches: if batches is a comma-separated labels string, convert to count
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
            // single label like 'N' -> treat as 1
            batchesCount = 1;
          }
        }

        // Ensure credits is a number
        const creditsNum = credits != null ? Number(credits) : 0;

        // Ensure semester is a string acceptable by backend (keep as-is)
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
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload courses. Please try again.';
      setUploadErrors([errorMessage]);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

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
    setError(null);
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
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!courseData.code || !courseData.name || !courseData.type || !courseData.category) {
        throw new Error('Please fill in all required fields');
      }

      // Convert numeric fields
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
        setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = (course.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (course.code?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesDepartment = !filterDepartment || course.department === filterDepartment;
    const matchesSemester = !filterSemester || course.semester === filterSemester;
    return matchesSearch && matchesDepartment && matchesSemester;
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'faculty-management':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <FacultyManagement />
            </div>
          </div>
        );
      case 'course-lists':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              {/* PDF Upload and Course List */}
              <CourseList />
              {/* Existing UI below */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-black">Course Management</h3>
                <div className="flex space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOpenModal()}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                  >
                    Add New Course
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowUploadModal(true)}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                  >
                    Upload From File
                  </motion.button>
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
                      <motion.tr
                        key={course._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-gray-50"
                      >
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
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleOpenModal(course)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDeleteCourse(course._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      default:
        // Overview: Semester-wise Course Count
        // Group courses by semester and count UG/PG separately
        const semesterCounts = {};
        courses.forEach(course => {
          const sem = course.semester || 'Unknown';
          if (!semesterCounts[sem]) semesterCounts[sem] = { ug: 0, pg: 0 };
          const t = (course.type || '').toString().toUpperCase();
          if (t === 'PG') semesterCounts[sem].pg += 1;
          else semesterCounts[sem].ug += 1; // default to UG for anything else
        });
        const sortedSemesters = Object.keys(semesterCounts).sort((a, b) => {
          // Sort numerically if possible, else alphabetically
          const numA = parseInt(a, 10), numB = parseInt(b, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.localeCompare(b);
        });
        return (
          <div className="flex flex-col items-center justify-center min-h-[300px]">
            <h2 className="text-2xl font-bold mb-6 text-black">Semester-wise Course Count</h2>
            <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">Filter:</div>
                <select
                  value={semesterTypeFilter}
                  onChange={(e) => setSemesterTypeFilter(e.target.value)}
                  className="rounded border-gray-300 text-black px-2 py-1"
                >
                  <option value="ALL">All (Total)</option>
                  <option value="UG">UG only</option>
                  <option value="PG">PG only</option>
                </select>
              </div>
              {sortedSemesters.length === 0 ? (
                <div className="text-gray-500 text-center">No course data available.</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {sortedSemesters.map(sem => {
                    const ug = semesterCounts[sem].ug || 0;
                    const pg = semesterCounts[sem].pg || 0;
                    const total = ug + pg;
                    const displayCount = semesterTypeFilter === 'UG' ? ug : semesterTypeFilter === 'PG' ? pg : total;
                    return (
                      <li key={sem} className="py-3 flex justify-between text-black">
                        <div>
                          <div>Semester {sem}</div>
                          <div className="text-xs text-gray-500">UG: {ug} • PG: {pg}</div>
                        </div>
                        <div className="font-semibold">{displayCount} {displayCount === 1 ? 'course' : 'courses'}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
      }}
    >
      {/* Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(15, 15, 15, 0.85)',
          backdropFilter: 'blur(4px)',
          zIndex: 1,
        }}
      />
      <div className="relative z-10">
        <DashboardLayout role="admin" title="Admin Dashboard">
          <div className="space-y-6">
            {/* Tabs */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-gray-700">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-4 px-6 text-sm font-medium ${
                      activeTab === 'overview'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('course-lists')}
                    className={`py-4 px-6 text-sm font-medium ${
                      activeTab === 'course-lists'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Course Management
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
                </nav>
              </div>
              {renderContent()}
            </div>
          </div>
        </DashboardLayout>
      </div>

      {/* Course Management Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[600px] max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-black">{isEditing ? 'Edit Course' : 'Add New Course'}</h2>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
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
            
            {/* Preview table removed as requested */}
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
  );
};

export default AdminDashboard; 