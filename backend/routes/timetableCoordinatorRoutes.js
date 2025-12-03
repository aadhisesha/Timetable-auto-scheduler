const express = require('express');
const {
  uploadPreferences,
  uploadExcel,
  getAssignments,
  getBatchSpecificAssignments,
  uploadAssignments
} = require('../controllers/hodController'); // Reuse HOD logic

const {
  createSubjectMapping,
  bulkCreateSubjectMappings,
  getAllSubjectMappings,
  getSubjectMappingsByFaculty,
  getSubjectMappingsByCourse,
  updateSubjectMapping,
  deleteSubjectMapping
} = require('../controllers/coordinatorController');

const router = express.Router();

router.post('/upload-preferences', uploadPreferences);
router.post('/upload-excel', uploadExcel);
router.get('/assignments', getAssignments);
router.get('/assignments/:courseCode', getBatchSpecificAssignments);
router.post('/assignments', uploadAssignments);

// Subject Mapping Routes
router.post('/subject-mappings', createSubjectMapping);
router.post('/subject-mappings/bulk', bulkCreateSubjectMappings);
router.get('/subject-mappings', getAllSubjectMappings);
router.get('/subject-mappings/faculty/:facultyId', getSubjectMappingsByFaculty);
router.get('/subject-mappings/course/:courseCode', getSubjectMappingsByCourse);
router.put('/subject-mappings/:id', updateSubjectMapping);
router.delete('/subject-mappings/:id', deleteSubjectMapping);

module.exports = router; 