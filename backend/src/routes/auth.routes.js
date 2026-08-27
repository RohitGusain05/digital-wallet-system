const express = require('express');
const { register, login, me } = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');
const rateLimit = require('../middleware/rate-limit.middleware');
const validateBody = require('../middleware/validate.middleware');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts, please try again later'
});

router.post(
  '/register',
  authLimiter,
  validateBody({
    fullName: { required: true, type: 'string', maxLength: 100 },
    email: { required: true, type: 'string', maxLength: 254 },
    password: { required: true, type: 'string', maxLength: 128 }
  }),
  register
);

router.post(
  '/login',
  authLimiter,
  validateBody({
    email: { required: true, type: 'string', maxLength: 254 },
    password: { required: true, type: 'string', maxLength: 128 }
  }),
  login
);

router.get('/me', authenticate, me);

module.exports = router;
