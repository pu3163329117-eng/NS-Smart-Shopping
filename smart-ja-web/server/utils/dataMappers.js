const DEFAULT_SIGN = '';
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
    reputation: user.reputation || 'EXCELLENT',
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
  stats: ensureObject(input.stats, DEFAULT_STATS),
  interactionCounts: ensureObject(input.interactionCounts, DEFAULT_INTERACTION_COUNTS),
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
    fundingGoal: service.fundingGoal ?? 10000,
    pledgedAmount: service.pledgedAmount ?? 0,
    backersCount: service.backersCount ?? 0,
    endDate: toIsoString(service.endDate) || null,
    userId: service.userId,
    provider: providerName,
    skus: ensureArray(service.skus)
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
  fundingGoal: input.fundingGoal ?? 10000,
  pledgedAmount: input.pledgedAmount ?? 0,
  backersCount: input.backersCount ?? 0,
  endDate: input.endDate ? new Date(input.endDate) : null,
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
  const firstItemMeta =
    firstItem && firstItem.itemMeta && typeof firstItem.itemMeta === 'object'
      ? firstItem.itemMeta
      : {};
  const checkoutId = order.checkoutId || (firstItemMeta.checkoutId ? String(firstItemMeta.checkoutId) : null);
  const splitOrderCount = Number(order.splitOrderCount || firstItemMeta.splitOrderCount || 0);

  const statusLabels = {
    pending: 'PENDING',
    paid: 'PAID_READY',
    shipped: 'SHIPPED',
    completed: 'COMPLETED',
    cancelled: 'CANCELLED',
    refunded: 'REFUNDED'
  };

  return {
    id: order.id,
    items: items,
    amount: Number(order.amount ?? 0),
    status: order.status || 'paid',
    statusLabel: statusLabels[order.status] || order.status || 'UNKNOWN',
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
    serviceTitle: order.service?.title || firstItem.title || firstItem.name || 'UNKNOWN_SERVICE',
    servicePrice: Number(order.service?.price || firstItem.price || order.amount || 0),
    checkoutId,
    isSplitOrder: Boolean(checkoutId),
    splitOrderCount: splitOrderCount > 0 ? splitOrderCount : null,
    trackingCompany: order.trackingCompany || null,
    trackingNumber: order.trackingNumber || null,
    shippedAt: order.shippedAt ? toIsoString(order.shippedAt) : null,
    availableActions:
      order.status === 'paid'
        ? ['ship', 'cancel']
        : order.status === 'shipped'
          ? ['complete', 'refund']
          : order.status === 'completed'
            ? ['refund']
            : []
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
  amount: Number(input.amount ?? 0),
  status: input.status || 'paid',
  trackingCompany: input.trackingCompany || null,
  trackingNumber: input.trackingNumber || null,
  shippedAt: input.shippedAt ? new Date(input.shippedAt) : null,
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
