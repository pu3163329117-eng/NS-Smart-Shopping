const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');
const validate = require('../middleware/validate');
const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  username: Joi.string().min(2).max(30).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const phoneSchema = Joi.object({
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).required()
});

const codeLoginSchema = Joi.object({
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).required(),
  code: Joi.string().length(6).required()
});

const rateLimit = require('express-rate-limit');

// 🛡️ 防护盾 1：验证码发送防刷锁（每 IP 每分钟最多 1 次请求）
const sendCodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  message: { message: "操作太频繁，请等等再试" },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🛡️ 防护盾 2：验证码登录防暴破锁（每 IP 每分钟最多 5 次请求）
const loginCodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: "登录尝试过多，请稍后再试" }
});

router.get('/me', authenticateToken, authController.getMe);
router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerSchema), authController.register);

// 短信新登录接入点
router.post('/send-code', sendCodeLimiter, validate(phoneSchema), authController.sendCode);
router.post('/login-with-code', loginCodeLimiter, validate(codeLoginSchema), authController.loginWithCode);

module.exports = router;
