module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.integration.test.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  testTimeout: 30000, // Increased timeout for integration tests
}; 