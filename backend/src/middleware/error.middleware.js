const errorHandler = (error, _req, res, _next) => {
  console.error(error);

  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';

  res.status(statusCode).json({
    success: false,
    code,
    message: statusCode === 500 ? 'Internal server error' : error.message
  });
};

module.exports = errorHandler;
