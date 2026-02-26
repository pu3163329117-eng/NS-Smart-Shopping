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

router.get('/me', authenticateToken, authController.getMe);
router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerSchema), authController.register);

module.exports = router;
