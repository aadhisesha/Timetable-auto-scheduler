const mongoose = require('mongoose');

const SubjectMappingSchema = new mongoose.Schema({
  facultyId: {
    type: String, // csXXX format
    required: true
  },
  courseCode: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['Theory Teacher', 'Lab Incharge', 'Lab Assistant'],
    required: true
  },
  batch: {
    type: String, // String or single char (e.g., 'N', 'P', 'Q', 'PG', etc.)
    default: ''
  },
  semester: {
    type: String,
    default: ''
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
});

// Pre-save hook to ensure batch, semester, and courseType are always strings
SubjectMappingSchema.pre('save', function(next) {
  // Always ensure batch and semester are strings
  if (this.batch === null || this.batch === undefined) {
    this.batch = '';
  } else {
    this.batch = String(this.batch).trim();
  }
  
  if (this.semester === null || this.semester === undefined) {
    this.semester = '';
  } else {
    this.semester = String(this.semester).trim();
  }
  
  // Ensure courseType is uppercase
  if (this.courseType) {
    this.courseType = String(this.courseType).trim().toUpperCase();
  }
  
  this.updatedAt = Date.now();
  next();
});

// Compound unique index to prevent duplicate mappings based on faculty+role+batch+semester
SubjectMappingSchema.index({ facultyId: 1, courseCode: 1, role: 1, batch: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('SubjectMapping', SubjectMappingSchema);
