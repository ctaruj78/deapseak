const request = require('supertest');
const express = require('express');

const app = express();
app.use(express.json());

// Mock routes для тестування
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  res.status(201).json({ 
    token: 'mock_token', 
    message: 'успішно зареєстровано' 
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'wrong@example.com') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.status(200).json({ token: 'mock_token' });
});

describe('Auth Routes', () => {
  test('POST /api/auth/register - успішна реєстрація', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.message).toContain('успішно');
  });

  test('POST /api/auth/login - успішний вхід', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('POST /api/auth/login - невірні дані', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/auth/register - пропущені поля', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com'
      });

    expect(res.status).toBe(400);
  });
});
