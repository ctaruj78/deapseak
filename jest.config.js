module.exports = {
  testEnvironment: 'node',
  
  // Використовуємо babel-jest для транспіляції
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  
  // Тестуємо тільки backend код
  testMatch: [
    '**/tests/__tests__/**/*.test.js',
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js'
  ],
  
  // Ігноруємо frontend і node_modules
  testPathIgnorePatterns: [
    '/node_modules/',
    '/assets/',
    '/public/',
    '/plugins/'
  ],
  
  // Coverage тільки для backend
  collectCoverageFrom: [
    'routes/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    'controllers/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/assets/**',
    '!**/public/**',
    '!**/plugins/**',
    '!**/tests/**'
  ],
  
  coverageDirectory: 'coverage',
  
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30
    }
  },
  
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 10000,
  verbose: true,
  
  // Додаємо підтримку ES modules
  moduleFileExtensions: ['js', 'json', 'node']
};
