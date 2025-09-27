// server-chat.js
// Простий сервер для чату (Node.js + Express)

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Тимчасове зберігання повідомлень у пам'яті
let messages = [];

// Отримати всі повідомлення
app.get('/api/chat', (req, res) => {
  res.json(messages);
});

// Додати нове повідомлення
app.post('/api/chat', (req, res) => {
  const { sender, text, role } = req.body;
  if (!sender || !text || !role) {
    return res.status(400).json({ error: 'Всі поля обовʼязкові' });
  }
  const msg = {
    sender,
    text,
    role,
    timestamp: Date.now()
  };
  messages.push(msg);
  res.json(msg);
});

// Очистити всі повідомлення (для тесту)
app.delete('/api/chat', (req, res) => {
  messages = [];
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Chat server running on http://localhost:${PORT}`);
});
