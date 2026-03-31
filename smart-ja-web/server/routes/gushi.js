const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/auth');
const { writeSnapshot } = require('../utils/gushiPrice');
const { getOrSetCache } = require('../utils/redis');

const parseCsvEnv = (...keys) => {
  for (const key of keys) {
    const raw = process.env[key];
    if (!raw) continue;

    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const ADMIN_ID_ALLOWLIST = new Set(parseCsvEnv('GUSHI_ADMIN_IDS', 'ADMIN_USER_IDS'));
const ADMIN_EMAIL_ALLOWLIST = new Set(
  parseCsvEnv('GUSHI_ADMIN_EMAILS', 'ADMIN_EMAILS').map((email) => email.toLowerCase())
);
const IS_ADMIN_ALLOWLIST_CONFIGURED = ADMIN_ID_ALLOWLIST.size > 0 || ADMIN_EMAIL_ALLOWLIST.size > 0;
const ALLOW_DEV_ADMIN_BYPASS = process.env.ALLOW_DEV_ADMIN_BYPASS === 'true';

const getAuthUserId = (req) => req.user?.id || req.user?.userId || null;
const slugify = (value) => {
  if (!value) return `gushi-${Date.now()}`;
  const clean = String(value)
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-\u4e00-\u9fa5]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return clean || `gushi-${Date.now()}`;
};
const PLATFORM_FEE_RATE = Number.isFinite(Number(process.env.GUSHI_PLATFORM_FEE_RATE))
  ? Math.max(0, Math.min(0.5, Number(process.env.GUSHI_PLATFORM_FEE_RATE)))
  : 0.03;
const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const formatMoney = (value) => roundMoney(value).toFixed(2);
const calcSettlementBreakdown = (grossAmount) => {
  const gross = roundMoney(grossAmount);
  const fee = roundMoney(gross * PLATFORM_FEE_RATE);
  const net = roundMoney(gross - fee);
  return { gross, fee, net };
};
const safeNotify = async ({ userId, title, content, type = 'system', link = null }) => {
  if (!userId) return;
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        content,
        type,
        link
      }
    });
  } catch (error) {
    console.error('[gushi notification] failed:', error?.message || error);
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Optional local bypass. Requires explicit flag and non-production mode.
    if (
      !IS_ADMIN_ALLOWLIST_CONFIGURED &&
      ALLOW_DEV_ADMIN_BYPASS &&
      process.env.NODE_ENV !== 'production'
    ) {
      return next();
    }

    if (!IS_ADMIN_ALLOWLIST_CONFIGURED) {
      return res.status(403).json({ success: false, message: 'Admin allowlist is not configured' });
    }

    if (ADMIN_ID_ALLOWLIST.has(authUserId)) {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: authUserId },
      select: { id: true, email: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (user.email && ADMIN_EMAIL_ALLOWLIST.has(String(user.email).toLowerCase())) {
      return next();
    }

    return res.status(403).json({ success: false, message: 'Admin permission required' });
  } catch (error) {
    return next(error);
  }
};

// ==========================================
// 1. Home & Products
// ==========================================
router.get('/home', async (req, res, next) => {
  try {
    const result = await getOrSetCache('gushi:home_feed', 60, async () => {
      const hotProducts = await prisma.gushiProduct.findMany({
        where: { status: 'active' },
        take: 10,
      });
      
      for (const p of hotProducts) {
        p.priceSnapshot = await prisma.gushiPriceSnapshot.findFirst({
          where: { gushiProductId: p.id },
          orderBy: { capturedAt: 'desc' }
        });
      }

      const latestTrades = await prisma.order.findMany({
        where: { bizType: 'gushi', status: 'completed' },
        orderBy: { settledAt: 'desc' },
        take: 10,
        include: { items: true, gushiProduct: true }
      });

      return { hotProducts, latestTrades };
    });

    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

router.get('/products', async (req, res, next) => {
  try {
    const { category, cursor, limit = 20, q } = req.query;
    const query = { status: 'active' };
    if (category) query.category = category;
    if (q) {
      query.OR = [
        { ipName: { contains: q, mode: 'insensitive' } },
        { characterName: { contains: q, mode: 'insensitive' } }
      ];
    }
    
    const products = await prisma.gushiProduct.findMany({
      where: query,
      take: parseInt(limit),
      ...(cursor && { cursor: { id: cursor }, skip: 1 })
    });
    
    for (const p of products) {
      p.priceSnapshot = await prisma.gushiPriceSnapshot.findFirst({
        where: { gushiProductId: p.id },
        orderBy: { capturedAt: 'desc' }
      });
    }
    
    res.json({ success: true, data: products, nextCursor: products.length > 0 ? products[products.length - 1].id : null });
  } catch (error) { next(error); }
});

router.get('/products/:id', async (req, res, next) => {
  try {
    const product = await prisma.gushiProduct.findUnique({
      where: { id: req.params.id }
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    
    const snap = await prisma.gushiPriceSnapshot.findFirst({
      where: { gushiProductId: product.id },
      orderBy: { capturedAt: 'desc' }
    });
    // fetch chart data
    const chartUrl = await prisma.gushiPriceSnapshot.findMany({
      where: { gushiProductId: product.id },
      orderBy: { capturedAt: 'asc' },
      take: 30
    });

    res.json({ success: true, data: { ...product, priceSnapshot: snap, chartData: chartUrl } });
  } catch (error) { next(error); }
});

router.get('/products/:id/trades', async (req, res, next) => {
  try {
    const trades = await prisma.order.findMany({
      where: { bizType: 'gushi', gushiProductId: req.params.id, status: 'completed' },
      orderBy: { settledAt: 'desc' },
      take: 20,
      include: { items: true }
    });
    res.json({ success: true, data: trades });
  } catch (error) { next(error); }
});

router.get('/products/:id/listings', async (req, res, next) => {
  try {
    const listings = await prisma.gushiListing.findMany({
      where: { 
        gushiProductId: req.params.id, 
        status: 'active', 
        auditStatus: 'approved', 
        availableQuantity: { gt: 0 } 
      },
      orderBy: { price: 'asc' },
      take: 20,
      include: { seller: { select: { id: true, username: true, avatar: true } } }
    });
    res.json({ success: true, data: listings });
  } catch (error) { next(error); }
});

router.get('/products/:id/offers', async (req, res, next) => {
  try {
    const take = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
    const offers = await prisma.gushiOffer.findMany({
      where: {
        gushiProductId: req.params.id,
        status: 'active'
      },
      orderBy: [{ price: 'desc' }, { createdAt: 'asc' }],
      take,
      include: {
        buyer: { select: { id: true, username: true, avatar: true } }
      }
    });

    res.json({ success: true, data: offers });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 2. Listings & Favorites
// ==========================================
router.post('/listings', authenticateToken, async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const data = {
      sellerId: authUserId,
      gushiProductId: req.body.gushiProductId,
      conditionGrade: req.body.conditionGrade,
      isOpened: req.body.isOpened || false,
      hasOriginalPackage: req.body.hasOriginalPackage || false,
      defectNotes: req.body.defectNotes,
      images: req.body.images,
      price: req.body.price,
      quantity: req.body.quantity,
      availableQuantity: req.body.quantity,
      status: 'active',
      auditStatus: 'pending'
    };
    const listing = await prisma.gushiListing.create({ data });
    // Update snapshot after new listing
    await writeSnapshot(req.body.gushiProductId);
    res.json({ success: true, data: listing });
  } catch (error) { next(error); }
});

router.post('/listings/:id/offline', authenticateToken, async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const listing = await prisma.gushiListing.findUnique({ where: { id: req.params.id } });
    if (!listing || listing.sellerId !== authUserId) return res.status(403).json({ success: false, message: 'Unauthorized' });
    
    await prisma.gushiListing.update({
      where: { id: req.params.id },
      data: { status: 'offline' }
    });
    await writeSnapshot(listing.gushiProductId);
    res.json({ success: true, message: 'Listing un-published' });
  } catch (error) { next(error); }
});

router.post('/favorites/:productId', authenticateToken, async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const fav = await prisma.gushiFavorite.upsert({
      where: {
        userId_gushiProductId: {
          userId: authUserId,
          gushiProductId: req.params.productId
        }
      },
      create: { userId: authUserId, gushiProductId: req.params.productId },
      update: {}
    });
    res.json({ success: true, data: fav });
  } catch (error) { next(error); }
});

router.delete('/favorites/:productId', authenticateToken, async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await prisma.gushiFavorite.deleteMany({
      where: { userId: authUserId, gushiProductId: req.params.productId }
    });
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.post('/offers', authenticateToken, async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const gushiProductId = String(req.body?.gushiProductId || '').trim();
    const price = Number(req.body?.price);
    const quantity = Math.max(1, Number(req.body?.quantity || 1));

    if (!gushiProductId || !Number.isFinite(price) || price <= 0 || !Number.isInteger(quantity)) {
      return res.status(400).json({ success: false, message: 'Invalid offer params' });
    }

    const frozenAmount = roundMoney(price * quantity);

    const offer = await prisma.$transaction(async (tx) => {
      const product = await tx.gushiProduct.findUnique({ where: { id: gushiProductId } });
      if (!product || product.status !== 'active') {
        throw new Error('Product unavailable');
      }

      const buyer = await tx.user.findUnique({ where: { id: authUserId } });
      if (!buyer) {
        throw new Error('Buyer not found');
      }
      if (buyer.walletBalance < frozenAmount) {
        throw new Error('Insufficient wallet balance');
      }

      await tx.user.update({
        where: { id: authUserId },
        data: { walletBalance: { decrement: frozenAmount } }
      });

      await tx.userTransaction.create({
        data: {
          userId: authUserId,
          type: 'gushi_offer_hold',
          title: 'WTB offer escrow hold',
          amount: -frozenAmount,
          balanceAfter: roundMoney(buyer.walletBalance - frozenAmount),
          channel: 'wallet_hold',
          status: 'completed'
        }
      });

      return tx.gushiOffer.create({
        data: {
          buyerId: authUserId,
          gushiProductId,
          price: roundMoney(price),
          quantity,
          frozenAmount,
          status: 'active'
        },
        include: {
          buyer: { select: { id: true, username: true, avatar: true } },
          product: true
        }
      });
    });

    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to create offer' });
  }
});

router.post('/offers/:id/fulfill', authenticateToken, async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const offerId = req.params.id;

    const result = await prisma.$transaction(async (tx) => {
      const offer = await tx.gushiOffer.findUnique({
        where: { id: offerId },
        include: { product: true }
      });
      if (!offer || offer.status !== 'active') {
        throw new Error('Offer unavailable');
      }
      if (offer.buyerId === authUserId) {
        throw new Error('Cannot fulfill your own offer');
      }

      const lockResult = await tx.gushiOffer.updateMany({
        where: { id: offer.id, status: 'active' },
        data: { status: 'fulfilled' }
      });
      if (lockResult.count !== 1) {
        throw new Error('Offer already fulfilled');
      }

      const listing = await tx.gushiListing.findFirst({
        where: {
          sellerId: authUserId,
          gushiProductId: offer.gushiProductId,
          status: 'active',
          auditStatus: 'approved',
          availableQuantity: { gte: offer.quantity }
        },
        orderBy: [{ price: 'asc' }, { createdAt: 'asc' }]
      });
      if (!listing) {
        throw new Error('No eligible listing found to fulfill this bid');
      }

      await tx.gushiListing.update({
        where: { id: listing.id },
        data: { availableQuantity: { decrement: offer.quantity } }
      });

      const order = await tx.order.create({
        data: {
          id: 'G' + Date.now() + Math.floor(Math.random() * 1000),
          buyerId: offer.buyerId,
          providerId: authUserId,
          amount: offer.frozenAmount,
          bizType: 'gushi',
          gushiProductId: offer.gushiProductId,
          gushiListingId: listing.id,
          status: 'paid',
          settlementStatus: 'held',
          items: {
            create: [
              {
                title: `${offer.product.characterName} ${offer.product.variantName || ''}`.trim(),
                price: offer.price,
                quantity: offer.quantity,
                image: (Array.isArray(listing.images) && listing.images[0]) || offer.product.officialImage,
                itemMeta: {
                  conditionGrade: listing.conditionGrade,
                  isOpened: listing.isOpened,
                  hasOriginalPackage: listing.hasOriginalPackage,
                  defectNotes: listing.defectNotes,
                  ipName: offer.product.ipName,
                  characterName: offer.product.characterName,
                  seriesName: offer.product.seriesName
                }
              }
            ]
          }
        },
        include: { items: true }
      });

      await tx.notification.create({
        data: {
          userId: offer.buyerId,
          title: 'Your bid has been matched',
          content: `A seller accepted your bid for ${offer.product.characterName}. Please wait for shipment.`,
          type: 'system',
          link: `/gushi/orders/${order.id}`
        }
      });

      return { order, offerId: offer.id };
    });

    writeSnapshot(result.order.gushiProductId).catch(console.error);

    res.json({ success: true, data: result.order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to fulfill offer' });
  }
});

router.post('/offers/:id/cancel', authenticateToken, async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const offer = await tx.gushiOffer.findUnique({ where: { id: req.params.id } });
      if (!offer || offer.buyerId !== authUserId) {
        throw new Error('Offer not found');
      }
      if (offer.status !== 'active') {
        throw new Error('Only active offers can be cancelled');
      }

      await tx.gushiOffer.update({
        where: { id: offer.id },
        data: { status: 'cancelled' }
      });

      const buyer = await tx.user.findUnique({ where: { id: authUserId } });
      await tx.user.update({
        where: { id: authUserId },
        data: { walletBalance: { increment: offer.frozenAmount } }
      });

      await tx.userTransaction.create({
        data: {
          userId: authUserId,
          type: 'gushi_offer_refund',
          title: 'WTB offer cancelled and refunded',
          amount: offer.frozenAmount,
          balanceAfter: roundMoney(buyer.walletBalance + offer.frozenAmount),
          channel: 'wallet_refund',
          status: 'completed'
        }
      });

      return offer;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to cancel offer' });
  }
});

router.get('/admin/listings/pending', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const take = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const listings = await prisma.gushiListing.findMany({
      where: { auditStatus: 'pending', status: { not: 'offline' } },
      orderBy: { createdAt: 'asc' },
      take,
      include: {
        seller: { select: { id: true, username: true, avatar: true, email: true } },
        product: true
      }
    });

    res.json({ success: true, data: listings });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/listings/:id/approve', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const listing = await prisma.gushiListing.update({
      where: { id: req.params.id },
      data: { auditStatus: 'approved', status: 'active' }
    });

    await writeSnapshot(listing.gushiProductId);
    res.json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/listings/:id/reject', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const existing = await prisma.gushiListing.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    const reason = (req.body?.reason || '').toString().trim();
    const rejectNote = reason
      ? `[Audit Rejected] ${reason}`
      : '[Audit Rejected] Failed manual audit';

    const listing = await prisma.gushiListing.update({
      where: { id: req.params.id },
      data: {
        auditStatus: 'rejected',
        status: 'offline',
        defectNotes: [listingSafeText(existing.defectNotes), rejectNote].filter(Boolean).join('\n')
      }
    });

    await writeSnapshot(listing.gushiProductId);
    res.json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
});

const listingSafeText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

// ==========================================
// 3. Escrow Orders
// ==========================================
router.post('/orders', authenticateToken, async (req, res, next) => {
  try {
    const { listingId, quantity, addressId } = req.body;
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    // Use transaction to avoid overselling
    const orderData = await prisma.$transaction(async (tx) => {
      const listing = await tx.gushiListing.findUnique({ where: { id: listingId }, include: { product: true } });
      if (
        !listing ||
        listing.availableQuantity < quantity ||
        listing.status !== 'active' ||
        listing.auditStatus !== 'approved'
      ) {
        throw new Error('Listing is unavailable or insufficient stock');
      }
      const buyer = await tx.user.findUnique({ where: { id: authUserId } });
      const totalAmount = listing.price * quantity;
      
      if (buyer.walletBalance < totalAmount) {
        throw new Error('Insufficient wallet balance');
      }
      
      // Deduct balance
      await tx.user.update({
        where: { id: buyer.id },
        data: { walletBalance: { decrement: totalAmount } }
      });
      
      // Create user transaction holding funds
      await tx.userTransaction.create({
        data: {
          userId: buyer.id,
          type: 'gushi_hold',
          title: 'Escrow payment hold',
          amount: -totalAmount,
          balanceAfter: buyer.walletBalance - totalAmount,
          channel: 'wallet_hold',
          status: 'completed'
        }
      });
      
      // Deduct listing inventory
      await tx.gushiListing.update({
        where: { id: listing.id },
        data: { availableQuantity: { decrement: quantity } }
      });
      
      // Prepare item meta snapshot
      const itemMeta = {
        conditionGrade: listing.conditionGrade,
        isOpened: listing.isOpened,
        hasOriginalPackage: listing.hasOriginalPackage,
        defectNotes: listing.defectNotes,
        ipName: listing.product.ipName,
        characterName: listing.product.characterName,
        seriesName: listing.product.seriesName
      };

      // Create Order
      const order = await tx.order.create({
        data: {
          id: 'G' + Date.now() + Math.floor(Math.random() * 1000),
          buyerId: buyer.id,
          providerId: listing.sellerId,
          amount: totalAmount,
          bizType: 'gushi',
          gushiProductId: listing.gushiProductId,
          gushiListingId: listing.id,
          status: 'paid', // immediately paid since we hold wallet funds
          settlementStatus: 'held',
          addressId,
          items: {
            create: [{
              title: listing.product.characterName + ' ' + (listing.product.variantName || ''),
              price: listing.price,
              quantity,
              image: listing.images && listing.images.length > 0 ? listing.images[0] : listing.product.officialImage,
              itemMeta
            }]
          }
        }
      });
      return order;
    });
    
    // Update snapshot floor price async
    writeSnapshot(orderData.gushiProductId).catch(console.error);

    res.json({ success: true, data: orderData });
  } catch (error) { 
    res.status(400).json({ success: false, message: error.message }); 
  }
});

router.get('/orders/:id', authenticateToken, async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: true,
        address: true,
        gushiDispute: true,
        buyer: { select: { username: true } },
        provider: { select: { username: true } }
      }
    });
    if (!order || (order.buyerId !== authUserId && order.providerId !== authUserId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    res.json({ success: true, data: order });
  } catch (error) { next(error); }
});

router.post('/orders/:id/ship', authenticateToken, async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { trackingCompany, trackingNumber } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    
    if (!order || order.providerId !== authUserId) return res.status(403).json({ success: false, message: 'Unauthorized' });
    if (order.status !== 'paid') return res.status(400).json({ success: false, message: 'Order cannot be shipped right now' });
    
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'shipped',
        trackingCompany,
        trackingNumber,
        shippedAt: new Date()
      }
    });

    safeNotify({
      userId: order.buyerId,
      title: 'Your item has been shipped',
      content: `Tracking: ${trackingCompany || 'Carrier'} ${trackingNumber || ''}`.trim(),
      type: 'order_shipped',
      link: `/gushi/orders/${order.id}`
    });
    
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

router.post('/orders/:id/confirm', authenticateToken, async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order || order.buyerId !== authUserId) return res.status(403).json({ success: false, message: 'Unauthorized' });
    if (order.status !== 'shipped') return res.status(400).json({ success: false, message: 'Order cannot be confirmed right now' });
    if (order.settlementStatus === 'disputed') {
      return res.status(400).json({ success: false, message: 'Order is in dispute and cannot be confirmed' });
    }
    
    const settlement = calcSettlementBreakdown(order.amount);

    await prisma.$transaction(async (tx) => {
      // 1. Mark status completed
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'completed',
          settlementStatus: 'released',
          settledAt: new Date()
        }
      });
      
      // 2. Add money to seller
      const seller = await tx.user.findUnique({ where: { id: order.providerId } });
      await tx.user.update({
        where: { id: seller.id },
        data: { walletBalance: { increment: settlement.net } }
      });
      
      // 3. Create income transaction for seller
      await tx.userTransaction.create({
        data: {
          userId: seller.id,
          type: 'gushi_income',
          title: `Escrow payment released (gross CNY ${formatMoney(settlement.gross)}, fee CNY ${formatMoney(settlement.fee)})`,
          amount: settlement.net,
          balanceAfter: roundMoney(seller.walletBalance + settlement.net),
          channel: 'wallet_release',
          status: 'completed'
        }
      });

      if (settlement.fee > 0) {
        await tx.userTransaction.create({
          data: {
            userId: seller.id,
            type: 'system_fee',
            title: `Platform service fee (${formatMoney(PLATFORM_FEE_RATE * 100)}%)`,
            amount: -settlement.fee,
            balanceAfter: roundMoney(seller.walletBalance + settlement.net),
            channel: 'platform_fee',
            status: 'completed'
          }
        });
      }
      
      // 4. Update listing sales count
      if (order.gushiListingId) {
        await tx.gushiListing.update({
          where: { id: order.gushiListingId },
          data: { soldCount: { increment: 1 } }
        });
      }

      await tx.notification.create({
        data: {
          userId: seller.id,
          title: 'Escrow released',
          content: `Settlement complete. Net CNY ${formatMoney(settlement.net)} received (fee CNY ${formatMoney(settlement.fee)}).`,
          type: 'escrow_released',
          link: `/gushi/orders/${order.id}`
        }
      });
    });
    
    // Update chart logic async
    writeSnapshot(order.gushiProductId).catch(console.error);

    res.json({ success: true, message: 'Order confirmed and settled' });
  } catch (error) { next(error); }
});

router.post('/orders/:id/cancel', authenticateToken, async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const order = await prisma.order.findUnique({ 
      where: { id: req.params.id },
      include: { items: true }
    });
    if (!order || order.buyerId !== authUserId) return res.status(403).json({ success: false, message: 'Unauthorized' });
    if (order.status !== 'paid') return res.status(400).json({ success: false, message: 'Order cannot be cancelled right now' });
    
    await prisma.$transaction(async (tx) => {
      // 1. Mark status cancelled
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'cancelled',
          settlementStatus: 'refunded',
          refundStatus: 'refunded'
        }
      });
      
      // 2. Refund money to buyer
      const buyer = await tx.user.findUnique({ where: { id: order.buyerId } });
      await tx.user.update({
        where: { id: buyer.id },
        data: { walletBalance: { increment: order.amount } }
      });
      
      // 3. Create refund transaction
      await tx.userTransaction.create({
        data: {
          userId: buyer.id,
          type: 'gushi_refund',
          title: 'Escrow payment refunded',
          amount: order.amount,
          balanceAfter: buyer.walletBalance + order.amount,
          channel: 'wallet_refund',
          status: 'completed'
        }
      });
      
      // 4. Restore listing stock
      if (order.gushiListingId) {
        await tx.gushiListing.update({
          where: { id: order.gushiListingId },
          data: { availableQuantity: { increment: order.items[0]?.quantity || 1 } }
        });
      }
    });

    res.json({ success: true, message: 'Order cancelled and refunded' });
  } catch (error) { next(error); }
});

router.post('/orders/:id/dispute', authenticateToken, async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const reason = String(req.body?.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Dispute reason is required' });
    }

    const images = Array.isArray(req.body?.images)
      ? req.body.images
          .map((item) => String(item || '').trim())
          .filter(Boolean)
          .slice(0, 9)
      : [];

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { gushiDispute: true }
    });
    if (!order || order.buyerId !== authUserId || order.bizType !== 'gushi') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (order.status !== 'shipped') {
      return res.status(400).json({ success: false, message: 'Only shipped orders can enter dispute' });
    }
    if (order.gushiDispute) {
      return res.status(400).json({ success: false, message: 'Dispute already exists for this order' });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { settlementStatus: 'disputed' }
      });

      return tx.gushiDispute.create({
        data: {
          orderId: order.id,
          buyerId: order.buyerId,
          sellerId: order.providerId,
          reason,
          images,
          status: 'pending'
        }
      });
    });

    safeNotify({
      userId: order.providerId,
      title: 'New dispute opened',
      content: `Buyer opened a dispute for order ${order.id}. Please wait for admin review.`,
      type: 'order_disputed',
      link: `/gushi/orders/${order.id}`
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/orders/disputes', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.query.status || 'pending').trim();
    const take = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

    const disputes = await prisma.gushiDispute.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        buyer: { select: { id: true, username: true, email: true } },
        seller: { select: { id: true, username: true, email: true } },
        order: {
          include: {
            items: true,
            gushiProduct: true,
            gushiListing: true
          }
        }
      }
    });

    res.json({ success: true, data: disputes });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/orders/:id/resolve', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const action = String(req.body?.action || '').trim().toLowerCase();
    if (!['release', 'refund'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Use release or refund' });
    }

    const adminNote = String(req.body?.adminNote || '').trim();

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: true,
        gushiDispute: true
      }
    });
    if (!order || order.bizType !== 'gushi') {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.settlementStatus !== 'disputed' || !order.gushiDispute) {
      return res.status(400).json({ success: false, message: 'Order is not in disputed state' });
    }
    if (order.gushiDispute.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This dispute has already been resolved' });
    }

    const settlement = calcSettlementBreakdown(order.amount);

    const result = await prisma.$transaction(async (tx) => {
      if (action === 'release') {
        const seller = await tx.user.findUnique({ where: { id: order.providerId } });
        if (!seller) {
          throw new Error('Seller does not exist');
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'completed',
            settlementStatus: 'released',
            settledAt: new Date(),
            refundStatus: 'none'
          }
        });

        await tx.user.update({
          where: { id: seller.id },
          data: { walletBalance: { increment: settlement.net } }
        });

        await tx.userTransaction.create({
          data: {
            userId: seller.id,
            type: 'gushi_income',
            title: `Escrow dispute resolved: net CNY ${formatMoney(settlement.net)} (fee CNY ${formatMoney(settlement.fee)})`,
            amount: settlement.net,
            balanceAfter: roundMoney(seller.walletBalance + settlement.net),
            channel: 'wallet_release',
            status: 'completed'
          }
        });

        if (settlement.fee > 0) {
          await tx.userTransaction.create({
            data: {
              userId: seller.id,
              type: 'system_fee',
              title: `Platform service fee (${formatMoney(PLATFORM_FEE_RATE * 100)}%)`,
              amount: -settlement.fee,
              balanceAfter: roundMoney(seller.walletBalance + settlement.net),
              channel: 'platform_fee',
              status: 'completed'
            }
          });
        }

        if (order.gushiListingId) {
          await tx.gushiListing.update({
            where: { id: order.gushiListingId },
            data: { soldCount: { increment: 1 } }
          });
        }

        await tx.gushiDispute.update({
          where: { orderId: order.id },
          data: {
            status: 'resolved_release',
            adminNote: adminNote || null
          }
        });

        await tx.notification.create({
          data: {
            userId: order.buyerId,
            title: 'Dispute resolved',
            content: `Admin resolved your dispute for order ${order.id}: released to seller.`,
            type: 'order_disputed',
            link: `/gushi/orders/${order.id}`
          }
        });

        await tx.notification.create({
          data: {
            userId: seller.id,
            title: 'Dispute resolved',
            content: `Admin resolved order ${order.id}. Net CNY ${formatMoney(settlement.net)} credited.`,
            type: 'escrow_released',
            link: `/gushi/orders/${order.id}`
          }
        });
      } else {
        const buyer = await tx.user.findUnique({ where: { id: order.buyerId } });
        if (!buyer) {
          throw new Error('Buyer does not exist');
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'cancelled',
            settlementStatus: 'refunded',
            refundStatus: 'refunded'
          }
        });

        await tx.user.update({
          where: { id: buyer.id },
          data: { walletBalance: { increment: order.amount } }
        });

        await tx.userTransaction.create({
          data: {
            userId: buyer.id,
            type: 'gushi_refund',
            title: 'Escrow dispute resolved: refunded to buyer',
            amount: order.amount,
            balanceAfter: buyer.walletBalance + order.amount,
            channel: 'wallet_refund',
            status: 'completed'
          }
        });

        if (order.gushiListingId) {
          await tx.gushiListing.update({
            where: { id: order.gushiListingId },
            data: { availableQuantity: { increment: order.items[0]?.quantity || 1 } }
          });
        }

        await tx.gushiDispute.update({
          where: { orderId: order.id },
          data: {
            status: 'resolved_refund',
            adminNote: adminNote || null
          }
        });

        await tx.notification.create({
          data: {
            userId: buyer.id,
            title: 'Dispute resolved',
            content: `Admin approved refund for order ${order.id}. CNY ${formatMoney(order.amount)} returned.`,
            type: 'order_disputed',
            link: `/gushi/orders/${order.id}`
          }
        });

        if (order.providerId) {
          await tx.notification.create({
            data: {
              userId: order.providerId,
              title: 'Dispute resolved',
              content: `Admin resolved order ${order.id} in buyer's favor with refund.`,
              type: 'order_disputed',
              link: `/gushi/orders/${order.id}`
            }
          });
        }
      }

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          gushiDispute: true
        }
      });
    });

    if (order.gushiProductId) {
      writeSnapshot(order.gushiProductId).catch(console.error);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/requests/products', authenticateToken, async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const ipName = String(req.body?.ipName || '').trim();
    const characterName = String(req.body?.characterName || '').trim();
    const category = String(req.body?.category || '').trim();
    const seriesName = String(req.body?.seriesName || '').trim();
    const officialImage = String(req.body?.officialImage || '').trim();
    const officialPriceRaw = req.body?.officialPrice;
    const officialPrice =
      officialPriceRaw === null || officialPriceRaw === undefined || officialPriceRaw === ''
        ? null
        : Number(officialPriceRaw);

    if (!ipName || !characterName || !category) {
      return res.status(400).json({ success: false, message: 'ipName, characterName and category are required' });
    }
    if (officialPrice !== null && Number.isNaN(officialPrice)) {
      return res.status(400).json({ success: false, message: 'officialPrice must be a valid number' });
    }

    const request = await prisma.gushiProductRequest.create({
      data: {
        userId: authUserId,
        ipName,
        characterName,
        category,
        seriesName: seriesName || null,
        officialImage: officialImage || null,
        officialPrice,
        status: 'pending'
      }
    });

    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/requests/products', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.query.status || 'pending').trim();
    const take = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

    const requests = await prisma.gushiProductRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'asc' },
      take,
      include: {
        user: { select: { id: true, username: true, email: true } }
      }
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/requests/products/:id/approve', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const adminNote = String(req.body?.adminNote || '').trim();

    const existingRequest = await prisma.gushiProductRequest.findUnique({
      where: { id: req.params.id }
    });
    if (!existingRequest) {
      return res.status(404).json({ success: false, message: 'Product request not found' });
    }
    if (existingRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Product request has already been processed' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.gushiProduct.create({
        data: {
          slug: `${slugify(existingRequest.ipName)}-${slugify(existingRequest.characterName)}-${Date.now()}`,
          ipName: existingRequest.ipName,
          characterName: existingRequest.characterName,
          category: existingRequest.category,
          seriesName: existingRequest.seriesName || `${existingRequest.ipName} Collection`,
          officialImage: existingRequest.officialImage,
          officialPrice: existingRequest.officialPrice,
          status: 'active'
        }
      });

      const request = await tx.gushiProductRequest.update({
        where: { id: existingRequest.id },
        data: {
          status: 'approved',
          reason: adminNote || null
        }
      });

      return { product, request };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/requests/products/:id/reject', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const adminNote = String(req.body?.adminNote || '').trim();
    const existingRequest = await prisma.gushiProductRequest.findUnique({
      where: { id: req.params.id }
    });
    if (!existingRequest) {
      return res.status(404).json({ success: false, message: 'Product request not found' });
    }
    if (existingRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Product request has already been processed' });
    }

    const updated = await prisma.gushiProductRequest.update({
      where: { id: existingRequest.id },
      data: {
        status: 'rejected',
        reason: adminNote || null
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 4. Cabinet / Me
// ==========================================
router.get('/me/listings', authenticateToken, async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const listings = await prisma.gushiListing.findMany({
      where: { sellerId: authUserId },
      orderBy: { createdAt: 'desc' },
      include: { product: true }
    });
    res.json({ success: true, data: listings });
  } catch (error) { next(error); }
});

router.get('/me/orders', authenticateToken, async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { type } = req.query; // 'buy' or 'sell'
    const query = { bizType: 'gushi' };
    if (type === 'sell') {
      query.providerId = authUserId;
    } else if (type === 'buy') {
      query.buyerId = authUserId;
    } else {
      query.OR = [{ buyerId: authUserId }, { providerId: authUserId }];
    }
    const orders = await prisma.order.findMany({
      where: query,
      orderBy: { createdAt: 'desc' },
      include: { items: true, gushiListing: { include: { product: true } }, gushiDispute: true }
    });
    res.json({ success: true, data: orders });
  } catch (error) { next(error); }
});

router.get('/me/favorites', authenticateToken, async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const favs = await prisma.gushiFavorite.findMany({
      where: { userId: authUserId },
      orderBy: { createdAt: 'desc' },
      include: { product: true }
    });
    res.json({ success: true, data: favs });
  } catch (error) { next(error); }
});

router.get('/me/offers', authenticateToken, async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const status = String(req.query.status || 'active').trim();
    const where = { buyerId: authUserId };
    if (status && status !== 'all') {
      where.status = status;
    }

    const offers = await prisma.gushiOffer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: true
      }
    });

    res.json({ success: true, data: offers });
  } catch (error) {
    next(error);
  }
});

router.get('/me/transactions', authenticateToken, async (req, res, next) => {
  try {
    const authUserId = getAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const txs = await prisma.userTransaction.findMany({
      where: { 
        userId: authUserId,
        type: {
          in: [
            'gushi_hold',
            'gushi_income',
            'gushi_refund',
            'gushi_release',
            'gushi_offer_hold',
            'gushi_offer_refund',
            'system_fee'
          ]
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: txs });
  } catch (error) { next(error); }
});

module.exports = router;
