import React, { useEffect, useState, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { courseService } from '../services/courseService';
import { facultyService } from '../services/facultyService';
import { timetableService } from '../services/timetableService';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';

const ROLES = ['Theory Teacher', 'Lab Incharge', 'Lab Assistant'];
const BATCHES = ['N', 'P', 'Q'];
const SEMESTERS = [1,2,3,4,5,6,7,8];

const HODDashboard = () => {
  // Manual faculty entry state
  const [courses, setCourses] = useState([]);
  const [facultyName, setFacultyName] = useState('');
  const [facultyCourses, setFacultyCourses] = useState([]); // [{course, role, batch}]
  const [manualMsg, setManualMsg] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // Faculty assignment state
  const [allAssignments, setAllAssignments] = useState([]);
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [uploadResults, setUploadResults] = useState(null); // { successful: [], failed: [] }
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  // Faculty summary
  const [facultyCount, setFacultyCount] = useState(0);

  const UG_BATCHES = ['N', 'P', 'Q'];
  const UG_SEMESTERS = [1,2,3,4,5,6,7,8];
  const PG_SEMESTERS = [
    'SEM-1 PLAN-A', 'SEM-1 PLAN-B', 'SEM-1 PLAN-C',
    'SEM-2 PLAN-A', 'SEM-2 PLAN-B', 'SEM-2 PLAN-C',
    'SEM-3', 'SEM-4'
  ];

  const navigate = useNavigate();

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
    if (['N', 'P', 'Q'].includes(lastWord)) {
      return lastWord;
    }
    
    return null;
  };

  // Helper function to clean course name by removing batch information
  const cleanCourseName = (courseName) => {
    if (!courseName) return courseName;
    
    const courseNameStr = String(courseName).trim();
    
    // Remove batch in parentheses
    let cleaned = courseNameStr.replace(/\([NPQ]\)/g, '').trim();
    
    // Remove batch at the end separated by space
    const words = cleaned.split(' ');
    const lastWord = words[words.length - 1];
    if (['N', 'P', 'Q'].includes(lastWord)) {
      words.pop();
      cleaned = words.join(' ').trim();
    }
    
    return cleaned;
  };

  // Fetch courses and faculty summary on mount
  useEffect(() => {
    courseService.getAllCourses().then(setCourses).catch(() => setCourses([]));
    facultyService.getFacultySummary().then(res => setFacultyCount(res.totalFaculties)).catch(() => setFacultyCount(0));
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await facultyService.getAllAssignments();
      // Filter out assignments where faculty name is "Deleted Faculty"
      const filteredAssignments = (res.assignments || []).filter(
        assignment => assignment.facultyName !== 'Deleted Faculty'
      );
      setAllAssignments(filteredAssignments);
    } catch (error) {
      console.error("Failed to fetch assignments", error);
    }
  };

  // Manual faculty entry handlers
  const handleAddCourseRow = () => {
    setFacultyCourses([...facultyCourses, { course: '', role: ROLES[0], batch: BATCHES[0] }]);
  };
  const handleRemoveCourseRow = (idx) => {
    setFacultyCourses(facultyCourses.filter((_, i) => i !== idx));
  };
  const handleCourseChange = (idx, field, value) => {
    setFacultyCourses(facultyCourses.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  // Manual faculty entry submit
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setManualMsg('');
    setManualLoading(true);
    try {
      if (!facultyName || facultyCourses.length === 0 || facultyCourses.some(c => !c.course || !c.role || !c.batch)) {
        setManualMsg('Please fill all fields for all courses.');
        setManualLoading(false);
        return;
      }
      await facultyService.addFacultyManual({ name: facultyName, courses: facultyCourses });
      setManualMsg('Faculty added successfully!');
      setFacultyName('');
      setFacultyCourses([]);
      facultyService.getFacultySummary().then(res => setFacultyCount(res.totalFaculties));
    } catch (err) {
      setManualMsg(err.response?.data?.message || err.message || 'Error adding faculty.');
    } finally {
      setManualLoading(false);
    }
  };

  const handleFileUploadAndAssign = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setAssignmentLoading(true);
    setUploadResults(null);

    try {
      // 1. Parse the file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      const allAssignments = [];
      let totalSheets = workbook.SheetNames.length;
      let processedSheets = 0;
      let totalRecords = 0;

      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        console.log(`Processing sheet: ${sheetName}`);
        
        try {
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

          if (rows.length === 0) {
            console.log(`Sheet ${sheetName} is empty, skipping...`);
            continue;
          }

          // Find header logic... (re-using the robust logic)
          let headerRowIndex = -1;
          let mainHeaders = [];
          const mainHeaderKeywords = ['Course Code', 'Course Name'];
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (Array.isArray(row) && mainHeaderKeywords.every(k => row.some(h => h && String(h).includes(k)))) {
              headerRowIndex = i;
              mainHeaders = row.map(h => (h ? String(h).trim() : ''));
              break;
            }
          }
          
          if (headerRowIndex === -1) {
            console.log(`Sheet ${sheetName} does not have valid headers, skipping...`);
            continue;
          }

          const subHeaderRow = rows[headerRowIndex + 1] || [];
          const compositeHeaders = mainHeaders.map((mainHeader, index) => {
            const subHeader = subHeaderRow[index] ? String(subHeaderRow[index]).trim() : '';
            if (mainHeader.toLowerCase().includes('staff assigned') || mainHeader.toLowerCase().includes('others')) return subHeader || mainHeader;
            if (!mainHeader && subHeader) return subHeader;
            return mainHeader;
          });

          const codeIndex = compositeHeaders.findIndex(h => h.includes('Course Code'));
          const nameIndex = compositeHeaders.findIndex(h => h.includes('Course Name'));
          const theoryIndex = compositeHeaders.findIndex(h => h.includes('Theory'));
          const labICIndex = compositeHeaders.findIndex(h => h.includes('Lab (I/C)'));
          const labAIndex = compositeHeaders.findIndex(h => h.includes('Lab (A)'));

          console.log(`Sheet ${sheetName} - Column indices:`, { codeIndex, nameIndex, theoryIndex, labICIndex, labAIndex });

          const parsedAssignments = [];
          let lastCourseCode = null, lastCourseName = null; // Reset for each sheet
          
          for (let i = headerRowIndex + 2; i < rows.length; i++) {
            const row = rows[i];
            if (!Array.isArray(row) || row.every(cell => cell === null)) continue;
            
            const courseCode = row[codeIndex] || lastCourseCode;
            const courseName = row[nameIndex] || lastCourseName;
            
            if(!courseCode || !courseName) continue;
            
            lastCourseCode = courseCode;
            lastCourseName = courseName;
            
            // Extract batch from course name
            const batch = extractBatchFromCourseName(courseName);
            const cleanName = cleanCourseName(courseName);
            
            const theoryFaculty = row[theoryIndex];
            const labICFaculty = row[labICIndex];
            const labAFaculty = row[labAIndex];
            
            console.log(`Sheet ${sheetName} - Row ${i}:`, { 
              courseCode, 
              courseName: cleanName, 
              theoryFaculty, 
              labICFaculty, 
              labAFaculty,
              batch 
            });
            
            if (theoryFaculty && theoryFaculty.trim() !== '-' && theoryFaculty.trim() !== '') {
              parsedAssignments.push({ 
                courseCode, 
                courseName: cleanName, 
                facultyName: theoryFaculty, 
                role: 'Theory Teacher',
                batch: batch || '-',
                sourceSheet: sheetName
              });
            }
            if (labICFaculty && labICFaculty.trim() !== '-' && labICFaculty.trim() !== '') {
              parsedAssignments.push({ 
                courseCode, 
                courseName: cleanName, 
                facultyName: labICFaculty, 
                role: 'Lab Incharge',
                batch: batch || '-',
                sourceSheet: sheetName
              });
            }
            if (labAFaculty && labAFaculty.trim() !== '-' && labAFaculty.trim() !== '') {
              parsedAssignments.push({ 
                courseCode, 
                courseName: cleanName, 
                facultyName: labAFaculty, 
                role: 'Lab Assistant',
                batch: batch || '-',
                sourceSheet: sheetName
              });
            }
          }
          
          console.log(`Sheet ${sheetName} - Parsed assignments:`, parsedAssignments.length);
          
          if (parsedAssignments.length > 0) {
            allAssignments.push(...parsedAssignments);
            totalRecords += parsedAssignments.length;
            console.log(`Sheet ${sheetName} - Added ${parsedAssignments.length} assignments. Total so far: ${allAssignments.length}`);
          }
          
          processedSheets++;
          
        } catch (error) {
          console.error(`Error processing sheet ${sheetName}:`, error);
        }
      }

      console.log('Final allAssignments:', allAssignments);
      console.log('Total assignments to upload:', allAssignments.length);

      if (allAssignments.length === 0) {
        throw new Error('No valid faculty assignments found in any sheet of the file.');
      }
      
      // 2. Upload all assignments to backend
      // Remove sourceSheet field from each assignment before uploading
      const assignmentsToUpload = allAssignments.map(assignment => {
        const { sourceSheet, ...assignmentData } = assignment;
        return assignmentData;
      });
      
      console.log('Uploading assignments:', assignmentsToUpload.length);
      const res = await facultyService.uploadFacultyAssignments(assignmentsToUpload);
      
      // 3. Set results for display
      setUploadResults({
        successful: res.successfullyAdded,
        failed: res.errors,
        created: res.createdFaculty,
        missingCourses: res.missingCourses,
        summary: {
          totalSheets,
          processedSheets,
          totalRecords,
          successfulRecords: res.successful || 0,
          failedRecords: res.failed || 0
        }
      });

      // 4. Refresh data
      if (res.successful > 0) {
        fetchAssignments();
        facultyService.getFacultySummary().then(res => setFacultyCount(res.totalFaculties));
      }
    } catch (err) {
      setUploadResults({ 
        successful: [], 
        failed: [{ assignment: {}, error: err.message || 'An error occurred.' }],
        summary: { totalSheets: 0, processedSheets: 0, totalRecords: 0, successfulRecords: 0, failedRecords: 0 }
      });
    } finally {
      setAssignmentLoading(false);
      // Clear file input
      event.target.value = null;
    }
  };

  return (
    <DashboardLayout role="hod">
      <div className="max-w-5xl mx-auto py-8 space-y-10">
        {/* Faculty Summary */}
        <section className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black">Faculty Summary</h2>
          <div className="text-2xl font-bold text-blue-700">{facultyCount}</div>
        </section>

        {/* Manual Faculty Entry */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-black mb-4">Manual Faculty Entry</h2>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700">Faculty Name</label>
              <input type="text" value={facultyName} onChange={e => setFacultyName(e.target.value)} className="w-full border rounded px-3 py-2 text-black" required />
            </div>
            <div>
              <label className="block text-gray-700">Courses Handled</label>
              {facultyCourses.map((row, idx) => (
                <div key={idx} className="flex gap-2 items-center mb-2">
                  <select value={row.course} onChange={e => handleCourseChange(idx, 'course', e.target.value)} className="border rounded px-2 py-1 text-black" required>
                    <option value="">Select Course</option>
                    {courses.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                  </select>
                  <select value={row.role} onChange={e => handleCourseChange(idx, 'role', e.target.value)} className="border rounded px-2 py-1 text-black" required>
                    {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                  <select value={row.batch} onChange={e => handleCourseChange(idx, 'batch', e.target.value)} className="border rounded px-2 py-1 text-black" required>
                    {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <button type="button" onClick={() => handleRemoveCourseRow(idx)} className="text-red-600 font-bold">&times;</button>
                </div>
              ))}
              <button type="button" onClick={handleAddCourseRow} className="px-2 py-1 bg-blue-200 text-blue-800 rounded">+ Add Course</button>
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" disabled={manualLoading}>{manualLoading ? 'Saving...' : 'Add Faculty'}</button>
            {manualMsg && <div className="mt-2 text-blue-700">{manualMsg}</div>}
          </form>
        </section>

        {/* Faculty Assignment Upload */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-black mb-4">Upload & Assign Faculty</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Upload Staff Allotment Excel File</label>
              <input 
                type="file" 
                accept=".xlsx, .xls"
                onChange={handleFileUploadAndAssign}
                disabled={assignmentLoading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
              {assignmentLoading && <div className="mt-2 text-blue-700">Processing...</div>}
            </div>
          </div>
        </section>

        {/* Upload Results */}
        {uploadResults && (
          <section className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-black mb-4">Upload Results</h3>
            
            {/* Summary */}
            {uploadResults.summary && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Processing Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Sheets:</span>
                    <span className="ml-2 font-semibold">{uploadResults.summary.totalSheets}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Processed:</span>
                    <span className="ml-2 font-semibold">{uploadResults.summary.processedSheets}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Records:</span>
                    <span className="ml-2 font-semibold">{uploadResults.summary.totalRecords}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Success Rate:</span>
                    <span className="ml-2 font-semibold">
                      {uploadResults.summary.totalRecords > 0 
                        ? Math.round((uploadResults.summary.successfulRecords / uploadResults.summary.totalRecords) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {uploadResults.successful?.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-green-700">Successfully Assigned ({uploadResults.successful.length})</h4>
                <ul className="list-disc list-inside text-sm text-gray-800">
                  {uploadResults.successful.map((item, index) => (
                    <li key={index}>
                      {item.facultyName} to {item.courseCode} ({item.role})
                      {item.batch && item.batch !== 'All' && ` - Batch ${item.batch}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {uploadResults.missingCourses?.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-orange-600">Missing Courses ({uploadResults.missingCourses.length})</h4>
                <p className="text-sm text-gray-700 mb-2">The following courses need to be added to the database:</p>
                <ul className="list-disc list-inside text-sm text-orange-600">
                  {uploadResults.missingCourses.map((courseCode, index) => (
                    <li key={index}><strong>{courseCode}</strong></li>
                  ))}
                </ul>
                <div className="mt-3">
                  <button
                    onClick={() => navigate('/course-management')}
                    className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                  >
                    Go to Course Management
                  </button>
                </div>
              </div>
            )}
            {uploadResults.failed?.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-700">Failed Assignments ({uploadResults.failed.length})</h4>
                <ul className="list-disc list-inside text-sm text-red-600">
                  {uploadResults.failed.map((item, index) => (
                    <li key={index}>
                      Assignment for <strong>{item.assignment.courseCode}</strong> to <strong>{item.assignment.facultyName}</strong> failed: {item.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
        
        {/* Current Assignments */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-black mb-4">Current Faculty Assignments</h2>
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full bg-white border border-gray-300 text-black">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1">Course Code</th>
                  <th className="border px-2 py-1">Course Name</th>
                  <th className="border px-2 py-1">Faculty Name</th>
                  <th className="border px-2 py-1">Role</th>
                  <th className="border px-2 py-1">Batch</th>
                </tr>
              </thead>
              <tbody>
                {allAssignments.map((item) => (
                  <tr key={item.id}>
                    <td className="border px-2 py-1">{item.courseCode}</td>
                    <td className="border px-2 py-1">{item.courseName}</td>
                    <td className="border px-2 py-1">{item.facultyName}</td>
                    <td className="border px-2 py-1">{item.role}</td>
                    <td className="border px-2 py-1">{item.batch || 'All'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default HODDashboard; 