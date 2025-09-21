const { JSDOM } = require('jsdom');

// Мок localStorage для тестів
global.localStorage = (() => {
  let store = {};
  return {
    getItem: key => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: key => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

describe('Login simulation for all roles', () => {
  beforeEach(() => {
    localStorage.clear();
    // Ініціалізуємо тестових користувачів
    localStorage.setItem('lm_users', JSON.stringify([
      {
        id: 1,
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        isActive: true,
        firstName: 'Адміністратор',
        email: 'admin@liftmaster.com'
      },
      {
        id: 2,
        username: 'tech1',
        password: 'tech123',
        role: 'tech',
        isActive: true,
        firstName: 'Іван',
        email: 'tech1@liftmaster.com'
      },
      {
        id: 3,
        username: 'client1',
        password: 'client123',
        role: 'client',
        isActive: true,
        firstName: 'Петро',
        email: 'client1@liftmaster.com'
      },
      {
        id: 4,
        username: 'dispatcher1',
        password: 'dispatcher123',
        role: 'dispatcher',
        isActive: true,
        firstName: 'Олег',
        email: 'dispatcher1@liftmaster.com'
      }
    ]));
  });

  const AuthManager = require('../assets/js/auth.js');

  test('Admin login works', async () => {
    const auth = new AuthManager({ isTest: true });
    const user = await auth.authenticate('admin', 'admin123');
    expect(user).toBeDefined();
    expect(user.role).toBe('admin');
    await auth.createSession(user, false);
    expect(JSON.parse(localStorage.getItem('currentUser')).role).toBe('admin');
    expect(localStorage.getItem('auth_token')).toBe('test-token');
  });

  test('Tech login works', async () => {
    const auth = new AuthManager({ isTest: true });
    const user = await auth.authenticate('tech1', 'tech123');
    expect(user).toBeDefined();
    expect(user.role).toBe('tech');
    await auth.createSession(user, false);
    expect(JSON.parse(localStorage.getItem('currentUser')).role).toBe('tech');
    expect(localStorage.getItem('auth_token')).toBe('test-token');
  });

  test('Client login works', async () => {
    const auth = new AuthManager({ isTest: true });
    const user = await auth.authenticate('client1', 'client123');
    expect(user).toBeDefined();
    expect(user.role).toBe('client');
    await auth.createSession(user, false);
    expect(JSON.parse(localStorage.getItem('currentUser')).role).toBe('client');
    expect(localStorage.getItem('auth_token')).toBe('test-token');
  });
  test('Dispatcher login works', async () => {
    const auth = new AuthManager({ isTest: true });
    const user = await auth.authenticate('dispatcher1', 'dispatcher123');
    expect(user).toBeDefined();
    expect(user.role).toBe('dispatcher');
    await auth.createSession(user, false);
    expect(JSON.parse(localStorage.getItem('currentUser')).role).toBe('dispatcher');
    expect(localStorage.getItem('auth_token')).toBe('test-token');
  });

  test('Wrong password fails', async () => {
    const auth = new AuthManager({ isTest: true });
    const user = await auth.authenticate('admin', 'wrong');
    expect(user).toBeUndefined();
  });
});
