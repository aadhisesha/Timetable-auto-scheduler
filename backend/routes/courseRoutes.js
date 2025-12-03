const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { uploadCoursesPDF } = require('../controllers/courseController');
const multer = require('multer');
const xlsx = require('xlsx');
const Course = require('../models/Course');
const path = require('path');

// Configure multer for file upload
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/json'
  ];
  const allowedExtensions = ['.xlsx', '.xls', '.json'];
  const ext = path.extname(file.originalname).toLowerCase();
  console.log('Upload attempt:', file.originalname, file.mimetype, ext);
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel files (.xlsx, .xls) or JSON files (.json) are allowed!'), false);
  }
};
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter
});

// Get all courses
router.get('/', courseController.getAllCourses);

// Add a new course
router.post('/', courseController.addCourse);

// Add multiple courses in bulk
router.post('/bulk', courseController.addCourses);

// Upload courses from Excel
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    let courses = [];

    if (ext === '.json') {
      // Handle JSON upload
      let jsonData;
      try {
        jsonData = JSON.parse(req.file.buffer.toString('utf-8'));
      } catch (jsonErr) {
        return res.status(400).json({ message: 'Invalid JSON file format.' });
      }
      if (!Array.isArray(jsonData)) {
        return res.status(400).json({ message: 'JSON file must contain an array of courses.' });
      }
      // Map and validate courses for Course model
      courses = jsonData.map(course => {
        // Map courseType to type if present
        const type = course.type || course.courseType;
        return {
          code: course.code,
          name: course.name,
          credits: course.credits,
          type: type,
          category: course.category,
          department: course.department,
          semester: String(course.semester),
          batches: course.batches || 1
        };
      }).filter(course =>
        course.code && course.name && course.credits && course.type && course.category && course.department && course.semester && course.batches
      );
      if (courses.length === 0) {
        return res.status(400).json({ message: 'No valid courses found in the JSON file.' });
      }
    } else {
      // Handle Excel upload
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
      let lastValidCode = '';
      function romanToDecimal(roman) {
        const map = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8 };
        return map[roman] || null;
      }
      for (const row of rows) {
        let courseCode = row['__EMPTY_1'] ? String(row['__EMPTY_1']).trim() : '';
        let courseName = row['__EMPTY_2'] ? String(row['__EMPTY_2']).trim() : '';
        let category = row['__EMPTY_3'] ? String(row['__EMPTY_3']).trim() : '';
        let creditsRaw = row['__EMPTY_4'] ? String(row['__EMPTY_4']).trim() : '';
        let classFieldRaw = row['__EMPTY'] ? String(row['__EMPTY']).trim() : '';
        if (courseCode) {
          lastValidCode = courseCode;
        } else {
          courseCode = lastValidCode;
        }
        if (!courseCode || !courseName || !classFieldRaw) continue;
        let courseType = null;
        if (/B\.E/i.test(classFieldRaw)) courseType = 'UG';
        else if (/M\.E/i.test(classFieldRaw)) courseType = 'PG';
        else continue;
        let semester = null;
        const romanMatch = classFieldRaw.match(/(I{1,3}|IV|V?I{0,3}|VI{0,2}|VII|VIII)/i);
        if (romanMatch) {
          semester = romanToDecimal(romanMatch[1].toUpperCase());
        }
        if (!semester) continue;
        let credits = 0;
        const creditsMatch = creditsRaw.match(/\d+(\.\d+)?/);
        if (creditsMatch) credits = parseFloat(creditsMatch[0]);
        if (!credits || isNaN(credits)) credits = 0;
        courses.push({
          code: courseCode,
          name: courseName,
          category: category,
          credits: credits,
          semester: semester, // as number
          courseType: courseType, // as string
          department: 'CSE', // Default, adjust if needed
          batches: 1 // Default, adjust if needed
        });
      }
      if (courses.length === 0) {
        return res.status(400).json({ message: 'No valid courses found in the Excel file' });
      }
    }

    await Course.insertMany(courses);
    res.status(200).json({ message: `Uploaded ${courses.length} courses successfully`, count: courses.length });
  } catch (err) {
    console.error('Upload error:', err.message, err.stack);
    res.status(500).json({ error: 'Server error during upload' });
  }
});

// Update a course
router.put('/:id', courseController.updateCourse);

// Delete a course
router.delete('/:id', courseController.deleteCourse);

// Get courses by department and semester
router.get('/department-semester', courseController.getCoursesByDepartmentAndSemester);

router.post('/upload-pdf', uploadCoursesPDF);

// Route for uploading courses via Excel
router.post('/upload-courses', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const courses = [];

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet);

      // Extract semester number from sheet name (e.g., "Semester 1" -> "1")
      const semesterMatch = sheetName.match(/Semester\s*(\d+)/i);
      const semester = semesterMatch ? semesterMatch[1] : null;

      if (!semester) {
        console.warn(`Skipping sheet "${sheetName}" - invalid semester format`);
        continue;
      }

      // Process each row in the sheet
      for (const row of rows) {
        const course = {
          code: row['Course Code'],
          name: row['Course Name'],
          department: row['Department'] || 'CSE',
          semester: semester,
          credits: parseInt(row['Credits']) || 3,
          type: row['Type'] || 'UG',
          category: row['Category'] || 'Theory',
          batches: parseInt(row['Batches']) || 1
        };

        // Validate required fields
        if (!course.code || !course.name) {
          console.warn(`Skipping invalid course in sheet "${sheetName}"`);
          continue;
        }

        courses.push(course);
      }
    }

    if (courses.length === 0) {
      return res.status(400).json({ message: 'No valid courses found in the Excel file' });
    }

    // Insert courses into MongoDB
    const result = await Course.insertMany(courses, { ordered: false });

    res.status(200).json({
      message: 'Courses uploaded successfully',
      count: result.length
    });

  } catch (error) {
    console.error('Error uploading courses:', error);
    res.status(500).json({
      message: 'Error uploading courses',
      error: error.message
    });
  }
});

router.post('/upload-excel', courseController.uploadCoursesFromExcel);

module.exports = router; 