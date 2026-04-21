const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient } = require('./redis');

const createRedisStore = (prefix) =>
  new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix,
  });

const createRateLimiter = ({
  windowMs,
  max,
  message,
  prefix,
  standardHeaders = true,
  legacyHeaders = false,
  skipSuccessfulRequests = false,
}) => {
  const limiterOptions = {
    windowMs,
    max,
    message,
    standardHeaders,
    legacyHeaders,
    skipSuccessfulRequests,
    // Do not break request flow when Redis temporarily fails.
    passOnStoreError: true,
  };

  if (prefix) {
    limiterOptions.store = createRedisStore(prefix);
  }

  return rateLimit(limiterOptions);
};

module.exports = {
  createRateLimiter,
};
