const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/auth');

// Get current user's notifications
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false }
    });

    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (error) { next(error); }
});

// Mark single notification as read
router.patch('/:id/read', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, userId },
      data: { isRead: true }
    });
    res.json({ success: true, count: result.count });
  } catch (error) { next(error); }
});

// Mark all as read
router.post('/read-all', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true, count: result.count });
  } catch (error) { next(error); }
});

module.exports = router;
