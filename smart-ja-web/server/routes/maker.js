const express = require('express');
const router = express.Router();
const { readJSON, writeJSON } = require('../utils/db');
const authenticateToken = require('../middleware/auth');
const validate = require('../middleware/validate');
const Joi = require('joi');

const serviceSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  price: Joi.number().min(0).required(),
  type: Joi.string().valid('course', '3d_print', 'custom').required(),
  productionMode: Joi.string().valid('self', 'factory').optional(),
  factoryData: Joi.object().optional(),
  image: Joi.string().uri().allow(''),
  details: Joi.string().allow(''),
  tags: Joi.array().items(Joi.string())
});

router.get('/services', authenticateToken, (req, res) => {
  const services = readJSON('services');
  // Filter by logged in user ID
  const myServices = services.filter(s => s.userId === req.user.id);
  res.json(myServices);
});

router.post('/services', authenticateToken, validate(serviceSchema), (req, res) => {
  const services = readJSON('services');
  const newService = {
    id: 'svc-' + Date.now(),
    ...req.body,
    createdAt: new Date().toISOString(),
    status: 'active',
    sales: 0,
    views: 0,
    userId: req.user.id,
    provider: req.user.username || 'Maker' // Should get from user profile
  };
  services.push(newService);
  writeJSON('services', services);
  res.json(newService);
});

router.put('/services/:id', authenticateToken, validate(serviceSchema), (req, res) => {
  const services = readJSON('services');
  const index = services.findIndex(s => s.id === req.params.id);
  
  if (index === -1) return res.status(404).json({ message: 'Service not found' });
  
  if (services[index].userId !== req.user.id) {
    return res.status(403).json({ message: 'Unauthorized to edit this service' });
  }
  
  const updatedService = {
    ...services[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  services[index] = updatedService;
  writeJSON('services', services);
  res.json(updatedService);
});

router.delete('/services/:id', authenticateToken, (req, res) => {
  let services = readJSON('services');
  const service = services.find(s => s.id === req.params.id);
  
  if (!service) return res.status(404).json({ message: 'Service not found' });
  
  if (service.userId !== req.user.id) {
    return res.status(403).json({ message: 'Unauthorized to delete this service' });
  }
  
  services = services.filter(s => s.id !== req.params.id);
  writeJSON('services', services);
  res.json({ success: true });
});

router.get('/orders', authenticateToken, (req, res) => {
  const orders = readJSON('orders');
  // Filter orders where the current user is the provider
  const myOrders = orders.filter(o => 
    o.providerId === req.user.id || 
    (o.items && o.items.some(i => i.providerId === req.user.id))
  );
  res.json(myOrders);
});

router.get('/stats', authenticateToken, (req, res) => {
  // Mock stats
  res.json({
    earnings: 1250.00,
    views: 342,
    orders: 12
  });
});

module.exports = router;
