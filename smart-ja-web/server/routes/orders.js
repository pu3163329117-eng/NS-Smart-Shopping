const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/auth');
const { ensureArray, mapOrderFromDb } = require('../utils/dataMappers');

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

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const createOrderRef = (prefix = 'ord') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isAdminUser = (user) => {
  const userId = String(user?.id || '').trim();
  const userEmail = String(user?.email || '').trim().toLowerCase();
  return ADMIN_ID_ALLOWLIST.has(userId) || ADMIN_EMAIL_ALLOWLIST.has(userEmail);
};

const toPositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const buildProviderOrderGroups = (validatedItems) => {
  const groups = new Map();

  for (const item of validatedItems) {
    const providerKey = item.providerId ? String(item.providerId) : '__marketplace__';
    if (!groups.has(providerKey)) {
      groups.set(providerKey, {
        providerId: item.providerId || null,
        items: [],
        orderAmount: 0
      });
    }

    const currentGroup = groups.get(providerKey);
    currentGroup.items.push(item);
    currentGroup.orderAmount = roundMoney(currentGroup.orderAmount + item.lineAmount);
  }

  return Array.from(groups.values());
};

const buildValidatedOrderItems = async (tx, rawItems) => {
  if (!rawItems.length) {
    const err = new Error('Order items are required');
    err.statusCode = 400;
    throw err;
  }

  const validatedItems = [];

  for (const item of rawItems) {
    const quantity = toPositiveInt(item.quantity || 1);
    if (!quantity) {
      const err = new Error('Invalid item quantity');
      err.statusCode = 400;
      throw err;
    }

    let serviceId = String(item.id || item.serviceId || '').trim() || null;
    const skuId = String(item.skuId || '').trim() || null;
    let providerId = null;
    let unitPrice = 0;
    let title = item.title || item.name || 'Product';
    let image = item.image || item.cover || null;

    if (skuId) {
      const sku = await tx.serviceSku.findUnique({
        where: { id: skuId },
        include: {
          service: {
            select: { id: true, userId: true, title: true, image: true, price: true }
          }
        }
      });

      if (!sku || !sku.service) {
        const err = new Error(`SKU not found: ${skuId}`);
        err.statusCode = 400;
        throw err;
      }

      const stockUpdateResult = await tx.serviceSku.updateMany({
        where: {
          id: skuId,
          stock: { gte: quantity }
        },
        data: { stock: { decrement: quantity } }
      });
      if (stockUpdateResult.count !== 1) {
        const currentSku = await tx.serviceSku.findUnique({
          where: { id: skuId },
          select: { id: true }
        });
        const err = new Error(currentSku ? `Insufficient stock for SKU: ${skuId}` : `SKU not found: ${skuId}`);
        err.statusCode = 400;
        throw err;
      }

      serviceId = sku.serviceId;
      providerId = sku.service.userId;
      unitPrice = roundMoney(Number(sku.price ?? sku.service.price ?? 0));
      title = item.title || sku.name || sku.service.title || 'Product';
      image = image || sku.image || sku.service.image || null;
    } else {
      if (!serviceId) {
        const err = new Error('Each item must include serviceId or skuId');
        err.statusCode = 400;
        throw err;
      }

      const service = await tx.service.findUnique({
        where: { id: serviceId },
        select: { id: true, userId: true, title: true, image: true, price: true }
      });

      if (!service) {
        const err = new Error(`Service not found: ${serviceId}`);
        err.statusCode = 400;
        throw err;
      }

      providerId = service.userId;
      unitPrice = roundMoney(Number(service.price ?? 0));
      title = item.title || service.title || title;
      image = image || service.image || null;
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      const err = new Error('Invalid item price');
      err.statusCode = 400;
      throw err;
    }

    const lineAmount = roundMoney(unitPrice * quantity);
    validatedItems.push({
      serviceId,
      skuId,
      providerId,
      title,
      price: unitPrice,
      quantity,
      image,
      lineAmount
    });
  }

  const orderAmount = roundMoney(validatedItems.reduce((sum, item) => sum + item.lineAmount, 0));
  const providerOrderGroups = buildProviderOrderGroups(validatedItems);

  return { validatedItems, providerOrderGroups, orderAmount };
};

const findOrderForCompensation = async (dbClient, orderId) =>
  dbClient.order.findUnique({
    where: { id: orderId },
    include: {
      buyer: { select: { id: true, username: true, email: true } },
      items: {
        select: {
          id: true,
          serviceId: true,
          skuId: true,
          quantity: true
        }
      },
      service: { select: { id: true, userId: true, title: true, image: true } }
    }
  });

const aggregateOrderItemQuantities = (items, fieldName) => {
  const bucket = new Map();
  for (const item of ensureArray(items)) {
    const key = String(item?.[fieldName] || '').trim();
    const quantity = toPositiveInt(item?.quantity || 0);
    if (!key || !quantity) continue;
    bucket.set(key, (bucket.get(key) || 0) + quantity);
  }
  return bucket;
};

const restockOrderInventory = async (tx, items) => {
  const skuQuantities = aggregateOrderItemQuantities(items, 'skuId');
  for (const [skuId, quantity] of skuQuantities.entries()) {
    await tx.serviceSku.updateMany({
      where: { id: skuId },
      data: { stock: { increment: quantity } }
    });
  }
};

const rollbackOrderServiceSales = async (tx, items) => {
  const serviceQuantities = aggregateOrderItemQuantities(items, 'serviceId');
  for (const [serviceId, quantity] of serviceQuantities.entries()) {
    const service = await tx.service.findUnique({
      where: { id: serviceId },
      select: { sales: true }
    });
    if (!service) continue;

    const nextSales = Math.max(0, Number(service.sales || 0) - quantity);
    await tx.service.update({
      where: { id: serviceId },
      data: { sales: nextSales }
    });
  }
};

const applyOrderCompensation = async (
  tx,
  order,
  { targetStatus, buyerTxTitle, providerTxTitle, restock, refundStatus = 'refunded' }
) => {
  const orderAmount = roundMoney(order.amount);
  const buyer = await tx.user.findUnique({
    where: { id: order.buyerId },
    select: { id: true, walletBalance: true, username: true }
  });

  if (!buyer) {
    const err = new Error('Buyer not found');
    err.statusCode = 404;
    throw err;
  }

  const buyerBalanceAfter = roundMoney(Number(buyer.walletBalance || 0) + orderAmount);
  await tx.user.update({
    where: { id: buyer.id },
    data: { walletBalance: buyerBalanceAfter }
  });

  await tx.userTransaction.create({
    data: {
      userId: buyer.id,
      type: 'refund',
      title: buyerTxTitle,
      amount: orderAmount,
      balanceAfter: buyerBalanceAfter,
      channel: 'wallet',
      status: 'completed',
      orderId: order.id,
      counterparty: order.providerId || 'Marketplace'
    }
  });

  if (order.providerId) {
    const provider = await tx.user.findUnique({
      where: { id: order.providerId },
      select: { id: true, walletBalance: true }
    });

    if (provider) {
      const providerBalanceAfter = roundMoney(Number(provider.walletBalance || 0) - orderAmount);
      await tx.user.update({
        where: { id: provider.id },
        data: { walletBalance: providerBalanceAfter }
      });

      await tx.userTransaction.create({
        data: {
          userId: provider.id,
          type: 'refund_out',
          title: providerTxTitle,
          amount: -orderAmount,
          balanceAfter: providerBalanceAfter,
          channel: 'wallet',
          status: 'completed',
          orderId: order.id,
          counterparty: buyer.username || 'Buyer'
        }
      });
    }
  }

  if (restock) {
    await restockOrderInventory(tx, order.items);
    await rollbackOrderServiceSales(tx, order.items);
  }

  return tx.order.update({
    where: { id: order.id },
    data: {
      status: targetStatus,
      refundStatus
    },
    include: {
      buyer: { select: { id: true, username: true, email: true } },
      items: true,
      service: true
    }
  });
};

router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { items, total, addressId } = req.body;
    const normalizedItems = ensureArray(items);
    const requestedTotal = Number.parseFloat(total);

    const orderResult = await prisma.$transaction(async (tx) => {
      const buyer = await tx.user.findUnique({ where: { id: req.user.id } });

      if (!buyer) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
      }

      const { validatedItems, providerOrderGroups, orderAmount } = await buildValidatedOrderItems(
        tx,
        normalizedItems
      );
      if (orderAmount <= 0) {
        const err = new Error('Invalid order amount');
        err.statusCode = 400;
        throw err;
      }

      if (Number.isFinite(requestedTotal) && Math.abs(roundMoney(requestedTotal) - orderAmount) > 0.01) {
        console.warn(
          `[orders] client total mismatch ignored: client=${requestedTotal}, server=${orderAmount}, user=${buyer.id}`
        );
      }

      if (Number(buyer.walletBalance || 0) < orderAmount) {
        const err = new Error('Insufficient balance');
        err.statusCode = 400;
        err.code = 'INSUFFICIENT_FUNDS';
        throw err;
      }

      const pointsAwarded = Math.floor(orderAmount / 10);
      const balanceAfterOut = Number(buyer.walletBalance || 0) - orderAmount;
      const balanceAfterPoint = Number(buyer.walletPoints || 0) + pointsAwarded;
      const splitCheckout = providerOrderGroups.length > 1;
      const checkoutId = splitCheckout ? createOrderRef('chk') : null;
      const createdOrders = [];

      for (const providerGroup of providerOrderGroups) {
        const orderId = createOrderRef('ord');
        providerGroup.orderId = orderId;
        const checkoutMeta =
          splitCheckout
            ? {
              checkoutId,
              splitOrderCount: providerOrderGroups.length
            }
            : null;

        const createdOrder = await tx.order.create({
          data: {
            id: orderId,
            amount: providerGroup.orderAmount,
            status: 'paid',
            buyerId: buyer.id,
            providerId: providerGroup.providerId,
            serviceId: providerGroup.items[0]?.serviceId || null,
            addressId: addressId || null,
            items: {
              create: providerGroup.items.map((item) => ({
                serviceId: item.serviceId || null,
                skuId: item.skuId || null,
                title: item.title,
                price: item.price,
                quantity: item.quantity,
                image: item.image || null,
                itemMeta: checkoutMeta
              }))
            }
          },
          include: {
            buyer: { select: { id: true, username: true } },
            items: true
          }
        });

        createdOrders.push(createdOrder);
      }

      await tx.user.update({
        where: { id: buyer.id },
        data: {
          walletBalance: balanceAfterOut,
          walletPoints: balanceAfterPoint
        }
      });

      await tx.userTransaction.create({
        data: {
          userId: buyer.id,
          type: 'payment',
          title: splitCheckout ? 'Purchase (Split Checkout)' : 'Purchase',
          amount: -orderAmount,
          balanceAfter: balanceAfterOut,
          channel: 'wallet',
          status: 'completed',
          orderId: splitCheckout ? checkoutId : providerOrderGroups[0]?.orderId || null,
          counterparty: splitCheckout ? 'Multi Provider' : providerOrderGroups[0]?.providerId || 'Marketplace'
        }
      });

      if (pointsAwarded > 0) {
        await tx.userTransaction.create({
          data: {
            userId: buyer.id,
            type: 'points',
            title: 'Purchase reward',
            amount: pointsAwarded,
            balanceAfter: balanceAfterPoint,
            isPoints: true,
            channel: 'reward',
            status: 'completed',
            orderId: splitCheckout ? checkoutId : providerOrderGroups[0]?.orderId || null,
            counterparty: 'System'
          }
        });
      }

      const serviceSalesMap = validatedItems.reduce((acc, item) => {
        if (!item.serviceId) return acc;
        acc[item.serviceId] = (acc[item.serviceId] || 0) + item.quantity;
        return acc;
      }, {});

      for (const [serviceId, incrementBy] of Object.entries(serviceSalesMap)) {
        await tx.service.update({
          where: { id: serviceId },
          data: { sales: { increment: incrementBy } }
        });
      }

      const providerGroups = providerOrderGroups.filter((group) => group.providerId);
      if (providerGroups.length > 0) {
        const providerIds = providerGroups.map((group) => group.providerId);
        const providers = await tx.user.findMany({
          where: { id: { in: providerIds } }
        });
        const providerMap = new Map(providers.map((provider) => [provider.id, provider]));

        for (const group of providerGroups) {
          const provider = providerMap.get(group.providerId);
          if (!provider) {
            const err = new Error(`Provider not found: ${group.providerId}`);
            err.statusCode = 500;
            throw err;
          }

          const balanceAfterProvider = Number(provider.walletBalance || 0) + group.orderAmount;
          await tx.user.update({
            where: { id: provider.id },
            data: { walletBalance: balanceAfterProvider }
          });

          await tx.userTransaction.create({
            data: {
              userId: provider.id,
              type: 'income',
              title: 'Order Revenue',
              amount: group.orderAmount,
              balanceAfter: balanceAfterProvider,
              channel: 'payout',
              status: 'completed',
              orderId: group.orderId,
              counterparty: buyer.username || 'Buyer'
            }
          });
        }
      }

      return {
        splitCheckout,
        checkoutId,
        orderAmount,
        pointsAwarded,
        orderCount: createdOrders.length,
        orders: createdOrders
      };
    });

    if (!orderResult.splitCheckout) {
      return res.status(201).json(mapOrderFromDb(orderResult.orders[0]));
    }

    const mappedOrders = orderResult.orders.map((order) => mapOrderFromDb(order));
    return res.status(201).json({
      split: true,
      checkoutId: orderResult.checkoutId,
      totalAmount: orderResult.orderAmount,
      orderCount: orderResult.orderCount,
      pointsAwarded: orderResult.pointsAwarded,
      orders: mappedOrders
    });
  } catch (error) {
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return res.status(400).json({
        code: error.code,
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

    const requestedStatus = String(req.body.status || '').trim();
    const currentStatus = order.status;
    const requesterId = req.user?.id;
    const requesterIsAdmin = isAdminUser(req.user);
    const requesterIsProvider = Boolean(order.providerId && order.providerId === requesterId);

    if (!requestedStatus) {
      return res.status(400).json({ message: 'Missing target status' });
    }

    if (!requesterIsAdmin && !requesterIsProvider) {
      return res.status(403).json({ message: 'Only the provider can update order status' });
    }

    const validTransitions = {
      pending: ['paid'],
      paid: ['shipped'],
      shipped: ['completed']
    };

    if (currentStatus !== requestedStatus) {
      if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(requestedStatus)) {
        return res.status(400).json({
          message: `Cannot transition order status from ${currentStatus} to ${requestedStatus}`
        });
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: requestedStatus },
      include: {
        buyer: { select: { id: true, username: true, email: true } },
        service: true
      }
    });

    res.json(mapOrderFromDb(updatedOrder));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/confirm', authenticateToken, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        buyer: { select: { id: true, username: true } },
        items: true
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.buyerId !== req.user.id) {
      return res.status(403).json({ message: 'Only the buyer can confirm receipt' });
    }

    if (order.status !== 'shipped') {
      return res.status(400).json({
        message: `Cannot confirm receipt: order status is "${order.status}", expected "shipped"`
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: 'completed' },
      include: {
        buyer: { select: { id: true, username: true } },
        items: true
      }
    });

    res.json(mapOrderFromDb(updatedOrder));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/cancel', authenticateToken, async (req, res, next) => {
  try {
    const order = await findOrderForCompensation(prisma, req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const requesterIsBuyer = order.buyerId === req.user.id;
    const requesterIsAdmin = isAdminUser(req.user);
    if (!requesterIsBuyer && !requesterIsAdmin) {
      return res.status(403).json({ message: 'Only the buyer can cancel this order' });
    }

    if (String(order.bizType || 'default') !== 'default') {
      return res.status(400).json({ message: 'Use business-specific cancel workflow for this order type' });
    }

    if (order.status !== 'paid') {
      return res.status(400).json({
        message: `Cannot cancel order: order status is "${order.status}", expected "paid"`
      });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const latestOrder = await findOrderForCompensation(tx, req.params.id);
      if (!latestOrder) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
      }

      if (latestOrder.status !== 'paid') {
        const err = new Error(`Cannot cancel order: order status is "${latestOrder.status}", expected "paid"`);
        err.statusCode = 400;
        throw err;
      }

      return applyOrderCompensation(tx, latestOrder, {
        targetStatus: 'cancelled',
        buyerTxTitle: 'Order Cancellation Refund',
        providerTxTitle: 'Order Cancellation Reversal',
        restock: true,
        refundStatus: 'refunded'
      });
    });

    res.json(mapOrderFromDb(updatedOrder));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/refund', authenticateToken, async (req, res, next) => {
  try {
    const restock = req.body?.restock !== false;
    const order = await findOrderForCompensation(prisma, req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const requesterIsBuyer = order.buyerId === req.user.id;
    const requesterIsProvider = order.providerId === req.user.id || order.service?.userId === req.user.id;
    const requesterIsAdmin = isAdminUser(req.user);
    if (!requesterIsBuyer && !requesterIsProvider && !requesterIsAdmin) {
      return res.status(403).json({ message: 'Only buyer, provider, or admin can refund this order' });
    }

    if (String(order.bizType || 'default') !== 'default') {
      return res.status(400).json({ message: 'Use business-specific refund workflow for this order type' });
    }

    if (!['shipped', 'completed'].includes(order.status)) {
      return res.status(400).json({
        message: `Cannot refund order: order status is "${order.status}", expected "shipped" or "completed"`
      });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const latestOrder = await findOrderForCompensation(tx, req.params.id);
      if (!latestOrder) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
      }

      if (!['shipped', 'completed'].includes(latestOrder.status)) {
        const err = new Error(
          `Cannot refund order: order status is "${latestOrder.status}", expected "shipped" or "completed"`
        );
        err.statusCode = 400;
        throw err;
      }

      return applyOrderCompensation(tx, latestOrder, {
        targetStatus: 'refunded',
        buyerTxTitle: 'Order Refund',
        providerTxTitle: 'Order Refund Reversal',
        restock
      });
    });

    res.json(mapOrderFromDb(updatedOrder));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        buyer: { select: { id: true, username: true } },
        items: true,
        service: { select: { id: true, title: true, image: true, userId: true } }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isBuyer = order.buyerId === req.user.id;
    const isProvider = order.providerId === req.user.id || order.service?.userId === req.user.id;

    if (!isBuyer && !isProvider) {
      return res.status(403).json({ message: 'You do not have access to this order' });
    }

    res.json(mapOrderFromDb(order));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
