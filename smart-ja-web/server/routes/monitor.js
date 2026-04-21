const express = require('express');
const Joi = require('joi');
const { createRateLimiter } = require('../utils/rateLimiter');
const { captureException, captureMessage } = require('../utils/observability');

const router = express.Router();

const clientErrorLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: { message: 'Too many telemetry events. Please retry later.' },
  prefix: 'rate:monitor:client_error:',
});

const clientErrorSchema = Joi.object({
  message: Joi.string().trim().max(1000).required(),
  stack: Joi.string().allow('').max(8000).optional(),
  source: Joi.string().trim().max(128).optional(),
  href: Joi.string().trim().max(1000).optional(),
  userAgent: Joi.string().trim().max(1000).optional(),
  timestamp: Joi.string().trim().max(64).optional(),
  locale: Joi.string().trim().max(32).optional(),
  extra: Joi.object().unknown(true).optional(),
}).unknown(false);

router.post('/client-error', clientErrorLimiter, (req, res) => {
  const { error, value } = clientErrorSchema.validate(req.body || {});
  if (error) {
    return res.status(400).json({
      message: 'Invalid telemetry payload',
      requestId: req.requestId,
    });
  }

  const event = {
    ...value,
    requestId: req.requestId,
    ip: req.ip,
  };

  console.error('[ClientTelemetry]', event);

  const wrappedError = new Error(value.message);
  wrappedError.name = 'ClientTelemetryError';
  if (value.stack) {
    wrappedError.stack = value.stack;
  }

  captureException(wrappedError, {
    tags: {
      source: value.source || 'frontend',
      kind: 'client_error',
      request_id: req.requestId,
    },
    extras: {
      href: value.href,
      userAgent: value.userAgent,
      timestamp: value.timestamp,
      locale: value.locale,
      payloadExtra: value.extra,
      ip: req.ip,
    },
  });

  captureMessage('Frontend client error telemetry received', 'warning', {
    tags: {
      source: value.source || 'frontend',
      request_id: req.requestId,
    },
  });

  return res.status(202).json({
    accepted: true,
    requestId: req.requestId,
  });
});

module.exports = router;
