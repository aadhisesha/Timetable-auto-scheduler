const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get dashboard statistics
router.get('/stats', dashboardController.getDashboardStats);

// Get recent activity
router.get('/recent-activity', dashboardController.getRecentActivity);

module.exports = router; 