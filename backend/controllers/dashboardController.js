const Course = require('../models/Course');
const Timetable = require('../models/Timetable');
const User = require('../models/User');

const dashboardController = {
  getDashboardStats: async (req, res) => {
    try {
      const [
        totalCourses,
        activeTimetables,
        pendingApprovals,
        totalFaculty
      ] = await Promise.all([
        Course.countDocuments(),
        Timetable.countDocuments({ status: 'active' }),
        Timetable.countDocuments({ status: 'pending' }),
        User.countDocuments({ role: 'faculty' })
      ]);

      res.json({
        totalCourses,
        activeTimetables,
        pendingApprovals,
        totalFaculty
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Error fetching dashboard statistics' });
    }
  },

  getRecentActivity: async (req, res) => {
    try {
      const recentTimetables = await Timetable.find()
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate('createdBy', 'name');

      const recentCourses = await Course.find()
        .sort({ updatedAt: -1 })
        .limit(5);

      const activities = [
        ...recentTimetables.map(timetable => ({
          type: 'timetable',
          action: 'updated',
          title: timetable.name,
          user: timetable.createdBy.name,
          timestamp: timetable.updatedAt
        })),
        ...recentCourses.map(course => ({
          type: 'course',
          action: 'updated',
          title: course.name,
          timestamp: course.updatedAt
        }))
      ].sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

      res.json(activities);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      res.status(500).json({ message: 'Error fetching recent activity' });
    }
  }
};

module.exports = dashboardController; 