const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  semester: {
    type: String,
    required: true,
  },
  batch: {
    type: String,
    required: true,
    trim: true,
  },
  timetable: {
    type: Object,
    required: true,
    default: {},
  },
}, {
  timestamps: true,
});

timetableSchema.index({ semester: 1, batch: 1 }, { unique: true });

const Timetable = mongoose.model('Timetable', timetableSchema);

module.exports = Timetable; 