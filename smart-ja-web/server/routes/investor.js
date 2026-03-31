const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/auth');

const parseCsvEnv = (...keys) => {
  for (const key of keys) {
    const raw = process.env[key];
    if (!raw) continue;
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const ADMIN_ID_ALLOWLIST = new Set(parseCsvEnv('GUSHI_ADMIN_IDS', 'ADMIN_USER_IDS'));
const ADMIN_EMAIL_ALLOWLIST = new Set(
  parseCsvEnv('GUSHI_ADMIN_EMAILS', 'ADMIN_EMAILS').map((email) => email.toLowerCase())
);
const INVESTOR_DASHBOARD_PUBLIC = process.env.INVESTOR_DASHBOARD_PUBLIC === 'true';
const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const isAdminUser = (user) => {
  const userId = String(user?.id || '').trim();
  const userEmail = String(user?.email || '').trim().toLowerCase();
  return ADMIN_ID_ALLOWLIST.has(userId) || ADMIN_EMAIL_ALLOWLIST.has(userEmail);
};

const allowInvestorDashboard = (req, res, next) => {
  if (INVESTOR_DASHBOARD_PUBLIC) {
    return next();
  }
  return authenticateToken(req, res, () => {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ success: false, message: 'Investor dashboard requires admin access' });
    }
    return next();
  });
};

// @route   GET /api/investor/dashboard
// @desc    Get aggregated metrics for the Investor Dashboard
// @access  Admin by default; can be public via INVESTOR_DASHBOARD_PUBLIC=true
router.get('/dashboard', allowInvestorDashboard, async (req, res, next) => {
  try {
    const [activeProjects, services, serviceAgg, topUsers] = await Promise.all([
      prisma.service.count({ where: { status: 'active' } }),
      prisma.service.findMany({
        select: {
          id: true,
          title: true,
          price: true,
          sales: true,
          views: true,
          pledgedAmount: true,
          fundingGoal: true,
          tags: true
        }
      }),
      prisma.service.aggregate({
        _sum: {
          pledgedAmount: true,
          views: true
        }
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { exp: 'desc' },
        select: { username: true, reputation: true, level: true, exp: true }
      })
    ]);

    let totalRevenue = 0;
    const categoryDist = {};

    for (const service of services) {
      totalRevenue += Number(service.price || 0) * Number(service.sales || 0);
      const tags = Array.isArray(service.tags)
        ? service.tags
        : typeof service.tags === 'string'
          ? [service.tags]
          : [];

      for (const tag of tags) {
        const key = String(tag || '').trim();
        if (!key) continue;
        categoryDist[key] = (categoryDist[key] || 0) + 1;
      }
    }

    const radar = Object.entries(categoryDist)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, value: count }));

    res.json({
      success: true,
      data: {
        metrics: {
          totalRevenue: roundMoney(totalRevenue),
          totalFunding: roundMoney(serviceAgg._sum.pledgedAmount || 0),
          activeProjects,
          totalViews: Number(serviceAgg._sum.views || 0)
        },
        radar,
        topMakers: topUsers
      }
    });
  } catch (error) {
    console.error('Investor Dashboard Error:', error);
    next(error);
  }
});

module.exports = router;
