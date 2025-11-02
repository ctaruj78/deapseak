// server-upload.js
// Сервер для прийому та зберігання файлів (Node.js + Express + multer)

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

app.post('/api/upload', upload.array('files', 5), (req, res) => {
  if (!req.files) return res.status(400).json({ error: 'No files uploaded' });
  const fileInfos = req.files.map(f => ({
    filename: f.filename,
    url: `/` + f.filename
  }));
  res.json({ files: fileInfos });
});

app.listen(PORT, () => {
  // logger.log(`Upload server running on http://localhost:${PORT}`);
});
