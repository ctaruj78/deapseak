const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Базові маршрути
app.get('/api/status', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'Тестовий маршрут працює' });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Простий API сервер запущено на http://0.0.0.0:${PORT}`);
});
