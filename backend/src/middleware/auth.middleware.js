const jwt = require('jsonwebtoken');
const AppError = require('../utils/app-error');

const authenticate = (req, _res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED'));
  }

  const token = authorization.slice(7).trim();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (_error) {
    next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
};

module.exports = authenticate;
