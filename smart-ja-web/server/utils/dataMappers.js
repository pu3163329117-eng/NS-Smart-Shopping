const DEFAULT_SIGN = '让生活更简单';
const DEFAULT_STATS = { likes: 0, following: 0, followers: 0 };
const DEFAULT_INTERACTION_COUNTS = {
  want: 0,
  owned: 0,
  footprints: 0,
  brandFollowing: 0
};
const DEFAULT_PROFILE_WALLET = { coupons: 2, balance: 0, points: 100 };

const toIsoString = (value) => {
  if (!value) {
    return value;
  }

  return value instanceof Date ? value.toISOString() : value;
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);
const ensureObject = (value, fallback) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;

const mapUserFromDb = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    password: user.password,
    username: user.username,
    avatar: user.avatar,
    sign: user.sign || DEFAULT_SIGN,
    gender: user.gender || 'male',
    level: user.level ?? 1,
    exp: user.exp ?? 0,
    reputation: user.reputation || '优秀',
    backgroundImage: user.backgroundImage || null,
    stats: ensureObject(user.stats, DEFAULT_STATS),
    wallet: {
      coupons: user.walletCoupons ?? DEFAULT_PROFILE_WALLET.coupons,
      balance: Number(user.walletBalance ?? DEFAULT_PROFILE_WALLET.balance),
      points: user.walletPoints ?? DEFAULT_PROFILE_WALLET.points
    },
    interactionCounts: ensureObject(user.interactionCounts, DEFAULT_INTERACTION_COUNTS),
    addresses: ensureArray(user.addresses),
    transactions: ensureArray(user.transactions),
    lastCheckinDate: user.lastCheckinDate || null,
    createdAt: toIsoString(user.createdAt),
    updatedAt: toIsoString(user.updatedAt)
  };
};

const mapUserForAuth = (user) => {
  const mapped = mapUserFromDb(user);

  if (!mapped) {
    return null;
  }

  delete mapped.password;
  return mapped;
};

const toUserPersistence = (input = {}) => ({
  id: input.id,
  email: input.email,
  password: input.password,
  username: input.username,
  avatar: input.avatar || null,
  sign: input.sign || null,
  gender: input.gender || null,
  level: input.level ?? 1,
  exp: input.exp ?? 0,
  reputation: input.reputation || null,
  backgroundImage: input.backgroundImage || null,
  walletCoupons: input.wallet?.coupons ?? 0,
  walletBalance: Number(input.wallet?.balance ?? 0),
  walletPoints: input.wallet?.points ?? 0,
  addresses: ensureArray(input.addresses),
  stats: ensureObject(input.stats, DEFAULT_STATS),
  interactionCounts: ensureObject(input.interactionCounts, DEFAULT_INTERACTION_COUNTS),
  transactions: ensureArray(input.transactions),
  lastCheckinDate: input.lastCheckinDate || null,
  createdAt: input.createdAt ? new Date(input.createdAt) : undefined
});

const mapServiceFromDb = (service, options = {}) => {
  if (!service) {
    return null;
  }

  const providerName =
    service.provider ||
    options.providerName ||
    service.user?.username ||
    'Maker';
  const description = service.description || '';

  return {
    id: service.id,
    title: service.title,
    description,
    desc: description,
    price: Number(service.price ?? 0),
    type: service.type || null,
    productionMode: service.productionMode || null,
    factoryData: service.factoryData || null,
    image: service.image || '',
    details: service.details || '',
    tags: ensureArray(service.tags),
    createdAt: toIsoString(service.createdAt),
    updatedAt: toIsoString(service.updatedAt),
    status: service.status || 'active',
    sales: service.sales ?? 0,
    views: service.views ?? 0,
    userId: service.userId,
    provider: providerName
  };
};

const toServicePersistence = (input = {}, user) => ({
  id: input.id,
  title: input.title,
  description: input.description || input.desc || '',
  price: Number(input.price ?? 0),
  type: input.type || null,
  productionMode: input.productionMode || null,
  factoryData: input.factoryData || null,
  image: input.image || null,
  details: input.details || null,
  tags: ensureArray(input.tags),
  status: input.status || 'active',
  sales: input.sales ?? 0,
  views: input.views ?? 0,
  userId: input.userId || user.id,
  provider: input.provider || user.username || 'Maker',
  createdAt: input.createdAt ? new Date(input.createdAt) : undefined
});

const mapOrderFromDb = (order) => {
  if (!order) {
    return null;
  }

  const items = ensureArray(order.items);
  const firstItem = items[0] || {};

  const statusLabels = {
    pending: '待处理',
    paid: '待发货',
    shipped: '已发货',
    completed: '已完成'
  };

  return {
    id: order.id,
    items: items,
    amount: Number(order.amount ?? 0),
    status: order.status || 'paid',
    statusLabel: statusLabels[order.status] || order.status || '未知状态',
    createdAt: toIsoString(order.createdAt),
    updatedAt: toIsoString(order.updatedAt),
    buyer: order.buyer
      ? {
        id: order.buyer.id,
        username: order.buyer.username,
        email: order.buyer.email
      }
      : null,
    providerId:
      order.providerId ||
      firstItem.providerId ||
      firstItem.userId ||
      null,
    serviceId: order.serviceId || null,
    serviceTitle: order.service?.title || firstItem.title || firstItem.name || '未知服务',
    servicePrice: Number(order.service?.price || firstItem.price || order.amount || 0),
    availableActions: order.status === 'paid'
      ? ['ship', 'complete']
      : (order.status === 'shipped' || order.status === 'pending' ? ['complete'] : [])
  };
};

const toOrderPersistence = (input = {}, buyerId) => ({
  id: input.id,
  buyerId,
  serviceId: input.serviceId || null,
  providerId:
    input.providerId ||
    ensureArray(input.items)[0]?.providerId ||
    ensureArray(input.items)[0]?.userId ||
    null,
  items: ensureArray(input.items),
  amount: Number(input.amount ?? 0),
  status: input.status || 'paid',
  createdAt: input.createdAt ? new Date(input.createdAt) : undefined
});

module.exports = {
  DEFAULT_PROFILE_WALLET,
  DEFAULT_STATS,
  DEFAULT_INTERACTION_COUNTS,
  ensureArray,
  mapOrderFromDb,
  mapServiceFromDb,
  mapUserForAuth,
  mapUserFromDb,
  toOrderPersistence,
  toServicePersistence,
  toUserPersistence
};
