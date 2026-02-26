const express = require('express');
const router = express.Router();
const { readJSON, writeJSON } = require('../utils/db');
const authenticateToken = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User management and wallet
 */

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 */
// Get User Profile
router.get('/profile', authenticateToken, (req, res) => {
  const users = readJSON('users');
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) return res.sendStatus(404);

  // Default values for new fields
  const profile = {
    ...user,
    sign: user.sign || '让生活更简单',
    gender: user.gender || 'male',
    level: user.level || 1,
    reputation: user.reputation || '优秀',
    backgroundImage: user.backgroundImage || null,
    stats: user.stats || { likes: 0, following: 0, followers: 0 },
    wallet: user.wallet || { coupons: 2, balance: 0.00, points: 100 },
    interactionCounts: user.interactionCounts || { want: 0, owned: 0, footprints: 0, brandFollowing: 0 }
  };
  
  // Remove sensitive info
  delete profile.password;
  
  res.json(profile);
});

/**
 * @swagger
 * /api/user/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               sign:
 *                 type: string
 *               gender:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated profile
 */
// Update User Profile
router.put('/profile', authenticateToken, (req, res) => {
  const users = readJSON('users');
  const userIndex = users.findIndex(u => u.id === req.user.id);
  
  if (userIndex === -1) return res.sendStatus(404);
  
  const { name, sign, avatar, backgroundImage, gender } = req.body;
  
  // Update fields
  if (name !== undefined) users[userIndex].username = name; // Map name to username
  if (sign !== undefined) users[userIndex].sign = sign;
  if (avatar !== undefined) users[userIndex].avatar = avatar;
  if (backgroundImage !== undefined) users[userIndex].backgroundImage = backgroundImage;
  if (gender !== undefined) users[userIndex].gender = gender;
  
  writeJSON('users', users);
  
  const updatedUser = { ...users[userIndex] };
  delete updatedUser.password;
  
  res.json(updatedUser);
});

router.get('/orders', authenticateToken, (req, res) => {
  const orders = readJSON('orders');
  // Filter for current user in real app
  const myOrders = orders.filter(o => o.buyer && o.buyer.id === req.user.id);
  res.json(myOrders);
});

router.get('/addresses', authenticateToken, (req, res) => {
  const users = readJSON('users');
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) return res.sendStatus(404);
  
  res.json(user.addresses || []);
});

router.post('/addresses', authenticateToken, (req, res) => {
  const users = readJSON('users');
  const userIndex = users.findIndex(u => u.id === req.user.id);
  
  if (userIndex === -1) return res.sendStatus(404);
  
  const newAddress = {
    id: 'addr-' + Date.now(),
    ...req.body,
    isDefault: req.body.isDefault || false
  };
  
  if (!users[userIndex].addresses) {
    users[userIndex].addresses = [];
  }
  
  if (newAddress.isDefault) {
    users[userIndex].addresses.forEach(a => a.isDefault = false);
  }
  
  users[userIndex].addresses.push(newAddress);
  writeJSON('users', users);
  
  res.json(newAddress);
});

/**
 * @swagger
 * /api/user/wallet/topup:
 *   post:
 *     summary: Top up wallet balance
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated wallet balance
 */
// Wallet Top-up
router.post('/wallet/topup', authenticateToken, (req, res) => {
  const users = readJSON('users');
  const userIndex = users.findIndex(u => u.id === req.user.id);
  
  if (userIndex === -1) return res.sendStatus(404);
  
  const { amount } = req.body;
  const topUpAmount = parseFloat(amount);
  
  if (isNaN(topUpAmount) || topUpAmount <= 0) {
    return res.status(400).json({ message: 'Invalid amount' });
  }
  
  // Initialize wallet if not exists
  if (!users[userIndex].wallet) {
    users[userIndex].wallet = { coupons: 0, balance: 0.00, points: 0 };
  }
  
  users[userIndex].wallet.balance += topUpAmount;
  
  // Add points (e.g., 1 point per 10 currency)
  // users[userIndex].wallet.points += Math.floor(topUpAmount / 10);
  
  // Record Transaction
  if (!users[userIndex].transactions) {
    users[userIndex].transactions = [];
  }
  users[userIndex].transactions.unshift({
    id: 'tx-' + Date.now(),
    type: 'recharge',
    title: '账户充值',
    amount: topUpAmount,
    date: new Date().toISOString()
  });

  writeJSON('users', users);
  
  res.json({
    wallet: users[userIndex].wallet,
    transactions: users[userIndex].transactions
  });
});

/**
 * @swagger
 * /api/user/checkin:
 *   post:
 *     summary: Daily check-in for points and exp
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Check-in result
 *       400:
 *         description: Already checked in today
 */
router.post('/checkin', authenticateToken, (req, res) => {
  const users = readJSON('users');
  const userIndex = users.findIndex(u => u.id === req.user.id);
  
  if (userIndex === -1) return res.sendStatus(404);
  
  const user = users[userIndex];
  const today = new Date().toISOString().split('T')[0];
  
  if (user.lastCheckinDate === today) {
    return res.status(400).json({ message: 'Today already checked in' });
  }
  
  // Initialize wallet if not exists
  if (!user.wallet) {
    user.wallet = { coupons: 0, balance: 0.00, points: 0 };
  }
  
  // Award: 10 Points + 5 EXP
  const pointsAward = 10;
  const expAward = 5;
  
  user.wallet.points = (user.wallet.points || 0) + pointsAward;
  user.lastCheckinDate = today;
  
  // Add EXP logic (simple level up: level = floor(exp / 100) + 1)
  user.exp = (user.exp || 0) + expAward;
  const newLevel = Math.floor(user.exp / 100) + 1;
  if (newLevel > (user.level || 1)) {
    user.level = newLevel;
  }
  
  writeJSON('users', users);
  
  res.json({
    message: 'Check-in successful',
    points: user.wallet.points,
    exp: user.exp,
    level: user.level,
    award: { points: pointsAward, exp: expAward }
  });
});

module.exports = router;
