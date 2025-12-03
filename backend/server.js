const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const dashboardRoutes = require('./routes/dashboardRoutes');
const courseRoutes = require('./routes/courseRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const hodRoutes = require('./routes/hodRoutes');
const timetableCoordinatorRoutes = require('./routes/timetableCoordinatorRoutes');

// Load environment variables first
dotenv.config();

// Set default values for environment variables
process.env.PORT = process.env.PORT || 5000;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production';

// Create Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use("/api", require("./routes/upload"));

// Routes
app.use('/api/courses', courseRoutes);
app.use('/api/faculties', facultyRoutes);
app.use('/api/timetables', timetableRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/timetable-coordinator', timetableCoordinatorRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Timetable Management API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 