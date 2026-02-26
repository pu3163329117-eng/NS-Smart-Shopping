import express from 'express';
import Service from '../models/Service.js';
import User from '../models/User.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Services (服务)
 *   description: 服务发布与查询 (Service Management)
 */

/**
 * @swagger
 * /services:
 *   get:
 *     summary: 获取服务列表 (Get All Services)
 *     description: 返回所有上架的服务 (Return all active services)
 *     tags: [Services (服务)]
 *     responses:
 *       200:
 *         description: 服务列表 (List of services)
 */
router.get('/', async (req, res) => {
  try {
    const services = await Service.findAll({
      include: [{ model: User, as: 'provider', attributes: ['username', 'maker_profile'] }]
    });
    res.json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /services:
 *   post:
 *     summary: 发布新服务 (Publish Service)
 *     description: 仅限创客 (Maker) 角色发布服务 (Publish a new service - Maker Only)
 *     tags: [Services (服务)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - price
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *                 description: 服务名称 (Service Name)
 *               description:
 *                 type: string
 *                 description: 简短描述 (Short Description)
 *               price:
 *                 type: number
 *                 description: 价格 (Price in CNY)
 *               type:
 *                 type: string
 *                 enum: [course, 3d_print, custom]
 *                 description: 服务类型 (Service Type)
 *               details:
 *                 type: string
 *                 description: 详细内容 Markdown (Detailed Content)
 *               image:
 *                 type: string
 *                 description: 封面图片 URL (Cover Image URL)
 *     responses:
 *       201:
 *         description: 服务发布成功 (Service Published Successfully)
 *       403:
 *         description: 无权限 (Forbidden - Maker Only)
 */
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'maker') {
      return res.status(403).json({ message: 'Only makers can publish services' });
    }

    const { title, description, price, type, details, tags, image } = req.body;

    const newService = await Service.create({
      provider_id: req.user.id,
      title,
      description,
      price,
      type,
      details,
      tags,
      image,
      status: 'active' // Auto-activate for demo
    });

    res.status(201).json(newService);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get My Services (Maker)
router.get('/my', auth, async (req, res) => {
  try {
    const services = await Service.findAll({
      where: { provider_id: req.user.id }
    });
    res.json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
