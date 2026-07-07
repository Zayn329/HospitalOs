import { app } from './app.js';
import { config } from './config/env.js';
import { connectDatabase } from './config/db.js';
import { User } from './models/User.js';
import { hashPassword } from './utils/auth.js';

/**
 * Seed demo user accounts into the database for testing and hackathon review.
 */
const seedDemoUsers = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Seeding demo accounts to MongoDB...');
      
      const demoUsers = [
        {
          firstName: 'Sarah',
          lastName: 'Receptionist',
          email: 'receptionist@hospitalos.com',
          passwordHash: hashPassword('receptionist123'),
          role: 'receptionist',
          status: 'active'
        },
        {
          firstName: 'Robert',
          lastName: 'Administrator',
          email: 'admin@hospitalos.com',
          passwordHash: hashPassword('admin123'),
          role: 'administrator',
          status: 'active'
        }
      ];

      await User.insertMany(demoUsers);
      console.log('Demo accounts seeded successfully: receptionist@hospitalos.com, admin@hospitalos.com');
    }
  } catch (error) {
    console.error('Failed to seed demo accounts:', error);
  }
};

const startServer = async () => {
  try {
    await connectDatabase();
    await seedDemoUsers();
  } catch (error) {
    console.warn('MongoDB connection failed on start. Server will continue running.');
  }

  app.listen(config.port, () => {
    console.log(`Express API running on port ${config.port} in ${config.nodeEnv} mode`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
