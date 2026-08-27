const AppError = require('./app-error');

const parseAmount = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new AppError('Amount must be a number or numeric string', 400, 'INVALID_AMOUNT');
  }

  const normalized = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new AppError('Amount must be positive and contain at most 2 decimal places', 400, 'INVALID_AMOUNT');
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('Amount must be greater than zero', 400, 'INVALID_AMOUNT');
  }

  return normalized;
};

module.exports = { parseAmount };
