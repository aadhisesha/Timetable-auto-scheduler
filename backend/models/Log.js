const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  role: { type: String, required: true }, // e.g., 'Admin', 'HOD', 'Coordinator'
  action: { type: String, required: true }, // description of the change made
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', LogSchema); 