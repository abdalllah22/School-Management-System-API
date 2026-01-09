/**
 * Test Setup - Runs before all tests
 * 
 * This file:
 * 1. Sets up in-memory MongoDB for isolated testing
 * 2. Connects to test database
 * 3. Cleans up after tests
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

/**
 * Connect to in-memory database before all tests
 */
beforeAll(async () => {
  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect mongoose to in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log('🧪 Test database connected');
});

/**
 * Clear all collections after each test
 * Ensures tests don't interfere with each other
 */
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

/**
 * Disconnect and stop MongoDB after all tests
 */
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('🧪 Test database disconnected');
});

/**
 * Suppress console output during tests (optional)
 */
global.console = {
  ...console,
  // Uncomment to suppress logs during tests
  // log: jest.fn(),
  // error: jest.fn(),
  // warn: jest.fn(),
};
