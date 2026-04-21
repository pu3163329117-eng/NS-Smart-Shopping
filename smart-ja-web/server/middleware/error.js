const { captureException } = require('../utils/observability');

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

  if (statusCode >= 500) {
    captureException(err, {
      tags: {
        request_id: req.requestId,
        path: req.originalUrl,
        method: req.method,
        status_code: statusCode,
      },
      extras: {
        bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body).slice(0, 40) : [],
        query: req.query,
        params: req.params,
      },
      user: req.user ? { id: req.user.id } : undefined,
    });
  }

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    requestId: req.requestId,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

module.exports = errorHandler;
