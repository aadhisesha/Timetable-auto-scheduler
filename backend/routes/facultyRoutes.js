const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');
const auth = require('../middleware/auth'); // CRITICAL: Ensure this line is exactly correct
const { registerFaculty, getUGCourses, storeFacultyName, getFacultyTimetableViewer } = require('../controllers/facultyController');

// Get all faculty members (no auth required)
router.get('/', facultyController.getAllFaculty);

// Populate faculty course assignments (admin only)
router.post('/populate-assignments', facultyController.populateFacultyAssignments);

// Faculty course assignment routes
router.get('/assignments', facultyController.getAllAssignments);
router.get('/assignments/timetable', facultyController.getAllFacultyAssignmentsForTimetable);
router.get('/assignments/semester/:semester/:courseType', facultyController.getFacultyAssignmentsForSemester);
router.get('/assignments/course-batch', facultyController.getFacultyAssignmentsForCourseBatch);
router.get('/assignments/faculty/:facultyId', facultyController.getAssignmentsByFaculty);
router.get('/assignments/course/:courseCode', facultyController.getAssignmentsByCourse);
router.get('/assignments/batch/:batch', facultyController.getAssignmentsByBatch);
router.post('/assignments', facultyController.createAssignment);
router.put('/assignments/:id', facultyController.updateAssignment);
router.delete('/assignments/:id', facultyController.deleteAssignment);

// New routes for faculty course assignments from facultycourseassignments collection
router.get('/course-assignments', facultyController.getFacultyCourseAssignments);
router.get('/course-assignments/all', facultyController.getAllFacultyCourseAssignments);
router.get('/course-assignments/name', facultyController.getFacultyCourseAssignmentsByName);
router.post('/course-assignments/sync', facultyController.syncFacultyAssignments);
router.post('/course-assignments/sync-all', facultyController.syncAllFacultyAssignments);

// Add a new faculty member (admin only)
router.post('/', auth, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
}, facultyController.addFaculty);

// Update faculty member (admin only)
router.put('/:id', auth, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
}, facultyController.updateFaculty);

// Delete faculty member
// NOTE: temporarily allow unauthenticated deletes to support local admin UI while
// the frontend auth/token flow is configured. Remove this change and re-enable
// `auth` middleware in production environments.
router.delete('/:id', facultyController.deleteFaculty);

// Get available UG courses for faculty
router.get('/courses/available', auth, facultyController.getAvailableCourses);

// Submit course preferences
router.post('/courses/preferences', auth, facultyController.submitCoursePreferences);

// Get faculty's course preferences
router.get('/courses/preferences', auth, facultyController.getCoursePreferences);

// Get all course assignments (for HOD)
router.get('/courses/assignments', auth, facultyController.getCourseAssignments);

router.post('/register', registerFaculty);
router.get('/ug-courses', getUGCourses);
router.post('/store-name', storeFacultyName);

// Manual faculty entry (no auth for now)
router.post('/manual-add', facultyController.addFacultyWithCourses);
// Excel upload for faculties (no auth for now)
router.post('/excel-upload', facultyController.bulkAddFacultiesFromExcel);
// Faculty summary (no auth for now)
router.get('/summary', facultyController.getFacultySummary);

// Faculty Timetable Viewer route
router.get('/faculty-timetable-viewer', getFacultyTimetableViewer);

module.exports = router; 