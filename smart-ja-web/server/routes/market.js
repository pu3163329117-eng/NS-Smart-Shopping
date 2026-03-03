const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { mapServiceFromDb } = require('../utils/dataMappers');

router.get('/services', async (req, res, next) => {
  try {
    const { q, limit = '24', cursor, sortBy = 'latest', category } = req.query;

    const queryOptions = {
      include: {
        user: { select: { username: true, reputation: true, sign: true } }
      },
      take: parseInt(limit, 10),
      where: {
        status: 'active' // Only show active services in the market
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

    const services = await prisma.service.findMany(queryOptions);

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
        user: { select: { username: true } }
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
    const services = await prisma.service.findMany({
      include: {
        user: { select: { username: true } }
      },
      orderBy: [{ sales: 'desc' }, { createdAt: 'desc' }],
      take: 4
    });

    res.json(services.map((service) => mapServiceFromDb(service)));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
