// Mock localStorage для Node.js тестів
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock fetch для тестів
global.fetch = jest.fn();
