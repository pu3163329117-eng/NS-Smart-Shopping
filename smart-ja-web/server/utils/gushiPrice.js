const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function getLatestCompletedTrade(gushiProductId) {
  const latestOrder = await prisma.order.findFirst({
    where: { bizType: 'gushi', gushiProductId, status: 'completed' },
    orderBy: { settledAt: 'desc' },
    include: { items: true }
  })
  if (!latestOrder) return null
  return latestOrder.items[0]?.price || null
}

async function getReferencePrice7d(gushiProductId) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const orders = await prisma.order.findMany({
    where: { 
      bizType: 'gushi', 
      gushiProductId, 
      status: 'completed',
      settledAt: { gte: sevenDaysAgo }
    },
    include: { items: true }
  })
  if (orders.length === 0) return null
  const prices = orders.map(o => o.items[0]?.price || 0).filter(p => p > 0).sort((a,b) => a - b)
  if (prices.length === 0) return null
  return prices[Math.floor(prices.length / 2)] // Median price
}

async function getFloorPrice(gushiProductId) {
  const listing = await prisma.gushiListing.findFirst({
    where: { 
      gushiProductId, 
      status: 'active', 
      auditStatus: 'approved', 
      availableQuantity: { gt: 0 } 
    },
    orderBy: { price: 'asc' }
  })
  return listing ? listing.price : null
}

async function getDailyChangePercent(gushiProductId, latestPrice) {
  if (!latestPrice) return null
  const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const yesterdaySnapshot = await prisma.gushiPriceSnapshot.findFirst({
    where: { gushiProductId, capturedAt: { lte: yesterdayDate } },
    orderBy: { capturedAt: 'desc' }
  })
  if (!yesterdaySnapshot || !yesterdaySnapshot.latestPrice) return 0
  
  return ((latestPrice - yesterdaySnapshot.latestPrice) / yesterdaySnapshot.latestPrice) * 100
}

async function get24hStats(gushiProductId) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const orders = await prisma.order.findMany({
    where: { bizType: 'gushi', gushiProductId, status: 'completed', settledAt: { gte: oneDayAgo } },
    include: { items: true }
  })
  let volume24h = 0
  let turnover24h = 0
  orders.forEach(o => {
    if (o.items[0]) {
      volume24h += o.items[0].quantity
      turnover24h += o.items[0].price * o.items[0].quantity
    }
  })
  return { 
    volume24h, 
    turnover24h, 
    avgPrice24h: volume24h > 0 ? (turnover24h / volume24h) : null 
  }
}

async function writeSnapshot(gushiProductId) {
  const latestPrice = await getLatestCompletedTrade(gushiProductId)
  const referencePrice7d = await getReferencePrice7d(gushiProductId)
  const floorPrice = await getFloorPrice(gushiProductId)
  const changePercentDaily = await getDailyChangePercent(gushiProductId, latestPrice)
  const { volume24h, turnover24h, avgPrice24h } = await get24hStats(gushiProductId)
  
  return await prisma.gushiPriceSnapshot.create({
    data: {
      gushiProductId,
      latestPrice,
      referencePrice7d,
      floorPrice,
      changePercentDaily,
      volume24h,
      turnover24h,
      avgPrice24h
    }
  })
}

module.exports = {
  getLatestCompletedTrade,
  getReferencePrice7d,
  getFloorPrice,
  getDailyChangePercent,
  writeSnapshot
}
