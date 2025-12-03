const express = require('express');
const { uploadPreferences, uploadExcel, getAssignments, getBatchSpecificAssignments } = require('../controllers/hodController');
const router = express.Router();

router.post('/upload-preferences', uploadPreferences);
router.post('/upload-excel', uploadExcel);
router.get('/assignments', getAssignments);
router.get('/assignments/:courseCode', getBatchSpecificAssignments);
router.post('/assignments', require('../controllers/hodController').uploadAssignments);

module.exports = router; 