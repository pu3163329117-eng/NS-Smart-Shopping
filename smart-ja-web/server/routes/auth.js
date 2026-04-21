const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');
const validate = require('../middleware/validate');
const Joi = require('joi');
const { createRateLimiter } = require('../utils/rateLimiter');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  username: Joi.string().min(2).max(30).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const phoneSchema = Joi.object({
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).required(),
});

const codeLoginSchema = Joi.object({
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).required(),
  code: Joi.string().length(6).required(),
});

// SMS send limiter: 1 req / minute / IP
const sendCodeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 1,
  message: { message: 'Too many requests. Please wait before retrying.' },
  prefix: 'rate:auth:send_code:',
});

// SMS login limiter: 5 req / minute / IP
const loginCodeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: 'Too many login attempts. Please retry later.' },
  prefix: 'rate:auth:login_code:',
});

router.get('/me', authenticateToken, authController.getMe);
router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerSchema), authController.register);
router.post('/send-code', sendCodeLimiter, validate(phoneSchema), authController.sendCode);
router.post('/login-with-code', loginCodeLimiter, validate(codeLoginSchema), authController.loginWithCode);

module.exports = router;
