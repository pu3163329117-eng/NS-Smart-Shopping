const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/auth');
const { ensureArray, mapOrderFromDb, mapUserForAuth } = require('../utils/dataMappers');

router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user) {
      return res.sendStatus(404);
    }

    res.json(mapUserForAuth(user));
  } catch (error) {
    next(error);
  }
});

router.put('/profile', authenticateToken, async (req, res, next) => {
  try {
    const existingUser = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!existingUser) {
      return res.sendStatus(404);
    }

    const { name, sign, avatar, backgroundImage, gender } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name !== undefined && { username: name }),
        ...(sign !== undefined && { sign }),
        ...(avatar !== undefined && { avatar }),
        ...(backgroundImage !== undefined && { backgroundImage }),
        ...(gender !== undefined && { gender })
      }
    });

    res.json(mapUserForAuth(updatedUser));
  } catch (error) {
    next(error);
  }
});

router.get('/orders', authenticateToken, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { buyerId: req.user.id },
      include: {
        buyer: { select: { id: true, username: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders.map((order) => mapOrderFromDb(order)));
  } catch (error) {
    next(error);
  }
});

router.get('/addresses', authenticateToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { addresses: true }
    });

    if (!user) {
      return res.sendStatus(404);
    }

    res.json(ensureArray(user.addresses));
  } catch (error) {
    next(error);
  }
});

router.post('/addresses', authenticateToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { addresses: true }
    });

    if (!user) {
      return res.sendStatus(404);
    }

    const addresses = ensureArray(user.addresses);
    const newAddress = {
      id: `addr-${Date.now()}`,
      ...req.body,
      isDefault: Boolean(req.body.isDefault)
    };
    const nextAddresses = newAddress.isDefault
      ? addresses.map((address) => ({ ...address, isDefault: false }))
      : [...addresses];

    nextAddresses.push(newAddress);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { addresses: nextAddresses }
    });

    res.json(newAddress);
  } catch (error) {
    next(error);
  }
});

router.post('/wallet/topup', authenticateToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user) {
      return res.sendStatus(404);
    }

    const topUpAmount = Number.parseFloat(req.body.amount);

    if (!Number.isFinite(topUpAmount) || topUpAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const balanceAfter = Number(user.walletBalance || 0) + topUpAmount;

    const nextTransactions = [
      {
        id: `tx-${Date.now()}`,
        type: 'recharge',
        title: 'Account top-up',
        amount: topUpAmount,
        date: new Date().toISOString(),
        channel: 'recharge',
        status: 'completed',
        counterparty: 'System',
        balanceAfter
      },
      ...ensureArray(user.transactions)
    ];

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        walletBalance: balanceAfter,
        transactions: nextTransactions
      }
    });

    res.json({
      wallet: {
        coupons: updatedUser.walletCoupons,
        balance: Number(updatedUser.walletBalance),
        points: updatedUser.walletPoints
      },
      transactions: ensureArray(updatedUser.transactions)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/checkin', authenticateToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user) {
      return res.sendStatus(404);
    }

    const today = new Date().toISOString().split('T')[0];

    if (user.lastCheckinDate === today) {
      return res.status(400).json({ message: 'Today already checked in' });
    }

    const pointsAward = 10;
    const expAward = 5;
    const nextExp = (user.exp || 0) + expAward;
    const nextLevel = Math.max(user.level || 1, Math.floor(nextExp / 100) + 1);
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        walletPoints: (user.walletPoints || 0) + pointsAward,
        exp: nextExp,
        level: nextLevel,
        lastCheckinDate: today
      }
    });

    res.json({
      message: 'Check-in successful',
      points: updatedUser.walletPoints,
      exp: updatedUser.exp,
      level: updatedUser.level,
      award: { points: pointsAward, exp: expAward }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
