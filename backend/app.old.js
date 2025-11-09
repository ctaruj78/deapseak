require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const winston = require('winston');

const mongoConnect = require('./config/mongo');
const pgConnect = require('./config/postgres');

const technicianRoutes = require('./routes/technician');
const assignmentRoutes = require('./routes/assignment');
const liftRoutes = require('./routes/lift');
const notificationRoutes = require('./routes/notification');

const app = express();
const PORT = process.env.PORT || 3001;

// Winston logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'backend.log' })
  ]
});

// Morgan HTTP request logger
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

app.use(cors());
app.use(bodyParser.json());

app.use('/api/technicians', technicianRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/lifts', liftRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
  logger.info('Root endpoint accessed');
  res.send('Deapseak backend API is running');
});

Promise.all([mongoConnect(), pgConnect()])
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`Backend server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('DB connection error:', err);
    process.exit(1);
  });
