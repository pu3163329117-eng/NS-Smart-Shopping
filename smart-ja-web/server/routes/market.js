const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { mapServiceFromDb } = require('../utils/dataMappers');

router.get('/services', async (req, res, next) => {
  try {
    const services = await prisma.service.findMany({
      include: {
        user: { select: { username: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(services.map((service) => mapServiceFromDb(service)));
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
