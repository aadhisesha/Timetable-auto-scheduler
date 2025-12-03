const mongoose = require('mongoose');
const Faculty = require('../models/Faculty');
const Course = require('../models/Course');
const FacultyCourseAssignment = require('../models/FacultyCourseAssignment');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/timetable_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function populateFacultyAssignments() {
  try {
    console.log('Starting to populate FacultyCourseAssignment collection...');
    
    // Clear existing assignments
    await FacultyCourseAssignment.deleteMany({});
    console.log('Cleared existing assignments');
    
    const faculty = await Faculty.find({});
    console.log(`Found ${faculty.length} faculty members`);
    
    let totalAssignments = 0;
    let errors = 0;
    
    for (const fac of faculty) {
      if (fac.courseHandled && fac.courseHandled.length > 0) {
        for (const course of fac.courseHandled) {
          try {
            // Get course details from Course collection
            const courseDoc = await Course.findOne({ code: course.courseCode });
            
            if (courseDoc) {
              const assignment = new FacultyCourseAssignment({
                facultyId: fac._id,
                facultyName: fac.name,
                courseCode: course.courseCode,
                courseName: courseDoc.name,
                semester: courseDoc.semester,
                role: course.role,
                batch: course.batch,
                department: courseDoc.department,
                courseType: courseDoc.type
              });
              
              await assignment.save();
              totalAssignments++;
              console.log(`✓ Added assignment: ${fac.name} - ${course.courseCode} (${course.role})`);
            } else {
              console.warn(`⚠ Course not found for code: ${course.courseCode}`);
              errors++;
            }
          } catch (error) {
            console.error(`✗ Error processing assignment for ${fac.name} - ${course.courseCode}:`, error.message);
            errors++;
          }
        }
      }
    }
    
    console.log('\n=== Population Summary ===');
    console.log(`Total faculty processed: ${faculty.length}`);
    console.log(`Total assignments created: ${totalAssignments}`);
    console.log(`Errors encountered: ${errors}`);
    console.log('========================\n');
    
    // Verify the data
    const totalAssignmentsInDB = await FacultyCourseAssignment.countDocuments();
    console.log(`Total assignments in database: ${totalAssignmentsInDB}`);
    
    // Show some sample data
    const sampleAssignments = await FacultyCourseAssignment.find().limit(5);
    console.log('\nSample assignments:');
    sampleAssignments.forEach(assignment => {
      console.log(`- ${assignment.facultyName}: ${assignment.courseCode} (${assignment.role}) - ${assignment.batch}`);
    });
    
  } catch (error) {
    console.error('Error populating faculty assignments:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the script
populateFacultyAssignments(); 