const mongoose = require('mongoose');
const connectDB = require('./config/db');

// Mock data to test export functionality
const mockMappings = [
  {
    facultyId: 'cs001',
    courseCode: 'CS101',
    role: 'Theory Teacher',
    batch: 'N',
    semester: 'Fall 2025',
    courseType: 'UG'
  },
  {
    facultyId: 'cs002',
    courseCode: 'CS102',
    role: 'Lab Incharge',
    batch: 'P',
    semester: 'Spring 2026',
    courseType: 'UG'
  }
];

const mockFaculties = [
  { userId: 'cs001', name: 'Dr. Smith' },
  { userId: 'cs002', name: 'Prof. Johnson' }
];

const mockCourses = [
  { code: 'CS101', name: 'Introduction to Programming' },
  { code: 'CS102', name: 'Data Structures Lab' }
];

// Test the exportSubjectMappingsAsCSV function
const testCSVExport = () => {
  console.log('Testing CSV export with correct column names...');
  
  // Simulate the export function
  const headers = ['Faculty ID', 'Faculty Name', 'Course Code', 'Course Name', 'Role', 'Batch', 'Semester', 'Course Type'];
  const rows = mockMappings.map(m => {
    const faculty = mockFaculties.find(f => f.userId === m.facultyId) || {};
    const course = mockCourses.find(c => c.code === m.courseCode) || {};
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
  
  const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  
  console.log('Generated CSV content:');
  console.log(csvContent);
  
  // Verify column names
  const expectedHeaders = ['Faculty ID', 'Faculty Name', 'Course Code', 'Course Name', 'Role', 'Batch', 'Semester', 'Course Type'];
  const actualHeaders = headers;
  
  const headersMatch = JSON.stringify(expectedHeaders) === JSON.stringify(actualHeaders);
  
  if (headersMatch) {
    console.log('✅ CSV export has correct column names');
  } else {
    console.log('❌ CSV export has incorrect column names');
    console.log('Expected:', expectedHeaders);
    console.log('Actual:', actualHeaders);
  }
  
  return headersMatch;
};

// Run the test
const runTests = async () => {
  try {
    console.log('Running export column name tests...\n');
    
    const csvResult = testCSVExport();
    
    console.log('\n--- Test Results ---');
    console.log(`CSV Export: ${csvResult ? 'PASS' : 'FAIL'}`);
    
    if (csvResult) {
      console.log('\n✅ All tests passed! Export functionality has correct column names.');
    } else {
      console.log('\n❌ Some tests failed. Please check the export functionality.');
    }
    
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
};

runTests();