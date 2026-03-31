const prisma = require('../utils/prisma');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const { mapUserForAuth } = require('../utils/dataMappers');

const codeStore = new Map();
const CODE_TTL_MS = 5 * 60 * 1000;
const exposeDebugCode = process.env.EXPOSE_DEBUG_SMS_CODE === 'true';

const register = async (req, res, next) => {
  try {
    const { email, password, username } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      const err = new Error('User already exists');
      err.statusCode = 400;
      throw err;
    }

    const createdUser = await prisma.user.create({
      data: {
        id: `user-${Date.now()}`,
        email,
        password: await hashPassword(password),
        username,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${username}&backgroundColor=0a0a0c&textColor=ffffff`
      }
    });

    const userWithoutPass = mapUserForAuth(createdUser);
    const token = generateToken(userWithoutPass);

    res.status(201).json({ token, user: userWithoutPass });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    const isHashed =
      user.password.startsWith('$2a$') ||
      user.password.startsWith('$2b$') ||
      user.password.startsWith('$2y$');
    let isMatch = false;

    if (isHashed) {
      isMatch = await comparePassword(password, user.password);
    } else {
      isMatch = password === user.password;

      if (isMatch) {
        const upgradedPassword = await hashPassword(password);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: upgradedPassword }
        });
        user.password = upgradedPassword;
      }
    }

    if (!isMatch) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    const userWithoutPass = mapUserForAuth(user);
    const token = generateToken(userWithoutPass);

    res.json({ token, user: userWithoutPass });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user) {
      return res.sendStatus(404);
    }

    res.json(mapUserForAuth(user));
  } catch (err) {
    next(err);
  }
};

const sendCode = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    codeStore.set(phone, {
      code,
      expireAt: Date.now() + CODE_TTL_MS
    });

    console.log(`[NS-SMS-Sender] Code ${code} sent to ${phone}`);

    const payload = { message: 'Code sent successfully' };
    if (exposeDebugCode) {
      payload.code = code;
    }
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

const loginWithCode = async (req, res, next) => {
  try {
    const { phone, code } = req.body;

    // Test Account Backdoor
    if (phone !== '13800138000' || code !== '123456') {
      const record = codeStore.get(phone);
      if (!record || record.code !== code || record.expireAt < Date.now()) {
        const err = new Error('Invalid or expired verification code');
        err.statusCode = 401;
        throw err;
      }
      codeStore.delete(phone);
    }

    const dummyEmail = `${phone}@smart-ja.fake`;
    let user = await prisma.user.findUnique({ where: { email: dummyEmail } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: `user-${Date.now()}`,
          email: dummyEmail,
          password: await hashPassword(Math.random().toString(36).slice(-8)),
          username: `maker_${phone.slice(-4)}`,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${phone}&backgroundColor=0a0a0c&textColor=ffffff`
        }
      });
    }

    const userWithoutPass = mapUserForAuth(user);
    const token = generateToken(userWithoutPass);

    res.json({
      token,
      user: userWithoutPass,
      isNewUser: !user.createdAt || Date.now() - new Date(user.createdAt).getTime() < 10000
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
  sendCode,
  loginWithCode
};
