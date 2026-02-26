import express from 'express';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Service from '../models/Service.js';
import auth from '../middlewares/auth.js';
import sequelize from '../config/database.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Orders (订单)
 *   description: 订单交易与管理 (Order Processing)
 */

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: 创建新订单 (Create Order)
 *     description: 购买服务并扣除余额 (Purchase service & deduct balance)
 *     tags: [Orders (订单)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *             properties:
 *               serviceId:
 *                 type: string
 *                 description: 服务 ID (Service UUID)
 *               notes:
 *                 type: string
 *                 description: 备注信息 (Order Notes)
 *     responses:
 *       201:
 *         description: 订单创建成功 (Order Created)
 *       400:
 *         description: 余额不足或服务无效 (Insufficient Balance / Invalid Service)
 */
router.post('/', auth, async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { serviceId, notes } = req.body;
    const buyerId = req.user.id;

    // 1. Validate Service
    const service = await Service.findByPk(serviceId);
    if (!service) {
      await t.rollback();
      return res.status(404).json({ message: 'Service not found' });
    }

    // 2. Check Buyer Balance (Optional: skipping for demo or assuming unlimited funds for now, 
    //    or implementing simple check if user has balance field)
    const buyer = await User.findByPk(buyerId);
    if (parseFloat(buyer.balance) < parseFloat(service.price)) {
       await t.rollback();
       return res.status(400).json({ message: 'Insufficient balance' });
    }

    // 3. Create Order
    const order = await Order.create({
      buyer_id: buyerId,
      service_id: serviceId,
      amount: service.price,
      status: 'paid', // Auto-pay for demo
      notes
    }, { transaction: t });

    // 4. Update Buyer Balance
    await buyer.decrement('balance', { by: service.price, transaction: t });

    // 5. Update Service Sales Count
    await service.increment('sales', { by: 1, transaction: t });
    
    // 6. Update Provider Balance (Optional: add earnings to maker)
    const provider = await User.findByPk(service.provider_id);
    if (provider) {
        await provider.increment('balance', { by: service.price, transaction: t });
    }

    await t.commit();
    
    res.status(201).json(order);
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /orders/my:
 *   get:
 *     summary: 获取我的购买记录 (Get My Orders)
 *     description: 作为买家查询历史订单 (As a buyer)
 *     tags: [Orders (订单)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 订单列表 (List of orders)
 */
router.get('/my', auth, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { buyer_id: req.user.id },
      include: [
        { 
            model: Service, 
            as: 'service',
            attributes: ['id', 'title', 'price', 'image', 'type']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /orders/maker:
 *   get:
 *     summary: 获取收到的订单 (Get Received Orders)
 *     description: 作为创客查询销售记录 (As a maker)
 *     tags: [Orders (订单)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 销售订单列表 (List of sales)
 */
router.get('/maker', auth, async (req, res) => {
  try {
    // Find all services by this user
    const services = await Service.findAll({
        where: { provider_id: req.user.id },
        attributes: ['id']
    });
    const serviceIds = services.map(s => s.id);

    const orders = await Order.findAll({
      where: { service_id: serviceIds },
      include: [
        { model: User, as: 'buyer', attributes: ['username', 'email'] },
        { model: Service, as: 'service', attributes: ['title', 'price'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
