const connectDB = require('../config/db');
const Faculty = require('./Faculty');

async function insertTestFaculty() {
  await connectDB();
  try {
    const testFaculty = new Faculty({
      name: 'Dr. Jane Doe',
      phone: '1234567890',
      designation: 'Professor',
      preferredCourses: ['CS201', 'CS202'],
      allocatedCourse: 'CS201',
      courseHandled: [
        { courseCode: 'CS201', role: 'Theory Teacher', batch: 'A' },
        { courseCode: 'CS202', role: 'Lab Incharge', batch: 'B' }
      ],
      freeHours: { Monday: [1,2], Tuesday: [3,4] },
      areasOfExpertise: ['AI', 'ML'],
      facultyId: 'FAC12345',
      dob: new Date('1980-05-15'),
      dateOfJoining: new Date('2010-08-01'),
      department: 'Computer Science',
      gender: 'Female',
      profilePicUrl: 'http://example.com/profile.jpg',
      isActive: true,
      scaleOfPay: 'Level 14',
      presentPay: 'Rs. 1,44,200',
      natureOfAppointment: 'Permanent'
    });
    await testFaculty.save();
    console.log('Test faculty inserted successfully!');
  } catch (err) {
    console.error('Error inserting test faculty:', err.message);
  } finally {
    process.exit();
  }
}

insertTestFaculty(); 