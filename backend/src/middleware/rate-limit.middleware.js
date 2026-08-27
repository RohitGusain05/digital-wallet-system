const buckets = new Map();

const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later' } = {}) => {
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || now >= current.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;

    if (current.count > max) {
      const retryAfter = Math.ceil((current.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message
      });
    }

    next();
  };
};

module.exports = rateLimit;
