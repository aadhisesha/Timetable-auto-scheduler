const connectDB = require('../config/db');
const User = require('./User');

async function insertTestUser() {
  await connectDB();
  try {
    const testUser = new User({
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'testpassword',
      role: 'faculty',
      department: 'Computer Science',
      subjects: ['CS101', 'CS102'],
      status: 'active',
      userId: 'testuser001'
    });
    await testUser.save();
    console.log('Test user inserted successfully!');
  } catch (err) {
    console.error('Error inserting test user:', err.message);
  } finally {
    process.exit();
  }
}

insertTestUser(); 