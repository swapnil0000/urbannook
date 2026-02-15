export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/server.js',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 30000, // Increase timeout for E2E tests
};
