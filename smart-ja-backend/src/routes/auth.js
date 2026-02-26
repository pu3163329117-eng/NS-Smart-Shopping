import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Register
/**
 * @swagger
 * tags:
 *   name: Auth (认证)
 *   description: 用户认证与管理 (User Authentication & Management)
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: 注册新用户 (Register New User)
 *     description: 创建一个新的学生或创客账号 (Create a new student or maker account)
 *     tags: [Auth (认证)]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名 (Username)
 *                 example: "student1"
 *               email:
 *                 type: string
 *                 description: 电子邮箱 (Email Address)
 *                 example: "student1@example.com"
 *               password:
 *                 type: string
 *                 description: 密码 (Password)
 *                 example: "password123"
 *               role:
 *                 type: string
 *                 enum: [student, maker, admin]
 *                 description: 用户角色 (User Role) - student(学生), maker(创客), admin(管理员)
 *                 default: student
 *     responses:
 *       201:
 *         description: 注册成功 (Registration Successful)
 *       400:
 *         description: 用户已存在 (User Already Exists)
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    // Check existing user
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      username,
      email,
      password_hash,
      role: role || 'student'
    });

    res.status(201).json({ 
      id: user.id,
      username: user.username,
      role: user.role,
      message: 'User registered successfully' 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 用户登录 (User Login)
 *     description: 登录并获取 JWT 令牌 (Login to get JWT Token)
 *     tags: [Auth (认证)]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "student1@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: 登录成功 (Login Successful)
 *       400:
 *         description: 凭证无效 (Invalid Credentials)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance,
        maker_profile: user.maker_profile
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
