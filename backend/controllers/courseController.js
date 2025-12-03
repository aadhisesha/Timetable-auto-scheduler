const multer = require('multer');
const pdfParse = require('pdf-parse');
const xlsx = require('xlsx');
const Course = require('../models/Course');

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'), false);
    }
  }
});

// Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    console.log('Fetching all courses');
    const courses = await Course.find();
    console.log(`Found ${courses.length} courses`);
    res.json(courses);
  } catch (error) {
    console.error('Error in getAllCourses:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add a new course
exports.addCourse = async (req, res) => {
  try {
    console.log('Adding new course:', req.body);
    
    // Validate required fields
    const requiredFields = ['code', 'name', 'department', 'semester', 'credits', 'type', 'category', 'batches'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ message: `${field} is required` });
      }
    }

    // Validate numeric fields
    if (isNaN(req.body.credits) || req.body.credits < 1) {
      return res.status(400).json({ message: 'Credits must be a positive number' });
    }

    // Validate batches
    if (isNaN(req.body.batches) || req.body.batches < 1) {
      return res.status(400).json({ message: 'Number of batches must be a positive number' });
    }

    // Validate type and category values
    if (!['UG', 'PG'].includes(req.body.type)) {
      throw new Error('Invalid type value. Must be either UG or PG');
    }

    if (!['Theory', 'Lab Integrated Theory', 'Lab'].includes(req.body.category)) {
      throw new Error('Invalid category value. Must be Theory, Lab Integrated Theory, or Lab');
    }

    // Check if course code already exists
    const existingCourse = await Course.findOne({ 
      code: { $regex: new RegExp(`^${req.body.code}$`, 'i') }
    });

    if (existingCourse) {
      console.log('Found existing course with code:', existingCourse.code);
      return res.status(400).json({ 
        message: `Course code already exists: ${existingCourse.code}`,
        existingCourse: existingCourse
      });
    }

    const course = new Course(req.body);
    const savedCourse = await course.save();
    console.log('Course saved successfully:', savedCourse);
    res.status(201).json(savedCourse);
  } catch (error) {
    console.error('Error in addCourse:', error);
    if (error.code === 11000) {
      res.status(400).json({ 
        message: `Course code already exists: ${req.body.code}`,
      });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
};

// Helper: map flexible header names to canonical field names
const headerMap = {
  'code': 'Course Code',
  'course code': 'Course Code',
  'coursecode': 'Course Code',
  'name': 'Course Name',
  'course name': 'Course Name',
  'coursename': 'Course Name',
  'department': 'Department',
  'credits': 'Credits',
  'type': 'Type',
  'category': 'Category',
  'batches': 'No. of Batches',
  'no. of batches': 'No. of Batches',
  'required no. of staff': 'Required No. of Staff',
};

function normalizeHeader(header) {
  return header.replace(/\s+/g, '').toLowerCase();
}

// Upload courses from Excel
exports.uploadCoursesExcel = [
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const courses = [];
      const errors = [];
      const duplicates = [];
      const romanToInt = {
        'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8
      };
      function extractSemester(classField) {
        if (!classField) return '';
        const match = classField.match(/(I{1,3}|IV|V?I{0,3}|VI{0,2}|VII|VIII)/i);
        if (match) {
          const roman = match[1].toUpperCase();
          return romanToInt[roman] ? String(romanToInt[roman]) : '';
        }
        return '';
      }
      function extractType(classField) {
        if (!classField) return '';
        if (/m\.e/i.test(classField)) return 'PG';
        if (/b\.e/i.test(classField)) return 'UG';
        return '';
      }
      function extractBatch(courseName) {
        if (!courseName) return '';
        const match = courseName.trim().toLowerCase().match(/(n|p|q)$/);
        return match ? match[1].toUpperCase() : '';
      }
      function cleanString(val) {
        return typeof val === 'string' ? val.replace(/\r?\n/g, ' ').trim() : val;
      }
      function extractCredits(creditsRaw) {
        if (!creditsRaw) return 0;
        // Extract first number (may be float) from string like '4 (2/4)'
        const match = String(creditsRaw).match(/([\d.]+)/);
        return match ? parseFloat(match[1]) : 0;
      }
      function isEmptyOrDash(val) {
        if (val === undefined || val === null) return true;
        const cleaned = String(val).replace(/\r?\n/g, '').replace(/\s+/g, '').trim();
        return cleaned === '' || cleaned === '-';
      }
      let currentCourseCode = '';
      let currentClassField = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { raw: false });
        for (const row of rows) {
          // Extract and clean fields by their typical keys
          let code = cleanString(row['__EMPTY_1'] || '');
          let name = cleanString(row['__EMPTY_2'] || '');
          const category = cleanString(row['__EMPTY_3'] || '');
          const creditsRaw = row['__EMPTY_4'];
          const credits = extractCredits(creditsRaw);
          let classFieldRaw = cleanString(row['__EMPTY'] || '');
          const department = 'CSE'; // Default or extract if needed

          // Fallback logic for split/continuation rows
          if (!isEmptyOrDash(code)) {
            currentCourseCode = code;
          } else {
            code = currentCourseCode;
          }
          if (!isEmptyOrDash(classFieldRaw)) {
            currentClassField = classFieldRaw;
          } else {
            classFieldRaw = currentClassField;
          }

          // Clean up classField for parsing
          classFieldRaw = classFieldRaw.replace(/\r?\n|\r/g, ' ').trim();

          // Ignore rows that are clearly not courses (e.g., faculty-only, headers, footers)
          if (
            isEmptyOrDash(name) ||
            /^faculty|lab|i\/c|hod|coordinator|staff|instructor|assistant|professor|teacher|mentor|tutor|\s*$/i.test(name)
          ) {
            continue;
          }

          // Extract semester and level from classFieldRaw
          let semester = '';
          let level = '';
          let classField = '';
          const romanMatch = classFieldRaw.match(/(I{1,3}|IV|V?I{0,3}|VI{0,2}|VII|VIII)/i);
          if (romanMatch) {
            const roman = romanMatch[1].toUpperCase();
            semester = romanToInt[roman] ? String(romanToInt[roman]) : '';
          }
          if (/m\.e/i.test(classFieldRaw)) level = 'PG';
          else if (/b\.e/i.test(classFieldRaw)) level = 'UG';
          if (level && semester) {
            classField = `${level} - Sem ${semester}`;
          }

          // Extract batch from last letter of course name
          const batch = extractBatch(name);

          // Only treat as valid if Course Name is present (with fallback code/class)
          if (isEmptyOrDash(name)) {
            continue;
          }

          // Check for duplicate course code + batch
          const existingCourse = await Course.findOne({ code: { $regex: new RegExp(`^${code}$`, 'i') }, batch });
          if (existingCourse) {
            duplicates.push(code + (batch ? ` (Batch ${batch})` : ''));
            continue;
          }

          courses.push({
            code,
            name,
            credits,
            category,
            type: level,
            semester,
            department,
            batch,
            classField,
            batches: 1 // Default to 1, or extract if needed
          });
        }
      }
      if (courses.length === 0) {
        return res.status(400).json({
          message: 'No valid courses found in the Excel file',
          errors,
          duplicates
        });
      }
      const result = await Course.insertMany(courses, { ordered: false });
      res.status(200).json({
        message: `Courses uploaded successfully. ${result.length} added.`,
        count: result.length,
        errors: errors.length > 0 ? errors : undefined,
        duplicates: duplicates.length > 0 ? duplicates : undefined
      });
    } catch (error) {
      res.status(500).json({
        message: 'Error uploading courses',
        error: error.message
      });
    }
  }
];

// Update a course
exports.updateCourse = async (req, res) => {
  try {
    console.log('Updating course:', req.params.id, req.body);
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!course) {
      console.log('Course not found:', req.params.id);
      return res.status(404).json({ message: 'Course not found' });
    }
    console.log('Course updated successfully:', course);
    res.json(course);
  } catch (error) {
    console.error('Error in updateCourse:', error);
    res.status(400).json({ message: error.message });
  }
};

// Delete a course
exports.deleteCourse = async (req, res) => {
  try {
    console.log('Deleting course:', req.params.id);
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      console.log('Course not found:', req.params.id);
      return res.status(404).json({ message: 'Course not found' });
    }
    console.log('Course deleted successfully:', course);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error in deleteCourse:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get courses by department and semester
exports.getCoursesByDepartmentAndSemester = async (req, res) => {
  try {
    const { department, semester } = req.query;
    console.log('Fetching courses by department and semester:', { department, semester });
    const courses = await Course.find({ department, semester });
    console.log(`Found ${courses.length} courses`);
    res.json(courses);
  } catch (error) {
    console.error('Error in getCoursesByDepartmentAndSemester:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.uploadCoursesPDF = [
  upload.single('pdf'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
      const data = await pdfParse(req.file.buffer);
      const text = data.text;

      // Example: Parse lines like "CS101 | Computer Science | 4 | 2 | CSE"
      // Adjust this regex/logic to match your PDF format if needed
      const courseLines = text.split('\n').filter(line => line.match(/\|/));
      const courses = courseLines.map(line => {
        const [code, name, credits, semester, department] = line.split('|').map(s => s.trim());
        return { code, name, credits: Number(credits), semester: Number(semester), department };
      });

      // Save to DB
      const saved = await Course.insertMany(courses);
      res.json({ message: 'Courses uploaded', count: saved.length, courses: saved });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
];

exports.uploadCoursesFromExcel = async (req, res) => {
  try {
    const courses = req.body.courses;
    if (!Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({ message: 'No valid courses provided.' });
    }
    const added = [];
    const skipped = [];
    for (const course of courses) {
      if (!course.code || !course.name || !course.department) {
        skipped.push({ course, reason: 'Missing required fields' });
        continue;
      }
      const exists = await Course.findOne({ code: course.code });
      if (exists) {
        skipped.push({ course, reason: 'Duplicate course code' });
        continue;
      }
      try {
        const newCourse = new Course(course);
        await newCourse.save();
        added.push(newCourse);
      } catch (err) {
        skipped.push({ course, reason: err.message });
      }
    }
    res.json({ message: `Added ${added.length} courses. Skipped ${skipped.length}.`, added, skipped });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading courses', error: error.message });
  }
};

// Add multiple courses
exports.addCourses = async (req, res) => {
  const { courses } = req.body;

  if (!courses || !Array.isArray(courses)) {
    return res.status(400).json({ message: 'Invalid request format, expected an array of courses.' });
  }

  const successfullyAdded = [];
  const errors = [];

  for (const courseData of courses) {
    try {
      // Basic validation
      if (!courseData.code || !courseData.name) {
        errors.push({ course: courseData, error: 'Course code and name are required.' });
        continue;
      }
      
      // Check for duplicates
      const existingCourse = await Course.findOne({ code: courseData.code });
      if (existingCourse) {
        errors.push({ course: courseData, error: `Course with code ${courseData.code} already exists.` });
        continue;
      }

      const course = new Course(courseData);
      const savedCourse = await course.save();
      successfullyAdded.push(savedCourse);

    } catch (error) {
      errors.push({ course: courseData, error: error.message });
    }
  }

  if (successfullyAdded.length === 0 && errors.length > 0) {
    return res.status(400).json({ 
      message: 'Failed to add any courses. See errors for details.',
      errors: errors,
      addedCount: 0
    });
  }

  res.status(201).json({
    message: `Successfully added ${successfullyAdded.length} of ${courses.length} courses.`,
    successfullyAdded,
    errors,
    addedCount: successfullyAdded.length
  });
}; 