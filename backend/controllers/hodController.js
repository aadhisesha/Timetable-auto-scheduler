const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const Faculty = require('../models/Faculty');
const Course = require('../models/Course');
const Workload = require('../models/Workload');
const FacultyCourseAssignment = require('../models/FacultyCourseAssignment');
const { v4: uuidv4 } = require('uuid');
const facultyController = require('./facultyController');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const ALLOWED_CATEGORIES = ['T', 'LIT','P'];

exports.uploadPreferences = [
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
      let extracted = [];

      if (req.file.mimetype === 'application/pdf') {
        const data = await pdfParse(req.file.buffer);
        extracted = data.text.split('\n').map(line => {
          const [name, firstChoice, allotted] = line.split('|').map(s => s && s.trim());
          return name && firstChoice && allotted ? { name, firstChoice, allottedCourse: allotted } : null;
        }).filter(Boolean);
      } else if (req.file.mimetype.includes('word')) {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        extracted = result.value.split('\n').map(line => {
          const [name, firstChoice, allotted] = line.split('|').map(s => s && s.trim());
          return name && firstChoice && allotted ? { name, firstChoice, allottedCourse: allotted } : null;
        }).filter(Boolean);
      } else if (req.file.mimetype.includes('excel') || req.file.mimetype.includes('spreadsheetml')) {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        extracted = rows.map(row => {
          const [name, firstChoice, allotted] = row;
          return name && firstChoice && allotted ? { name, firstChoice, allottedCourse: allotted } : null;
        }).filter(Boolean);
      } else {
        return res.status(400).json({ message: 'Unsupported file type' });
      }

      // Save to DB
      const saved = await Faculty.insertMany(extracted.map(e => ({
        name: e.name,
        preferredCourses: [e.firstChoice],
        allocatedCourse: e.allottedCourse
      })));

      res.json({ message: 'Preferences uploaded', count: saved.length, data: saved });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
];

exports.uploadExcel = async (req, res) => {
  try {
    const { courses, faculties } = req.body;
    if (!Array.isArray(courses) || !Array.isArray(faculties)) {
      return res.status(400).json({ message: 'Courses and faculties arrays are required.' });
    }
    // Validate and insert courses
    let coursesInserted = 0;
    let courseErrors = [];
    for (const [idx, course] of courses.entries()) {
      let error = '';
      if (!course.name) error += 'Missing Course Name. ';
      if (!course.code) error += 'Missing Course Code. ';
      if (!course.category || !ALLOWED_CATEGORIES.includes(course.category)) error += 'Invalid or missing Category. ';
      if (!course.semester || isNaN(Number(course.semester))) error += 'Invalid or missing Semester. ';
      if (!Array.isArray(course.batches) || !course.batches.length) error += 'Missing Batches. ';
      if (error) {
        courseErrors.push(`Course ${idx + 1}: ${error}`);
        continue;
      }
      // Check for existing course
      const exists = await Course.findOne({
        code: course.code,
        name: course.name,
        category: course.category,
        semester: course.semester,
        batches: course.batches
      });
      if (!exists) {
        await Course.create(course);
        coursesInserted++;
      }
    }
    // Insert faculties (skip duplicates by name)
    let facultiesInserted = 0;
    for (const name of faculties) {
      if (!name) continue;
      const exists = await Faculty.findOne({ name });
      if (!exists) {
        await Faculty.create({ name, phone: 'N/A', designation: 'Assistant Professor', preferredCourses: [], allocatedCourse: '' });
        facultiesInserted++;
      }
    }
    if (courseErrors.length) {
      return res.status(400).json({ message: courseErrors.join('\n') });
    }
    res.json({ message: `Inserted ${coursesInserted} new courses and ${facultiesInserted} new faculty names.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all faculty-course assignments
exports.getAssignments = async (req, res) => {
  try {
    // Fetch all courses for name lookup
    const allCourses = await Course.find({}).select('code name');
    const courseMap = {};
    allCourses.forEach(course => {
      courseMap[course.code] = course.name;
    });

    // Fetch faculty with their course assignments from courseHandled field
    const faculties = await Faculty.find({})
      .select('name courseHandled')
      .sort({ name: 1 });

    const assignments = [];
    
    // Process faculty assignments from courseHandled field
    faculties.forEach(faculty => {
      if (faculty.courseHandled && Array.isArray(faculty.courseHandled)) {
        faculty.courseHandled.forEach(course => {
          assignments.push({
            facultyName: faculty.name,
            courseCode: course.courseCode,
            courseName: courseMap[course.courseCode] || course.courseCode,
            role: course.role,
            batch: course.batch,
            id: faculty._id,
            source: 'faculty_model' // Indicate this comes from Faculty model
          });
        });
      }
    });

    // Include workload-based assignments for backward compatibility (only if no faculty model assignment exists)
    const workloadAssignments = await Workload.find({})
      .populate('faculty', 'name')
      .populate('course', 'code name')
      .sort({ 'course.code': 1 });

    workloadAssignments.forEach(w => {
      // Check if this course-faculty combination already exists in faculty model assignments
      const existingAssignment = assignments.find(assignment => 
        assignment.courseCode === (w.course ? w.course.code : '') &&
        assignment.facultyName === (w.faculty ? w.faculty.name : '')
      );

      // Only add workload assignment if no faculty model assignment exists
      if (!existingAssignment) {
        assignments.push({
          facultyName: w.faculty ? w.faculty.name : 'Deleted Faculty',
          courseCode: w.course ? w.course.code : 'Deleted Course',
          courseName: w.course ? w.course.name : 'Deleted Course',
          role: w.role,
          batch: 'All', // Workload assignments apply to all batches
          id: w._id,
          source: 'workload_model' // Indicate this comes from Workload model
        });
      }
    });
    
    res.json({ assignments });
  } catch (err) {
    console.error('Error in getAssignments:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.uploadAssignments = async (req, res) => {
  const { assignments } = req.body;
  if (!assignments || !Array.isArray(assignments)) {
    return res.status(400).json({ message: 'Invalid request, expected an array of assignments.' });
  }

  const results = {
    successful: 0,
    successfullyAdded: [],
    failed: 0,
    errors: [],
    createdFaculty: [],
    missingCourses: [] // Track missing courses
  };

  // Track unique missing courses
  const missingCourseSet = new Set();

  for (const assignment of assignments) {
    try {
      const { courseCode, facultyName, role, batch } = assignment;
      if (!courseCode || !facultyName || !role) {
        results.failed++;
        results.errors.push({ assignment, error: 'Missing courseCode, facultyName, or role.' });
        continue;
      }
      
      // Find course
      const course = await Course.findOne({ code: courseCode });
      if (!course) {
        results.failed++;
        missingCourseSet.add(courseCode);
        results.errors.push({ assignment, error: `Course with code ${courseCode} not found.` });
        continue;
      }

      // Find or create faculty
      let faculty = await Faculty.findOne({ name: facultyName });
      if (!faculty) {
        faculty = new Faculty({ 
          name: facultyName,
          courseHandled: [], // Initialize empty courseHandled array
          facultyId: uuidv4() // Auto-generate unique facultyId
        });
        await faculty.save();
        results.createdFaculty.push(facultyName);
      }

      // Check if this assignment already exists
      const existingAssignmentIndex = faculty.courseHandled.findIndex(
        course => course.courseCode === courseCode && 
                 course.role === role && 
                 course.batch === (batch || 'All')
      );

      if (existingAssignmentIndex !== -1) {
        // Update existing assignment
        faculty.courseHandled[existingAssignmentIndex] = {
          courseCode,
          role,
          batch: batch || 'All'
        };
      } else {
        // Add new assignment
        faculty.courseHandled.push({
          courseCode,
          role,
          batch: batch || 'All'
        });
      }

      await faculty.save();

      // --- UPSERT FacultyCourseAssignment ---
      await FacultyCourseAssignment.findOneAndUpdate(
        {
          facultyId: faculty._id,
          courseCode,
          role,
          batch: batch || 'All'
        },
        {
          facultyId: faculty._id,
          facultyName: faculty.name,
          courseCode,
          courseName: course.name || '',
          semester: course.semester ? String(course.semester) : '',
          role,
          batch: batch || 'All',
          department: faculty.department || '',
          courseType: course.type || '',
          updatedAt: new Date()
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      // --- END UPSERT ---

      results.successful++;
      results.successfullyAdded.push({
        courseCode: course.code,
        courseName: course.name,
        facultyName: faculty.name,
        role,
        batch: batch || 'All'
      });

    } catch (error) {
      results.failed++;
      results.errors.push({ assignment, error: error.message });
    }
  }

  // Convert Set to Array for missing courses
  results.missingCourses = Array.from(missingCourseSet);

  // Sync all faculty assignments after upload
  await facultyController.syncAllFacultyAssignments();

  res.status(201).json({
    message: `Processed ${assignments.length} assignments and synced all faculty assignments.`,
    ...results
  });
};

// Get batch-specific faculty assignments for a given course
exports.getBatchSpecificAssignments = async (req, res) => {
  try {
    const { courseCode } = req.params;
    
    if (!courseCode) {
      return res.status(400).json({ message: 'Course code is required' });
    }

    // Fetch faculty assignments for the specific course from courseHandled field
    const faculties = await Faculty.find({
      'courseHandled.courseCode': courseCode
    })
    .select('name courseHandled')
    .sort({ name: 1 });

    const batchAssignments = {
      courseCode,
      batches: {}
    };

    // Process faculty assignments for the specific course
    faculties.forEach(faculty => {
      if (faculty.courseHandled && Array.isArray(faculty.courseHandled)) {
        faculty.courseHandled.forEach(course => {
          if (course.courseCode === courseCode) {
            const batch = course.batch;
            if (!batchAssignments.batches[batch]) {
              batchAssignments.batches[batch] = [];
            }
            batchAssignments.batches[batch].push({
              facultyName: faculty.name,
              role: course.role,
              facultyId: faculty._id
            });
          }
        });
      }
    });

    // Also check workload assignments for backward compatibility
    const workloadAssignments = await Workload.find({})
      .populate('faculty', 'name')
      .populate('course', 'code name')
      .sort({ 'course.code': 1 });

    workloadAssignments.forEach(w => {
      if (w.course && w.course.code === courseCode) {
        // Check if this faculty is already assigned via faculty model
        const facultyAlreadyAssigned = Object.values(batchAssignments.batches).some(
          batchFaculty => batchFaculty.some(f => f.facultyName === (w.faculty ? w.faculty.name : ''))
        );

        if (!facultyAlreadyAssigned) {
          // Add to 'All' batch since workload assignments apply to all batches
          if (!batchAssignments.batches['All']) {
            batchAssignments.batches['All'] = [];
          }
          batchAssignments.batches['All'].push({
            facultyName: w.faculty ? w.faculty.name : 'Deleted Faculty',
            role: w.role,
            facultyId: w._id
          });
        }
      }
    });

    res.json(batchAssignments);
  } catch (err) {
    console.error('Error in getBatchSpecificAssignments:', err);
    res.status(500).json({ message: err.message });
  }
}; 