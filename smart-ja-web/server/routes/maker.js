const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/auth');
const validate = require('../middleware/validate');
const Joi = require('joi');
const {
  ensureArray,
  mapOrderFromDb,
  mapServiceFromDb
} = require('../utils/dataMappers');

const serviceSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  price: Joi.number().min(0).required(),
  type: Joi.string().valid('course', '3d_print', 'custom').required(),
  productionMode: Joi.string().valid('self', 'factory').allow(null).optional(),
  factoryData: Joi.object().allow(null).optional(),
  image: Joi.string().uri().allow(null, ''),
  details: Joi.string().allow(null, ''),
  tags: Joi.array().items(Joi.string())
});

router.get('/services', authenticateToken, async (req, res, next) => {
  try {
    const services = await prisma.service.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(services.map((service) => mapServiceFromDb(service)));
  } catch (error) {
    next(error);
  }
});

router.post('/services', authenticateToken, validate(serviceSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user) {
      return res.sendStatus(404);
    }

    const service = await prisma.service.create({
      data: {
        id: `svc-${Date.now()}`,
        title: req.body.title,
        description: req.body.description,
        price: Number(req.body.price),
        type: req.body.type || null,
        productionMode: req.body.productionMode || null,
        factoryData: req.body.factoryData || null,
        image: req.body.image || null,
        details: req.body.details || null,
        tags: ensureArray(req.body.tags),
        status: 'active',
        sales: 0,
        views: 0,
        userId: req.user.id,
        provider: user.username || 'Maker'
      }
    });

    res.json(mapServiceFromDb(service, { providerName: user.username }));
  } catch (error) {
    next(error);
  }
});

router.put('/services/:id', authenticateToken, validate(serviceSchema), async (req, res, next) => {
  try {
    const existingService = await prisma.service.findUnique({
      where: { id: req.params.id }
    });

    if (!existingService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (existingService.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to edit this service' });
    }

    const updatedService = await prisma.service.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title,
        description: req.body.description,
        price: Number(req.body.price),
        type: req.body.type || null,
        productionMode: req.body.productionMode || null,
        factoryData: req.body.factoryData || null,
        image: req.body.image || null,
        details: req.body.details || null,
        tags: ensureArray(req.body.tags)
      }
    });

    res.json(mapServiceFromDb(updatedService));
  } catch (error) {
    next(error);
  }
});

router.delete('/services/:id', authenticateToken, async (req, res, next) => {
  try {
    const service = await prisma.service.findUnique({ where: { id: req.params.id } });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (service.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to delete this service' });
    }

    await prisma.service.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/orders', authenticateToken, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        buyer: { select: { id: true, username: true } },
        service: { select: { id: true, userId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    let myOrders = orders.filter((order) => {
      if (order.providerId === req.user.id) {
        return true;
      }

      if (order.service && order.service.userId === req.user.id) {
        return true;
      }

      return ensureArray(order.items).some(
        (item) => item && (item.providerId === req.user.id || item.userId === req.user.id)
      );
    });

    if (req.query.status) {
      myOrders = myOrders.filter((order) => order.status === req.query.status);
    }

    res.json(myOrders.map((order) => mapOrderFromDb(order)));
  } catch (error) {
    next(error);
  }
});

router.post('/orders/:id/complete', authenticateToken, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        buyer: { select: { id: true, username: true } },
        service: { select: { id: true, userId: true } }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    let isMaker = false;
    if (order.providerId === req.user.id) isMaker = true;
    if (order.service && order.service.userId === req.user.id) isMaker = true;
    const items = ensureArray(order.items);
    if (!isMaker && items.some((item) => item && (item.providerId === req.user.id || item.userId === req.user.id))) {
      isMaker = true;
    }

    if (!isMaker) {
      return res.status(403).json({ message: 'Unauthorized to complete this order' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: 'completed' },
      include: {
        buyer: { select: { id: true, username: true } },
        service: { select: { id: true, userId: true } }
      }
    });

    res.json(mapOrderFromDb(updatedOrder));
  } catch (error) {
    next(error);
  }
});

router.patch('/orders/:id/status', authenticateToken, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: 'status required' });
    }

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        buyer: { select: { id: true, username: true } },
        service: { select: { id: true, userId: true } }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    let isMaker = false;
    if (order.providerId === req.user.id) isMaker = true;
    if (order.service && order.service.userId === req.user.id) isMaker = true;
    const items = ensureArray(order.items);
    if (!isMaker && items.some((item) => item && (item.providerId === req.user.id || item.userId === req.user.id))) {
      isMaker = true;
    }

    if (!isMaker) {
      return res.status(403).json({ message: 'Unauthorized to update this order' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        buyer: { select: { id: true, username: true } },
        service: { select: { id: true, userId: true } }
      }
    });

    res.json(mapOrderFromDb(updatedOrder));
  } catch (error) {
    next(error);
  }
});

router.get('/stats', authenticateToken, async (req, res, next) => {
  try {
    const [services, orders] = await Promise.all([
      prisma.service.findMany({
        where: { userId: req.user.id },
        select: { views: true }
      }),
      prisma.order.findMany({
        include: {
          service: { select: { userId: true } }
        }
      })
    ]);

    const relatedOrders = orders.filter(
      (order) => order.providerId === req.user.id || order.service?.userId === req.user.id
    );

    res.json({
      earnings: relatedOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0),
      views: services.reduce((sum, service) => sum + (service.views || 0), 0),
      orders: relatedOrders.length
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
