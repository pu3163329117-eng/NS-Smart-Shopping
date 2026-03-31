const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const isProduction = process.env.NODE_ENV === 'production';
const DEV_FALLBACK_JWT_SECRET = 'your_super_secret_jwt_key_change_in_production';
const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? '' : DEV_FALLBACK_JWT_SECRET);

const assertJwtSecret = () => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET must be set when NODE_ENV=production');
  }
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

const generateToken = (user) => {
  assertJwtSecret();
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const verifyToken = (token) => {
  assertJwtSecret();
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken
};
