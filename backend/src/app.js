const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const walletRoutes = require('./routes/wallet.routes');
const docsRoutes = require('./routes/docs.routes');
const rateLimit = require('./middleware/rate-limit.middleware');
const errorHandler = require('./middleware/error.middleware');

const app = express();

app.disable('x-powered-by');

const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: configuredOrigins.length > 0
    ? (origin, callback) => {
        if (!origin || configuredOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('CORS origin not allowed'));
      }
    : true,
  credentials: true
}));

app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
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
app.use('/api/wallet', walletRoutes);
app.use('/api/docs', docsRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    code: 'ROUTE_NOT_FOUND',
    message: 'Route not found'
  });
});

app.use(errorHandler);

module.exports = app;
