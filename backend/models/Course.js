const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  credits: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  type: {
    type: String,
    required: true,
    enum: ['UG', 'PG'],
    default: 'UG'
  },
  category: {
    type: String,
    required: true,
    enum: ['Theory', 'Lab Integrated Theory', 'Lab'],
    default: 'Theory'
  },
  department: {
    type: String,
    required: true,
    enum: ['CSE', 'ECE', 'MECH', 'CIVIL', 'MATHEMATICS', 'PHYSICS', 'CHEMISTRY']
  },
  semester: {
    type: String,
    required: true,
    enum: [
      '1', '2', '3', '4', '5', '6', '7', '8', // UG
      'SEM-1', 'SEM-2',
      'SEM-3', 'SEM-4' // PG
    ]
  },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  batches: {
    type: Number,
    required: true,
    min: 1
  }
}, {
  timestamps: true
});

// Create index for efficient querying
courseSchema.index({ code: 1 }, { unique: true });

const Course = mongoose.model('Course', courseSchema);

module.exports = Course; 