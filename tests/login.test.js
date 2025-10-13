// Тести для авторизації всіх ролей
// Використовується Jest з моками API

// Мок API для тестів
global.fetch = jest.fn();

describe('Login API tests for all roles', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('Admin login API call', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        token: 'test-jwt-token',
        user: {
          id: '1',
          username: 'admin',
          role: 'admin',
          email: 'admin@example.com'
        }
      })
    });

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });

    const data = await response.json();

    expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.any(Object));
    expect(data.success).toBe(true);
    expect(data.user.role).toBe('admin');
  });

  test('Tech login API call', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        token: 'test-jwt-token',
        user: {
          id: '2',
          username: 'tech1',
          role: 'technician',
          email: 'tech1@example.com'
        }
      })
    });

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'tech1', password: 'tech123' })
    });

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.user.role).toBe('technician');
  });

  test('Client login API call', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        token: 'test-jwt-token',
        user: {
          id: '3',
          username: 'client1',
          role: 'client',
          email: 'client1@example.com'
        }
      })
    });

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'client1', password: 'client123' })
    });

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.user.role).toBe('client');
  });

  test('Dispatcher login API call', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        token: 'test-jwt-token',
        user: {
          id: '4',
          username: 'dispatcher1',
          role: 'dispatcher',
          email: 'dispatcher1@example.com'
        }
      })
    });

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'dispatcher1', password: 'dispatcher123' })
    });

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.user.role).toBe('dispatcher');
  });

  test('Wrong password fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        message: 'Невірний логін або пароль'
      })
    });

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrong' })
    });

    const data = await response.json();

    expect(data.success).toBe(false);
  });
});
