const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/auth');
const { ensureArray, mapOrderFromDb, mapUserForAuth } = require('../utils/dataMappers');

const isProduction = process.env.NODE_ENV === 'production';
const isWalletTopupEnabled =
  process.env.ENABLE_WALLET_TOPUP === 'true' ||
  (!isProduction && process.env.ENABLE_WALLET_TOPUP !== 'false');

router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        addresses: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

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
      },
      include: {
        addresses: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
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
        buyer: { select: { id: true, username: true } },
        items: true
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
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(addresses);
  } catch (error) {
    next(error);
  }
});

router.post('/addresses', authenticateToken, async (req, res, next) => {
  try {
    const { receiver, phone, region, detail, isDefault } = req.body;

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.id, isDefault: true },
        data: { isDefault: false }
      });
    }

    const newAddress = await prisma.address.create({
      data: {
        userId: req.user.id,
        receiver,
        phone,
        region,
        detail,
        isDefault: Boolean(isDefault)
      }
    });

    res.json(newAddress);
  } catch (error) {
    next(error);
  }
});

router.post('/wallet/topup', authenticateToken, async (req, res, next) => {
  try {
    if (!isWalletTopupEnabled) {
      return res.status(403).json({
        message: 'Wallet top-up is disabled in this environment'
      });
    }

    const topUpAmount = Number.parseFloat(req.body.amount);

    if (!Number.isFinite(topUpAmount) || topUpAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: req.user.id } });
      if (!user) throw new Error('User not found');

      const balanceAfter = Number(user.walletBalance || 0) + topUpAmount;

      await tx.userTransaction.create({
        data: {
          userId: req.user.id,
          type: 'recharge',
          title: 'Account top-up',
          amount: topUpAmount,
          balanceAfter,
          channel: 'recharge',
          status: 'completed',
          counterparty: 'System'
        }
      });

      return await tx.user.update({
        where: { id: req.user.id },
        data: { walletBalance: balanceAfter },
        include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } }
      });
    });

    res.json({
      wallet: {
        coupons: updatedUser.walletCoupons,
        balance: Number(updatedUser.walletBalance),
        points: updatedUser.walletPoints
      },
      transactions: updatedUser.transactions
    });
  } catch (error) {
    next(error);
  }
});

// Wallet Transaction Query (paginated + filterable)
router.get('/wallet/transactions', authenticateToken, async (req, res, next) => {
  try {
    const { type, counterparty, limit = '30', cursor } = req.query;
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));

    const where = { userId: req.user.id };

    // Filter by transaction type
    if (type) {
      const types = type.split(',').map(t => t.trim()).filter(Boolean);
      if (types.length === 1) {
        where.type = types[0];
      } else if (types.length > 1) {
        where.type = { in: types };
      }
    }

    // Filter by counterparty (for AI transactions)
    if (counterparty) {
      where.counterparty = { contains: counterparty, mode: 'insensitive' };
    }

    const queryOptions = {
      where,
      orderBy: { createdAt: 'desc' },
      take
    };

    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1;
    }

    const transactions = await prisma.userTransaction.findMany(queryOptions);
    const nextCursor = transactions.length === take ? transactions[transactions.length - 1].id : null;

    res.json({ data: transactions, nextCursor });
  } catch (error) {
    next(error);
  }
});

// Wallet Summary Statistics
router.get('/wallet/summary', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [user, transactions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true, walletPoints: true, walletCoupons: true }
      }),
      prisma.userTransaction.findMany({
        where: { userId },
        select: { type: true, amount: true, counterparty: true, isPoints: true }
      })
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    let aiSpend = 0;
    let rechargeTotal = 0;

    for (const tx of transactions) {
      if (tx.isPoints) continue; // Skip points-only transactions
      const amount = Number(tx.amount || 0);
      if (amount > 0) {
        totalIncome += amount;
        if (tx.type === 'recharge') rechargeTotal += amount;
      } else {
        totalExpense += Math.abs(amount);
        if (tx.counterparty && tx.counterparty.includes('NS Matrix')) {
          aiSpend += Math.abs(amount);
        }
      }
    }

    res.json({
      balance: Number(user?.walletBalance || 0),
      points: user?.walletPoints || 0,
      coupons: user?.walletCoupons || 0,
      totalIncome,
      totalExpense,
      aiSpend,
      rechargeTotal,
      transactionCount: transactions.length
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

    await prisma.$transaction(async (tx) => {
      const balanceAfter = (user.walletPoints || 0) + pointsAward;

      await tx.userTransaction.create({
        data: {
          userId: req.user.id,
          type: 'points',
          title: 'Daily Check-in',
          amount: pointsAward,
          balanceAfter,
          isPoints: true,
          channel: 'system',
          status: 'completed',
          counterparty: 'System'
        }
      });

      await tx.user.update({
        where: { id: req.user.id },
        data: {
          walletPoints: balanceAfter,
          exp: nextExp,
          level: nextLevel,
          lastCheckinDate: today
        }
      });
    });

    res.json({
      message: 'Check-in successful',
      points: (user.walletPoints || 0) + pointsAward,
      exp: nextExp,
      level: nextLevel,
      award: { points: pointsAward, exp: expAward }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
