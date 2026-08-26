const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const healthRoutes = require('./routes/health.routes');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan('dev'));

app.use('/api/health', healthRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

module.exports = app;
