const Log = require('../models/Log');

async function createLog(userEmail, role, action) {
  try {
    const logEntry = new Log({ userEmail, role, action });
    await logEntry.save();
  } catch (error) {
    console.error('Error saving log:', error);
  }
}

module.exports = { createLog }; 