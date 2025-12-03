const mongoose = require('mongoose');

const FacultySchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  designation: { type: String, enum: ['Professor', 'Assistant Professor', 'Associate Professor'], required: false },
  preferredCourses: [{ type: String }],
  allocatedCourse: { type: String },
  courseHandled: {
    type: [
      {
        courseCode: { type: String, required: true },
        role: { type: String, enum: ['Theory Teacher', 'Lab Incharge', 'Lab Assistant'], required: true },
        batch: { type: String, required: true }
      }
    ],
    required: true
  },
  freeHours: {
    type: Object, // { Monday: [1,2], Tuesday: [3,4], ... }
    required: false,
    default: {}
  },
  areasOfExpertise: {
    type: [String],
    default: []
  },
  facultyId: {
    type: String,
    required: true,
    unique: true
  },
  dob: {
    type: Date,
    default: null
  },
  dateOfJoining: {
    type: Date,
    default: null
  },
  department: {
    type: String,
    default: ''
  },
  gender: {
    type: String,
    default: ''
  },
  profilePicUrl: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  scaleOfPay: {
    type: String,
    default: ''
  },
  presentPay: {
    type: String,
    default: ''
  },
  natureOfAppointment: {
    type: String,
    enum: ['', 'Temporary', 'Probationer', 'Approved Probationer', 'Permanent'],
    default: ''
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Faculty', FacultySchema); 