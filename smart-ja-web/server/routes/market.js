const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { mapServiceFromDb } = require('../utils/dataMappers');
const { getOrSetCache, invalidateCache } = require('../utils/redis');

const LEGACY_FAKE_PATTERNS = [
  'ecofuture notebook',
  'techkid kit',
  'artspace hoodie',
  'liusheng toy',
  'image placeholder'
];

const isSmokeTestService = (service) => {
  const title = String(service?.title || '').toLowerCase();
  const description = String(service?.description || '').toLowerCase();
  const provider = String(service?.provider || '').toLowerCase();
  const serviceType = String(service?.type || '').toLowerCase();
  const tags = Array.isArray(service?.tags)
    ? service.tags.map((tag) => String(tag).toLowerCase())
    : [];

  if (serviceType === 'gushi' || serviceType === 'crowdfunding') return true;
  if (title.includes('mvp smoke') || description.includes('smoke-test')) return true;
  if (title.includes('placeholder') || description.includes('placeholder')) return true;
  if (provider.includes('mvp smoke') || provider.includes('smoke-test')) return true;
  if (LEGACY_FAKE_PATTERNS.some((pattern) => title.includes(pattern) || description.includes(pattern))) return true;
  return tags.some((tag) => tag.includes('smoke') || tag.includes('test'));
};

router.get('/services', async (req, res, next) => {
  try {
    const { q, limit = '24', cursor, sortBy = 'latest', category } = req.query;

    const queryOptions = {
      include: {
        user: { select: { username: true, reputation: true, sign: true } }
      },
      take: parseInt(limit, 10),
      where: {
        status: 'active', // Only show active services in the market
        NOT: [{ type: 'crowdfunding' }, { type: 'gushi' }]
      }
    };

    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1; // Skip the cursor itself
    }

    // Full-text search emulation via Prisma's contains
    if (q) {
      queryOptions.where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { has: q } }
      ];
    }

    if (category) {
      queryOptions.where.tags = { has: category };
    }

    // Sorting Logic
    switch (sortBy) {
      case 'price_asc':
        queryOptions.orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        queryOptions.orderBy = { price: 'desc' };
        break;
      case 'sales_desc':
        queryOptions.orderBy = { sales: 'desc' };
        break;
      case 'views_desc':
        queryOptions.orderBy = { views: 'desc' };
        break;
      case 'latest':
      default:
        queryOptions.orderBy = { createdAt: 'desc' };
        break;
    }

    const services = (await prisma.service.findMany(queryOptions)).filter((service) => !isSmokeTestService(service));

    const mappedServices = services.map((service) => mapServiceFromDb(service));

    const nextCursor = services.length === parseInt(limit, 10) ? services[services.length - 1].id : null;

    res.json({
      data: mappedServices,
      nextCursor
    });

  } catch (error) {
    next(error);
  }
});

router.get('/services/:id', async (req, res, next) => {
  try {
    const service = await prisma.service.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { username: true } },
        skus: {
          orderBy: { sort: 'asc' }
        }
      }
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json(mapServiceFromDb(service));
  } catch (error) {
    next(error);
  }
});

router.get('/featured', async (req, res, next) => {
  try {
    const services = await getOrSetCache('market:featured', 120, () =>
      prisma.service.findMany({
        include: {
          user: { select: { username: true } }
        },
        where: {
          status: 'active',
          NOT: [{ type: 'crowdfunding' }, { type: 'gushi' }]
        },
        orderBy: [{ sales: 'desc' }, { createdAt: 'desc' }],
        take: 12
      })
    );

    res.json(
      services
        .filter((service) => !isSmokeTestService(service))
        .slice(0, 4)
        .map((service) => mapServiceFromDb(service))
    );
  } catch (error) {
    next(error);
  }
});

router.get('/services/:id/reviews', async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { serviceId: req.params.id },
      include: {
        author: { select: { id: true, username: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

const authenticateToken = require('../middleware/auth');

router.post('/services/:id/reviews', authenticateToken, async (req, res, next) => {
  try {
    const { orderId, rating, content, images } = req.body;
    const serviceId = req.params.id;
    const userId = req.user.id;

    if (!orderId || !rating || !content) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // 检查这个订单是不是真的属于当前用户，且有没有包含这个商品，且状态是已完成
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order || order.buyerId !== userId) {
      return res.status(403).json({ message: 'Order not found or not yours' });
    }

    if (order.status !== 'completed' && order.status !== 'shipped' && order.status !== 'paid') {
      return res.status(400).json({ message: 'Order not eligible for review' });
    }

    // 检查之前是否已经评价过该订单
    const existingReview = await prisma.review.findUnique({
      where: { orderId }
    });

    if (existingReview) {
      return res.status(400).json({ message: 'This order has already been reviewed' });
    }

    const review = await prisma.review.create({
      data: {
        serviceId,
        userId,
        orderId,
        rating: Number(rating),
        content,
        images: images || [],
      },
      include: {
        author: { select: { id: true, username: true, avatar: true } }
      }
    });

    // Invalidate product review cache on new review
    invalidateCache(`market:reviews:${serviceId}`).catch(() => {});

    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
