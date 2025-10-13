// tests/setup.js
// Налаштування для Jest тестів

// Мокаємо fetch для тестів API
global.fetch = jest.fn();

// Мокаємо localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Мокаємо sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Мокаємо console для чистих тестів (опціонально)
// const originalConsole = global.console;
// global.console = {
//   ...originalConsole,
//   log: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn()
// };