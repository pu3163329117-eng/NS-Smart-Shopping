const errorHandler = (err, req, res, next) => {
  const statusCode = Number(err.statusCode) || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const message =
    isProduction && statusCode >= 500
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

  console.error('[ErrorHandler]', {
    requestId: req.requestId,
    statusCode,
    message: err.message,
    stack: err.stack,
  });

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    requestId: req.requestId,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

module.exports = errorHandler;
