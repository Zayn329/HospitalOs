import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDatabase(): Promise<typeof mongoose> {
  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${(error as Error).message}`);
    // We don't crash the server immediately, but we log the error.
    // The healthcheck will reflect the DOWN state.
    throw error;
  }
}

export function getDbConnectionStatus(): boolean {
  return mongoose.connection.readyState === 1;
}
