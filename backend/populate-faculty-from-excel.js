const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const Faculty = require('./models/Faculty');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/timetable_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function populateFacultyFromExcel() {
  try {
    console.log('Processing Excel file to populate Faculty collection...\n');
    
    const filePath = path.join(__dirname, 'uploads', 'Subject_Alotted_Final.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    console.log(`Total rows in Excel: ${data.length}`);
    
    // Clear existing faculty data
    await Faculty.deleteMany({});
    console.log('Cleared existing faculty data');
    
    // Process each row starting from row 3 (index 2) to skip headers
    const facultyMap = new Map(); // Map to group faculty by name
    
    for (let i = 2; i < data.length; i++) {
      const row = data[i];
      
      // Skip rows without course code
      if (!row['__EMPTY_1'] || !row['__EMPTY_1'].toString().trim()) {
        continue;
      }
      
      const courseCode = row['__EMPTY_1'].toString().trim();
      const courseName = row['__EMPTY_2'] ? row['__EMPTY_2'].toString().trim() : '';
      const classInfo = row['__EMPTY'] ? row['__EMPTY'].toString().trim() : '';
      
      // Extract faculty names from different columns
      const theoryTeacher = row['__EMPTY_6'] ? row['__EMPTY_6'].toString().trim() : '';
      const labIncharge = row['__EMPTY_7'] ? row['__EMPTY_7'].toString().trim() : '';
      const labAssistant = row['__EMPTY_8'] ? row['__EMPTY_8'].toString().trim() : '';
      
      // Extract batch from class info (e.g., "II Sem M.E CSE/BDA/SE" -> "CSE", "BDA", "SE")
      const batches = [];
      if (classInfo) {
        // Look for batch patterns like CSE, BDA, SE, etc.
        const batchMatch = classInfo.match(/(?:M\.E\s+)?([A-Z]+)(?:\/[A-Z]+)*/);
        if (batchMatch) {
          const batchPart = batchMatch[1];
          if (batchPart.includes('/')) {
            // Split multiple batches
            batches.push(...batchPart.split('/'));
          } else {
            batches.push(batchPart);
          }
        }
      }
      
      // Process theory teacher
      if (theoryTeacher && theoryTeacher !== '-' && theoryTeacher !== '') {
        if (!facultyMap.has(theoryTeacher)) {
          facultyMap.set(theoryTeacher, {
            name: theoryTeacher,
            courseHandled: []
          });
        }
        
        batches.forEach(batch => {
          facultyMap.get(theoryTeacher).courseHandled.push({
            courseCode: courseCode,
            role: 'Theory Teacher',
            batch: batch
          });
        });
      }
      
      // Process lab incharge
      if (labIncharge && labIncharge !== '-' && labIncharge !== '') {
        if (!facultyMap.has(labIncharge)) {
          facultyMap.set(labIncharge, {
            name: labIncharge,
            courseHandled: []
          });
        }
        
        batches.forEach(batch => {
          facultyMap.get(labIncharge).courseHandled.push({
            courseCode: courseCode,
            role: 'Lab Incharge',
            batch: batch
          });
        });
      }
      
      // Process lab assistant
      if (labAssistant && labAssistant !== '-' && labAssistant !== '') {
        if (!facultyMap.has(labAssistant)) {
          facultyMap.set(labAssistant, {
            name: labAssistant,
            courseHandled: []
          });
        }
        
        batches.forEach(batch => {
          facultyMap.get(labAssistant).courseHandled.push({
            courseCode: courseCode,
            role: 'Lab Assistant',
            batch: batch
          });
        });
      }
    }
    
    console.log(`Found ${facultyMap.size} unique faculty members`);
    
    // Save faculty data to database
    let savedCount = 0;
    for (const [name, facultyData] of facultyMap) {
      try {
        const faculty = new Faculty(facultyData);
        await faculty.save();
        savedCount++;
        console.log(`✓ Saved faculty: ${name} (${facultyData.courseHandled.length} course assignments)`);
      } catch (error) {
        console.error(`✗ Error saving faculty ${name}:`, error.message);
      }
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Total faculty saved: ${savedCount}`);
    
    // Verify the data
    const totalFaculty = await Faculty.countDocuments();
    console.log(`Total faculty in database: ${totalFaculty}`);
    
    // Show sample data
    const sampleFaculty = await Faculty.find().limit(3);
    console.log('\nSample faculty data:');
    sampleFaculty.forEach(faculty => {
      console.log(`\n${faculty.name}:`);
      faculty.courseHandled.forEach(course => {
        console.log(`  - ${course.courseCode} (${course.role}) - Batch: ${course.batch}`);
      });
    });
    
  } catch (error) {
    console.error('Error populating faculty from Excel:', error);
  } finally {
    mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

populateFacultyFromExcel(); 