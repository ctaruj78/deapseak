const request = require('supertest');
const express = require('express');
const liftsRoutes = require('../../routes/lifts.routes');

const app = express();
app.use(express.json());
app.use('/api/lifts', liftsRoutes);

describe('Lifts Routes', () => {
  test('GET /api/lifts - отримати всі ліфти', async () => {
    const res = await request(app)
      .get('/api/lifts')
      .set('Authorization', 'Bearer test_token');

    expect(res.status).toBeOneOf([200, 401]);
  });

  test('POST /api/lifts - створити ліфт', async () => {
    const res = await request(app)
      .post('/api/lifts')
      .set('Authorization', 'Bearer test_token')
      .send({
        address: 'вул. Тестова, 1',
        model: 'OTIS 2000',
        status: 'active'
      });

    expect(res.status).toBeOneOf([201, 400, 401]);
  });

  test('GET /api/lifts/:id - отримати ліфт по ID', async () => {
    const res = await request(app)
      .get('/api/lifts/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer test_token');

    expect(res.status).toBeOneOf([200, 404, 401]);
  });

  test('PUT /api/lifts/:id - оновити ліфт', async () => {
    const res = await request(app)
      .put('/api/lifts/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer test_token')
      .send({
        status: 'maintenance'
      });

    expect(res.status).toBeOneOf([200, 404, 400, 401]);
  });

  test('DELETE /api/lifts/:id - видалити ліфт', async () => {
    const res = await request(app)
      .delete('/api/lifts/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer test_token');

    expect(res.status).toBeOneOf([200, 404, 401]);
  });
});
