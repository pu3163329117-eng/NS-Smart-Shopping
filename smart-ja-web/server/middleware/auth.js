const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  // Legacy mock token support (for backward compatibility during migration)
  if (token.startsWith('mock-jwt-token-')) {
    const userId = token.replace('mock-jwt-token-', '');
    req.user = { id: userId };
    return next();
  }

  // Verify real JWT
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Invalid token
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
