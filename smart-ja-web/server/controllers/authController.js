const { readJSON, writeJSON } = require('../utils/db');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');

const register = async (req, res, next) => {
  try {
    const { email, password, username } = req.body;
    const users = readJSON('users');

    if (users.find(u => u.email === email)) {
      const err = new Error('User already exists');
      err.statusCode = 400;
      throw err;
    }

    const hashedPassword = await hashPassword(password);

    const newUser = {
      id: 'user-' + Date.now(),
      email,
      password: hashedPassword,
      username,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeJSON('users', users);

    const { password: _, ...userWithoutPass } = newUser;
    const token = generateToken(userWithoutPass);

    res.status(201).json({ token, user: userWithoutPass });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const users = readJSON('users');
    const user = users.find(u => u.email === email);

    if (!user) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    // Check if password is hashed (bcrypt hashes start with $2a$ or $2b$)
    const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
    let isMatch = false;

    if (isHashed) {
      isMatch = await comparePassword(password, user.password);
    } else {
      // Legacy plain text fallback
      isMatch = password === user.password;
      // Auto-migrate to hashed password
      if (isMatch) {
        user.password = await hashPassword(password);
        writeJSON('users', users);
      }
    }

    if (!isMatch) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    const { password: _, ...userWithoutPass } = user;
    const token = generateToken(userWithoutPass);

    res.json({ token, user: userWithoutPass });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const users = readJSON('users');
    const user = users.find(u => u.id === req.user.id);

    if (!user) {
      return res.sendStatus(404);
    }

    const { password, ...userWithoutPass } = user;
    res.json(userWithoutPass);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe
};
