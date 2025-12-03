const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'hod', 'faculty', 'timetable_coordinator'],
    required: true
  },
  department: {
    type: String,
    required: true
  },
  subjects: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  userId: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema); 