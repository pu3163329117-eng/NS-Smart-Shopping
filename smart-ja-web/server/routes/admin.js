const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/auth');

// Admin allowlist check — reuses the same pattern as investor.js
const parseCsvEnv = (...keys) => {
  for (const key of keys) {
    const raw = process.env[key];
    if (!raw) continue;
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

const ADMIN_ID_ALLOWLIST = new Set(parseCsvEnv('GUSHI_ADMIN_IDS', 'ADMIN_USER_IDS'));
const ADMIN_EMAIL_ALLOWLIST = new Set(
  parseCsvEnv('GUSHI_ADMIN_EMAILS', 'ADMIN_EMAILS').map((e) => e.toLowerCase())
);
const ALLOW_DEV_ADMIN_BYPASS = process.env.ALLOW_DEV_ADMIN_BYPASS === 'true';

const isAdmin = (user) => {
  if (ALLOW_DEV_ADMIN_BYPASS) return true;
  const id = String(user?.id || '').trim();
  const email = String(user?.email || '').trim().toLowerCase();
  return ADMIN_ID_ALLOWLIST.has(id) || ADMIN_EMAIL_ALLOWLIST.has(email);
};

const requireAdmin = (req, res, next) => {
  return authenticateToken(req, res, () => {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  });
};

// GET /api/admin/stats — Aggregate overview for Data Center
router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const [
      userCount,
      serviceCount,
      orderAgg,
      recentOrders,
      recentUsers,
      pendingServiceCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.service.count({ where: { status: 'active' } }),
      prisma.order.aggregate({
        where: { status: { in: ['completed', 'paid', 'shipped'] } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { username: true } },
          items: { select: { serviceName: true, quantity: true, unitPrice: true } },
        },
      }),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, username: true, email: true, level: true, createdAt: true },
      }),
      prisma.service.count({ where: { status: 'pending' } }),
    ]);

    res.json({
      stats: {
        gmv: Number(orderAgg._sum.totalAmount || 0),
        orders: orderAgg._count.id || 0,
        users: userCount,
        activeProviders: serviceCount,
        pendingServices: pendingServiceCount,
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        user: o.buyer?.username || 'Unknown',
        item: o.items?.[0]?.serviceName || '—',
        status: o.status,
        amount: Number(o.totalAmount || 0),
        date: new Date(o.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      })),
      recentUsers: recentUsers.map((u) => ({
        id: u.id,
        name: u.username,
        email: u.email,
        level: u.level,
        joinedAt: new Date(u.createdAt).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      })),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
