module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/integration/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['@babel/preset-env', '@babel/preset-react'] }]
  },
  testTimeout: 60000, // Increased timeout for integration tests
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'lib/**/*.js',
    'pages/api/**/*.js',
    'models/**/*.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  maxWorkers: 1 // Run tests sequentially to avoid port conflicts
}; 