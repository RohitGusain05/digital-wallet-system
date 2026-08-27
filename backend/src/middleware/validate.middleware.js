const AppError = require('../utils/app-error');

const validateBody = (rules) => (req, _res, next) => {
  const errors = [];

  for (const [field, rule] of Object.entries(rules)) {
    const value = req.body?.[field];

    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }

    if (value !== undefined && rule.type && typeof value !== rule.type) {
      errors.push(`${field} must be a ${rule.type}`);
      continue;
    }

    if (typeof value === 'string' && rule.maxLength && value.length > rule.maxLength) {
      errors.push(`${field} must be at most ${rule.maxLength} characters`);
    }
  }

  if (errors.length) {
    return next(new AppError(errors.join('; '), 400, 'VALIDATION_ERROR'));
  }

  next();
};

module.exports = validateBody;
