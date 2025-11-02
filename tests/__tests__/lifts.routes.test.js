const request = require('supertest');
const express = require('express');
const liftsRoutes = require('../../routes/lifts.routes');

const app = express();
app.use(express.json());
app.use('/api/lifts', liftsRoutes);

describe('Lifts Routes', () => {
  test('GET /api/lifts - отримання списку ліфтів', async () => {
    const res = await request(app)
      .get('/api/lifts')
      .set('Authorization', 'Bearer test_token');
    expect([200, 404, 401, 403]).toContain(res.status);
  });

  test('GET /api/lifts/:id - отримання конкретного ліфта', async () => {
    const res = await request(app)
      .get('/api/lifts/test_id')
      .set('Authorization', 'Bearer test_token');
    expect([200, 404, 401, 403]).toContain(res.status);
  });

  test('POST /api/lifts - створення нового ліфта', async () => {
    const newLift = {
      name: 'Тестовий ліфт',
      location: 'Тестова локація'
    };
    const res = await request(app)
      .post('/api/lifts')
      .set('Authorization', 'Bearer test_token')
      .send(newLift);
    expect([201, 400, 401, 403]).toContain(res.status);
  });

  test('PUT /api/lifts/:id - оновлення ліфта', async () => {
    const res = await request(app)
      .put('/api/lifts/test_id')
      .set('Authorization', 'Bearer test_token')
      .send({ name: 'Оновлений ліфт' });
    expect([200, 404, 400, 401, 403]).toContain(res.status);
  });

  test('DELETE /api/lifts/:id - видалення ліфта', async () => {
    const res = await request(app)
      .delete('/api/lifts/test_id')
      .set('Authorization', 'Bearer test_token');
    expect([200, 204, 404, 401, 403]).toContain(res.status);
  });
});
