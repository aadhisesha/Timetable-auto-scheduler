const SubjectMapping = require('../models/SubjectMapping');
const User = require('../models/User');
const Course = require('../models/Course');

// Create a single subject mapping
exports.createSubjectMapping = async (req, res) => {
  try {
    const { mappings } = req.body;

    // Handle both single mapping and array of mappings
    if (!Array.isArray(mappings)) {
      return res.status(400).json({ error: 'Mappings should be an array' });
    }

    if (mappings.length === 0) {
      return res.status(400).json({ error: 'Mappings array cannot be empty' });
    }

    const results = { successful: 0, failed: 0, errors: [] };

    for (const mapping of mappings) {
      try {
        const { facultyId, courseCode, role } = mapping;

        // Validate faculty exists with this csXXX ID
        const faculty = await User.findOne({ userId: facultyId, role: 'faculty' });
        if (!faculty) {
          results.failed++;
          results.errors.push(`Faculty with ID ${facultyId} not found`);
          continue;
        }

        // Validate course exists with this course code
        const course = await Course.findOne({ code: courseCode });
        if (!course) {
          results.failed++;
          results.errors.push(`Course with code ${courseCode} not found`);
          continue;
        }

        // Check if mapping already exists
        const existingMapping = await SubjectMapping.findOne({
          facultyId,
          courseCode,
          role
        });

        if (existingMapping) {
          results.failed++;
          results.errors.push(`Mapping ${facultyId}-${courseCode}-${role} already exists`);
          continue;
        }

        // Create new mapping
        const newMapping = new SubjectMapping({
          facultyId,
          courseCode,
          role
        });

        await newMapping.save();
        results.successful++;
      } catch (err) {
        results.failed++;
        results.errors.push(err.message);
      }
    }

    res.status(201).json(results);
  } catch (error) {
    console.error('Error creating subject mappings:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create multiple subject mappings
exports.bulkCreateSubjectMappings = async (req, res) => {
  try {
    const { mappings } = req.body;

    if (!Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({ error: 'Mappings array is required and cannot be empty' });
    }

    const results = { successful: 0, failed: 0, errors: [] };

    for (const mapping of mappings) {
      try {
        const { facultyId, courseCode, role } = mapping;

        // Validate faculty exists
        const faculty = await User.findOne({ userId: facultyId, role: 'faculty' });
        if (!faculty) {
          results.failed++;
          results.errors.push(`Faculty with ID ${facultyId} not found`);
          continue;
        }

        // Validate course exists
        const course = await Course.findOne({ code: courseCode });
        if (!course) {
          results.failed++;
          results.errors.push(`Course with code ${courseCode} not found`);
          continue;
        }

        // Check if mapping already exists
        const existingMapping = await SubjectMapping.findOne({
          facultyId,
          courseCode,
          role
        });

        if (existingMapping) {
          results.failed++;
          results.errors.push(`Mapping ${facultyId}-${courseCode}-${role} already exists`);
          continue;
        }

        // Create new mapping
        const newMapping = new SubjectMapping({
          facultyId,
          courseCode,
          role
        });

        await newMapping.save();
        results.successful++;
      } catch (err) {
        results.failed++;
        results.errors.push(err.message);
      }
    }

    res.status(200).json(results);
  } catch (error) {
    console.error('Error bulk creating subject mappings:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all subject mappings
exports.getAllSubjectMappings = async (req, res) => {
  try {
    const mappings = await SubjectMapping.find({}).sort({ createdAt: -1 });
    res.status(200).json({ mappings });
  } catch (error) {
    console.error('Error fetching subject mappings:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get subject mappings for a specific faculty
exports.getSubjectMappingsByFaculty = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const mappings = await SubjectMapping.find({ facultyId }).sort({ createdAt: -1 });
    res.status(200).json({ mappings });
  } catch (error) {
    console.error('Error fetching subject mappings for faculty:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get subject mappings for a specific course
exports.getSubjectMappingsByCourse = async (req, res) => {
  try {
    const { courseCode } = req.params;

    const mappings = await SubjectMapping.find({ courseCode }).sort({ createdAt: -1 });
    res.status(200).json({ mappings });
  } catch (error) {
    console.error('Error fetching subject mappings for course:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update a subject mapping
exports.updateSubjectMapping = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const mapping = await SubjectMapping.findByIdAndUpdate(
      id,
      { role, updatedAt: new Date() },
      { new: true }
    );

    if (!mapping) {
      return res.status(404).json({ error: 'Subject mapping not found' });
    }

    res.status(200).json({ message: 'Subject mapping updated', mapping });
  } catch (error) {
    console.error('Error updating subject mapping:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a subject mapping
exports.deleteSubjectMapping = async (req, res) => {
  try {
    const { id } = req.params;

    const mapping = await SubjectMapping.findByIdAndDelete(id);

    if (!mapping) {
      return res.status(404).json({ error: 'Subject mapping not found' });
    }

    res.status(200).json({ message: 'Subject mapping deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject mapping:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete all subject mappings
exports.deleteAllSubjectMappings = async (req, res) => {
  try {
    const result = await SubjectMapping.deleteMany({});
    res.status(200).json({ message: `Deleted ${result.deletedCount} subject mappings` });
  } catch (error) {
    console.error('Error deleting all subject mappings:', error);
    res.status(500).json({ error: error.message });
  }
};
