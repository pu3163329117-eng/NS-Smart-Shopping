const prisma = require('../utils/prisma');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const { mapUserForAuth } = require('../utils/dataMappers');

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
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
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

module.exports = {
  register,
  login,
  getMe
};
