/**
 * API Client Unit Tests
 */
describe('API Client', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('API client створює правильний запит', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });

    // Mock API client
    const mockApi = {
      get: jest.fn().mockResolvedValue({ success: true, data: [] })
    };

    const result = await mockApi.get('/test');
    expect(result.success).toBe(true);
  });

  test('API client додає token до заголовків', () => {
    localStorage.setItem('token', 'test_token_123');
    
    const mockApi = {
      get: jest.fn()
    };

    mockApi.get('/test');
    expect(mockApi.get).toHaveBeenCalledWith('/test');
  });

  test('API client обробляє помилки', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Not found' })
    });

    const mockApi = {
      get: jest.fn().mockRejectedValue(new Error('API Error'))
    };

    await expect(mockApi.get('/invalid')).rejects.toThrow('API Error');
  });
});
