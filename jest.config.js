module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Coverage configuration
  collectCoverageFrom: [
    'managers/**/*.js',
    'libs/cortex.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],

  // Coverage thresholds
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Test match patterns - UNIT TESTS ONLY
  testMatch: [
    '**/tests/unit/**/*.test.js'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  
  // Reset mocks
  resetMocks: true,
  
  // Restore mocks
  restoreMocks: true
};
