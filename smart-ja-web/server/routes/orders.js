const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/auth');
const { ensureArray, mapOrderFromDb } = require('../utils/dataMappers');

router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { items, total } = req.body;
    const normalizedItems = ensureArray(items);
    const orderAmount = Number.parseFloat(total);

    if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
      return res.status(400).json({ message: 'Invalid order amount' });
    }

    const createdOrder = await prisma.$transaction(async (tx) => {
      const buyer = await tx.user.findUnique({ where: { id: req.user.id } });

      if (!buyer) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
      }

      if (Number(buyer.walletBalance || 0) < orderAmount) {
        const err = new Error('Insufficient balance');
        err.statusCode = 400;
        err.code = 'INSUFFICIENT_FUNDS';
        throw err;
      }

      const pointsAwarded = Math.floor(orderAmount / 10);
      const timestamp = Date.now();
      const now = new Date().toISOString();
      const nextTransactions = [
        {
          id: `tx-out-${timestamp}`,
          type: 'expense',
          title: 'Purchase',
          amount: -orderAmount,
          date: now
        },
        ...ensureArray(buyer.transactions)
      ];

      if (pointsAwarded > 0) {
        nextTransactions.unshift({
          id: `tx-pt-${timestamp}`,
          type: 'points',
          title: 'Purchase reward',
          amount: pointsAwarded,
          isPoints: true,
          date: now
        });
      }

      const matchedServiceId = normalizedItems.find((item) => item && item.id)?.id || null;
      const matchedService = matchedServiceId
        ? await tx.service.findUnique({ where: { id: matchedServiceId } })
        : null;
      const providerId =
        normalizedItems[0]?.providerId ||
        normalizedItems[0]?.userId ||
        matchedService?.userId ||
        null;

      await tx.user.update({
        where: { id: buyer.id },
        data: {
          walletBalance: Number(buyer.walletBalance || 0) - orderAmount,
          walletPoints: (buyer.walletPoints || 0) + pointsAwarded,
          transactions: nextTransactions
        }
      });

      if (matchedService) {
        await tx.service.update({
          where: { id: matchedService.id },
          data: { sales: { increment: 1 } }
        });
      }

      if (providerId) {
        const provider = await tx.user.findUnique({ where: { id: providerId } });

        if (provider) {
          await tx.user.update({
            where: { id: providerId },
            data: {
              walletBalance: Number(provider.walletBalance || 0) + orderAmount
            }
          });
        }
      }

      return await tx.order.create({
        data: {
          id: `ord-${timestamp}`,
          items: normalizedItems,
          amount: orderAmount,
          status: 'paid',
          buyerId: buyer.id,
          providerId,
          serviceId: matchedService?.id || null
        },
        include: {
          buyer: { select: { id: true, username: true } }
        }
      });
    });

    res.status(201).json(mapOrderFromDb(createdOrder));
  } catch (error) {
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return res.status(400).json({
        code: 'INSUFFICIENT_FUNDS',
        message: error.message
      });
    }

    next(error);
  }
});

router.put('/:id/status', authenticateToken, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        buyer: { select: { id: true, username: true } }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const requestedStatus = req.body.status;
    const nextStatus = requestedStatus === 'paid' ? 'pending_shipment' : requestedStatus;
    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: nextStatus },
      include: {
        buyer: { select: { id: true, username: true } }
      }
    });

    if (requestedStatus === 'paid') {
      setTimeout(async () => {
        try {
          await prisma.order.update({
            where: { id: req.params.id },
            data: { status: 'shipped' }
          });
        } catch (timerError) {
          console.error('Failed to auto-transition order status:', timerError.message);
        }
      }, 5000);
    }

    res.json(mapOrderFromDb(updatedOrder));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
