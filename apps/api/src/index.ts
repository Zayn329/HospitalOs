import { app } from './app.js';
import { config } from './config/env.js';
import { connectDatabase } from './config/db.js';
import { User } from './models/User.js';
import { Doctor } from './models/Doctor.js';
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

/**
 * Seed demo doctors into the database.
 */
const seedDemoDoctors = async () => {
  try {
    const doctorCount = await Doctor.countDocuments();
    if (doctorCount === 0) {
      console.log('Seeding demo doctors to MongoDB...');
      
      const demoDoctors = [
        {
          firstName: 'John',
          lastName: 'Adams',
          specialization: 'Cardiology',
          department: 'Cardiovascular Medicine',
          experience: 12,
          availability: ["09:00", "10:00", "11:00", "14:00", "15:00"],
          consultationFee: 150,
          status: 'active'
        },
        {
          firstName: 'Emily',
          lastName: 'Smith',
          specialization: 'Pediatrics',
          department: 'Pediatric Care',
          experience: 8,
          availability: ["09:00", "10:00", "11:00", "14:00", "15:00"],
          consultationFee: 120,
          status: 'active'
        },
        {
          firstName: 'David',
          lastName: 'Miller',
          specialization: 'General Medicine',
          department: 'Outpatient Clinic',
          experience: 15,
          availability: ["09:00", "10:00", "11:00", "14:00", "15:00"],
          consultationFee: 80,
          status: 'active'
        }
      ];

      await Doctor.insertMany(demoDoctors);
      console.log('Demo doctors seeded successfully!');
    }
  } catch (error) {
    console.error('Failed to seed demo doctors:', error);
  }
};

const startServer = async () => {
  try {
    await connectDatabase();
    await seedDemoUsers();
    await seedDemoDoctors();
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
