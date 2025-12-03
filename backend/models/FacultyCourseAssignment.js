const mongoose = require('mongoose');

const FacultyCourseAssignmentSchema = new mongoose.Schema({
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true
  },
  facultyName: {
    type: String,
    required: true
  },
  courseCode: {
    type: String,
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  semester: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['Theory Teacher', 'Lab Incharge', 'Lab Assistant'],
    required: true
  },
  batch: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  courseType: {
    type: String,
    enum: ['UG', 'PG'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for efficient querying
FacultyCourseAssignmentSchema.index({ courseCode: 1 });
FacultyCourseAssignmentSchema.index({ courseName: 1 });
FacultyCourseAssignmentSchema.index({ role: 1 });
FacultyCourseAssignmentSchema.index({ batch: 1 });
FacultyCourseAssignmentSchema.index({ facultyId: 1 });
FacultyCourseAssignmentSchema.index({ facultyName: 1 });
FacultyCourseAssignmentSchema.index({ semester: 1 });
FacultyCourseAssignmentSchema.index({ department: 1 });

// Compound indexes for common queries
FacultyCourseAssignmentSchema.index({ facultyId: 1, courseCode: 1 });
FacultyCourseAssignmentSchema.index({ facultyId: 1, batch: 1 });
FacultyCourseAssignmentSchema.index({ courseCode: 1, batch: 1 });
FacultyCourseAssignmentSchema.index({ facultyId: 1, semester: 1 });

module.exports = mongoose.model('FacultyCourseAssignment', FacultyCourseAssignmentSchema); 