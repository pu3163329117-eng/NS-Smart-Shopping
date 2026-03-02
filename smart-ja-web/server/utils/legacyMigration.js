const fs = require('fs');
const path = require('path');
const prisma = require('./prisma');
const { hashPassword } = require('./auth');
const {
  toOrderPersistence,
  toServicePersistence,
  toUserPersistence
} = require('./dataMappers');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../db');

const LEGACY_COLLECTIONS = {
  users: 'users.json',
  services: 'services.json',
  orders: 'orders.json'
};

const readLegacyCollection = (filename) => {
  const filePath = path.join(DB_PATH, filename);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Failed to parse ${filename}:`, error.message);
    return [];
  }
};

const ensureHashedPassword = async (password) => {
  if (!password) {
    return await hashPassword('password');
  }

  if (password.startsWith('$2a$') || password.startsWith('$2b$') || password.startsWith('$2y$')) {
    return password;
  }

  return await hashPassword(password);
};

const buildPlaceholderUser = (id) => ({
  id,
  email: `${id}@legacy.local`,
  password: 'password',
  username: id,
  wallet: { coupons: 0, balance: 0, points: 0 },
  addresses: [],
  transactions: [],
  stats: null,
  interactionCounts: null
});

const migrateLegacyData = async () => {
  const [userCount, serviceCount, orderCount] = await Promise.all([
    prisma.user.count(),
    prisma.service.count(),
    prisma.order.count()
  ]);

  if (userCount || serviceCount || orderCount) {
    return { skipped: true };
  }

  const users = readLegacyCollection(LEGACY_COLLECTIONS.users);
  const services = readLegacyCollection(LEGACY_COLLECTIONS.services);
  const orders = readLegacyCollection(LEGACY_COLLECTIONS.orders);

  const usersById = new Map(users.map((user) => [user.id, user]));

  for (const service of services) {
    if (service.userId && !usersById.has(service.userId)) {
      usersById.set(service.userId, buildPlaceholderUser(service.userId));
    }
  }

  for (const order of orders) {
    const buyerId = order.buyer?.id;
    if (buyerId && !usersById.has(buyerId)) {
      usersById.set(buyerId, buildPlaceholderUser(buyerId));
    }
  }

  for (const user of usersById.values()) {
    const payload = toUserPersistence({
      ...user,
      password: await ensureHashedPassword(user.password)
    });

    if (!payload.id || !payload.email) {
      continue;
    }

    await prisma.user.upsert({
      where: { id: payload.id },
      update: payload,
      create: payload
    });
  }

  for (const service of services) {
    const owner = usersById.get(service.userId);

    if (!service.id || !service.userId || !owner) {
      continue;
    }

    const payload = toServicePersistence(
      {
        ...service,
        description: service.description || service.desc || '',
        status: service.status || 'active',
        sales: service.sales ?? 0,
        views: service.views ?? 0
      },
      owner
    );

    await prisma.service.upsert({
      where: { id: payload.id },
      update: payload,
      create: payload
    });
  }

  for (const order of orders) {
    const buyerId = order.buyer?.id;

    if (!order.id || !buyerId || !usersById.has(buyerId)) {
      continue;
    }

    const matchedServiceId = Array.isArray(order.items)
      ? order.items.find((item) => item && item.id)?.id
      : null;
    const serviceExists = matchedServiceId
      ? await prisma.service.findUnique({ where: { id: matchedServiceId }, select: { id: true } })
      : null;
    const payload = toOrderPersistence(
      {
        id: order.id,
        items: order.items || [],
        amount: order.amount ?? order.total ?? 0,
        status: order.status || 'paid',
        providerId: order.providerId || null,
        serviceId: serviceExists?.id || null,
        createdAt: order.createdAt
      },
      buyerId
    );

    await prisma.order.upsert({
      where: { id: payload.id },
      update: payload,
      create: payload
    });
  }

  return {
    skipped: false,
    users: usersById.size,
    services: services.length,
    orders: orders.length
  };
};

module.exports = {
  migrateLegacyData
};
