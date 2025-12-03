const mongoose = require('mongoose');

const roomAllocationSchema = new mongoose.Schema({
  courseType: {
    type: String,
    enum: ['UG', 'PG'],
    required: true
  },
  semester: {
    type: String,
    required: true
  },
  semesterType: {
    type: String,
    enum: ['Odd', 'Even'],
    required: true
  },
  batch: {
    type: String,
    required: false // optional for PG
  },
  room: {
    type: String,
    required: true
  },
  assignedBy: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Prevent duplicate room assignment for the same semester, semesterType, and room
// roomAllocationSchema.index({ courseType: 1, semester: 1, semesterType: 1, room: 1 }, { unique: true });

module.exports = mongoose.model('RoomAllocation', roomAllocationSchema); 