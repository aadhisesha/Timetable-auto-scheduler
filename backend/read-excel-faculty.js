const XLSX = require('xlsx');
const path = require('path');

async function readExcelFacultyData() {
  try {
    console.log('Reading Excel file for faculty data...\n');
    
    const filePath = path.join(__dirname, 'uploads', 'Subject_Alotted_Final.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    console.log(`Total rows in Excel: ${data.length}`);
    console.log('\nFirst 5 rows:');
    data.slice(0, 5).forEach((row, index) => {
      console.log(`Row ${index + 1}:`, row);
    });
    
    // Check for faculty-related columns
    const firstRow = data[0];
    if (firstRow) {
      console.log('\nAvailable columns:');
      Object.keys(firstRow).forEach(key => {
        console.log(`  - ${key}`);
      });
    }
    
    // Look for faculty names
    const facultyNames = new Set();
    data.forEach(row => {
      // Look for common faculty name columns
      const possibleNameFields = ['Faculty', 'Faculty Name', 'Teacher', 'Teacher Name', 'Name', 'FacultyName'];
      possibleNameFields.forEach(field => {
        if (row[field] && row[field].toString().trim()) {
          facultyNames.add(row[field].toString().trim());
        }
      });
    });
    
    console.log(`\nFound ${facultyNames.size} unique faculty names:`);
    Array.from(facultyNames).slice(0, 10).forEach(name => {
      console.log(`  - ${name}`);
    });
    if (facultyNames.size > 10) {
      console.log(`  ... and ${facultyNames.size - 10} more`);
    }
    
  } catch (error) {
    console.error('Error reading Excel file:', error);
  }
}

readExcelFacultyData(); 