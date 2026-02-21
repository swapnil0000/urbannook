/**
 * Test Setup File
 * Handles MongoDB connection for tests
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  try {
    // Create an in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
    });
    
    console.log('[TEST] Connected to in-memory MongoDB');
  } catch (error) {
    console.error('[TEST ERROR] Failed to connect to MongoDB:', error);
    throw error;
  }
});

// Cleanup after each test
afterEach(async () => {
  try {
    // Clear all collections after each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  } catch (error) {
    console.error('[TEST ERROR] Failed to clear collections:', error);
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    // Close mongoose connection
    await mongoose.connection.close();
    
    // Stop the in-memory MongoDB server
    if (mongoServer) {
      await mongoServer.stop();
    }
    
    console.log('[TEST] Disconnected from in-memory MongoDB');
  } catch (error) {
    console.error('[TEST ERROR] Failed to disconnect from MongoDB:', error);
  }
});
