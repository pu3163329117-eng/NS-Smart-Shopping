const express = require('express');
const router = express.Router();
const { readJSON, writeJSON } = require('../utils/db');
const authenticateToken = require('../middleware/auth');

router.post('/', authenticateToken, (req, res) => {
  const orders = readJSON('orders');
  const users = readJSON('users');
  const userIndex = users.findIndex(u => u.id === req.user.id);
  
  if (userIndex === -1) return res.sendStatus(404);

  const { items, total } = req.body;
  const orderAmount = parseFloat(total);
  
  // Check Balance
  const userWallet = users[userIndex].wallet || { balance: 0 };
  
  if (userWallet.balance < orderAmount) {
    return res.status(400).json({ 
      code: 'INSUFFICIENT_FUNDS',
      message: '余额不足，请充值' 
    });
  }
  
  // Deduct Balance
  users[userIndex].wallet.balance -= orderAmount;
  
  // Award Points for Purchase (e.g. 1 point per 10 currency)
  const pointsAwarded = Math.floor(orderAmount / 10);
  users[userIndex].wallet.points = (users[userIndex].wallet.points || 0) + pointsAwarded;

  // Record Transaction (Expense)
  if (!users[userIndex].transactions) {
    users[userIndex].transactions = [];
  }
  users[userIndex].transactions.unshift({
    id: 'tx-out-' + Date.now(),
    type: 'expense',
    title: '购买商品',
    amount: -orderAmount,
    date: new Date().toISOString()
  });

  // Record Transaction (Points Gain)
  if (pointsAwarded > 0) {
      users[userIndex].transactions.unshift({
        id: 'tx-pt-' + Date.now(),
        type: 'points',
        title: '购物奖励积分',
        amount: pointsAwarded, // This is points, handle display in frontend
        isPoints: true,
        date: new Date().toISOString()
      });
  }

  writeJSON('users', users);
  
  const newOrder = {
    id: 'ord-' + Date.now(),
    items: items || [],
    amount: orderAmount || 0,
    status: 'paid', // Directly paid since balance is deducted
    createdAt: new Date().toISOString(),
    buyer: {
      id: req.user.id,
      username: users[userIndex].username
    },
    // Infer provider from first item (Simplified for single-maker orders)
    providerId: items && items.length > 0 ? items[0].providerId : null
  };
  
  orders.unshift(newOrder); // Add to beginning
  writeJSON('orders', orders);
  
  res.status(201).json(newOrder);
});

router.put('/:id/status', authenticateToken, (req, res) => {
  const orders = readJSON('orders');
  const orderIndex = orders.findIndex(o => o.id === req.params.id);
  
  if (orderIndex === -1) {
    return res.status(404).json({ message: 'Order not found' });
  }
  
  const { status } = req.body;
  orders[orderIndex].status = status;
  
  // Auto-transition logic for demo
  if (status === 'paid') {
    orders[orderIndex].status = 'pending_shipment';
    // Simulate auto-shipment after 5 seconds for demo
    setTimeout(() => {
      const currentOrders = readJSON('orders');
      const idx = currentOrders.findIndex(o => o.id === req.params.id);
      if (idx !== -1) {
        currentOrders[idx].status = 'shipped';
        writeJSON('orders', currentOrders);
      }
    }, 5000);
  }
  
  writeJSON('orders', orders);
  res.json(orders[orderIndex]);
});

module.exports = router;
