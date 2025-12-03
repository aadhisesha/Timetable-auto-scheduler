const mongoose = require('mongoose');

const workloadSchema = new mongoose.Schema({
  faculty: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Faculty', 
    required: true 
  },
  course: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true 
  },
  role: {
    type: String,
    required: true,
    enum: ['Theory', 'Lab (I/C)', 'Lab (A)']
  },
  freeHours: {
    Monday: { FN: Boolean, AN: Boolean },
    Tuesday: { FN: Boolean, AN: Boolean },
    Wednesday: { FN: Boolean, AN: Boolean },
    Thursday: { FN: Boolean, AN: Boolean },
    Friday: { FN: Boolean, AN: Boolean }
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure a faculty member can only be assigned a specific role for a course once
workloadSchema.index({ faculty: 1, course: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('Workload', workloadSchema); 