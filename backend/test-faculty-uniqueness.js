const mongoose = require('mongoose');
const Faculty = require('./models/Faculty');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/timetable_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testFacultyUniqueness() {
  try {
    console.log('Testing faculty uniqueness and course assignment combination...\n');
    
    // Fetch all faculties
    const allFaculties = await Faculty.find({});
    console.log(`Total faculty records: ${allFaculties.length}`);
    
    // Group by name to check for duplicates
    const facultyGroups = {};
    allFaculties.forEach(faculty => {
      const name = faculty.name.trim();
      if (!facultyGroups[name]) {
        facultyGroups[name] = [];
      }
      facultyGroups[name].push(faculty);
    });
    
    // Check for duplicates
    const duplicates = Object.entries(facultyGroups).filter(([name, records]) => records.length > 1);
    
    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} faculty names with multiple records:`);
      duplicates.forEach(([name, records]) => {
        console.log(`\nFaculty: "${name}" (${records.length} records)`);
        records.forEach((record, index) => {
          console.log(`  Record ${index + 1}:`);
          console.log(`    ID: ${record._id}`);
          console.log(`    Course assignments: ${record.courseHandled ? record.courseHandled.length : 0}`);
          if (record.courseHandled && record.courseHandled.length > 0) {
            record.courseHandled.forEach(course => {
              console.log(`      - ${course.courseCode} (${course.role}) - Batch: ${course.batch}`);
            });
          }
        });
        
        // Simulate the combination logic
        const combinedCourseHandled = [];
        records.forEach(record => {
          if (record.courseHandled && record.courseHandled.length > 0) {
            combinedCourseHandled.push(...record.courseHandled);
          }
        });
        
        console.log(`\n  Combined course assignments (${combinedCourseHandled.length} total):`);
        combinedCourseHandled.forEach(course => {
          console.log(`    - ${course.courseCode} (${course.role}) - Batch: ${course.batch}`);
        });
      });
    } else {
      console.log('No duplicate faculty names found.');
    }
    
    // Show unique faculty names
    const uniqueNames = Object.keys(facultyGroups);
    console.log(`\nUnique faculty names (${uniqueNames.length}):`);
    uniqueNames.forEach(name => {
      const records = facultyGroups[name];
      const totalCourses = records.reduce((sum, record) => {
        return sum + (record.courseHandled ? record.courseHandled.length : 0);
      }, 0);
      console.log(`  - ${name} (${records.length} records, ${totalCourses} total course assignments)`);
    });
    
  } catch (error) {
    console.error('Error testing faculty uniqueness:', error);
  } finally {
    mongoose.connection.close();
  }
}

testFacultyUniqueness(); 