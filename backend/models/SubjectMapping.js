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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index to prevent duplicate mappings
SubjectMappingSchema.index({ facultyId: 1, courseCode: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('SubjectMapping', SubjectMappingSchema);
