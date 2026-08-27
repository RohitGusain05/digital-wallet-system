const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const errorHandler = require('./middleware/error.middleware');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan('dev'));

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'digital-wallet-api',
    message: 'Welcome to the Digital Wallet API'
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    code: 'ROUTE_NOT_FOUND',
    message: 'Route not found'
  });
});

app.use(errorHandler);

module.exports = app;
