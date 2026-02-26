const express = require('express');
const router = express.Router();
const { readJSON } = require('../utils/db');

router.get('/services', (req, res) => {
  const services = readJSON('services');
  res.json(services);
});

router.get('/featured', (req, res) => {
  const services = readJSON('services');
  // Sort by sales (desc) or newest
  const featured = services
    .sort((a, b) => (b.sales || 0) - (a.sales || 0))
    .slice(0, 4); // Top 4
  res.json(featured);
});

module.exports = router;
