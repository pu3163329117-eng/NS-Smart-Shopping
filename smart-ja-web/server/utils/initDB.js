const { readJSON, writeJSON } = require('./db');
const { hashPassword } = require('./auth');

const initDB = async () => {
  console.log('Starting initDB...');
  try {
    const services = readJSON('services');
    if (services.length === 0) {
      writeJSON('services', [
        {
          id: '1',
          title: '3D Printing Service',
          desc: 'High quality resin printing',
          price: 50,
          image: 'https://picsum.photos/300/200?random=1',
          userId: 'maker1'
        }
      ]);
      console.log('Initialized services');
    }

    const users = readJSON('users');
    if (users.length === 0) {
      const hashedPassword = await hashPassword('password');
      writeJSON('users', [
        {
          id: 'user1',
          email: 'test@example.com',
          password: hashedPassword, // Hashed password
          username: 'Test User',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Test'
        }
      ]);
      console.log('Initialized users');
    }
    console.log('Finished initDB');
  } catch (error) {
    console.error('Error in initDB:', error);
    throw error;
  }
};

module.exports = initDB;
