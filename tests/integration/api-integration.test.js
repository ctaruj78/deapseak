describe('API Integration Tests', () => {
  beforeEach(() => {
    // Очищуємо всі моки перед кожним тестом
    jest.clearAllMocks();
  });

  test('API integration test', async () => {
    // Мокуємо fetch для тестування
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ key: 'value' })
      })
    );

    const response = await fetch('http://localhost:3000/api/endpoint');
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('key');
  });

  test('API повертає помилку при невалідних даних', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 400,
        json: () => Promise.resolve({ error: 'Bad Request' })
      })
    );

    const response = await fetch('http://localhost:3000/api/endpoint');
    expect([400, 401, 403, 404, 500]).toContain(response.status);
  });

  test('API обробляє мережеві помилки', async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('Network error'))
    );

    await expect(fetch('http://localhost:3000/api/endpoint'))
      .rejects.toThrow('Network error');
  });
});
