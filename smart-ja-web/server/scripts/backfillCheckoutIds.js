/* eslint-disable no-console */
require('dotenv').config();
const prisma = require('../utils/prisma');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const hasArg = (flag) => args.includes(flag);
  const readArgValue = (prefix, fallback) => {
    const raw = args.find((arg) => arg.startsWith(`${prefix}=`));
    if (!raw) return fallback;
    return raw.slice(prefix.length + 1);
  };

  const windowSec = Number.parseInt(readArgValue('--window-sec', '8'), 10);
  const lookbackDays = Number.parseInt(readArgValue('--lookback-days', '90'), 10);

  return {
    apply: hasArg('--apply'),
    windowSec: Number.isInteger(windowSec) && windowSec > 0 ? windowSec : 8,
    lookbackDays: Number.isInteger(lookbackDays) && lookbackDays > 0 ? lookbackDays : 90
  };
};

const toMillis = (value) => {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const ts = date.getTime();
  return Number.isFinite(ts) ? ts : 0;
};

const hasCheckoutId = (order) =>
  Array.isArray(order.items) &&
  order.items.some(
    (item) =>
      item &&
      item.itemMeta &&
      typeof item.itemMeta === 'object' &&
      String(item.itemMeta.checkoutId || '').trim()
  );

const readCheckoutId = (order) => {
  if (!Array.isArray(order.items)) return '';
  for (const item of order.items) {
    if (!item || !item.itemMeta || typeof item.itemMeta !== 'object') continue;
    const checkoutId = String(item.itemMeta.checkoutId || '').trim();
    if (checkoutId) return checkoutId;
  }
  return '';
};

const buildLegacyCheckoutId = (buyerId, createdAt, sequence) => {
  const d = new Date(createdAt);
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(
    d.getMinutes()
  )}${pad(d.getSeconds())}`;
  const buyerTail = String(buyerId || 'user').slice(-6);
  return `chk-legacy-${stamp}-${buyerTail}-${sequence}`;
};

const groupOrdersByBuyerAndWindow = (orders, windowSec) => {
  const byBuyer = new Map();
  for (const order of orders) {
    if (!byBuyer.has(order.buyerId)) byBuyer.set(order.buyerId, []);
    byBuyer.get(order.buyerId).push(order);
  }

  const groups = [];
  for (const [, buyerOrders] of byBuyer.entries()) {
    buyerOrders.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
    let current = [];

    for (const order of buyerOrders) {
      if (current.length === 0) {
        current.push(order);
        continue;
      }

      const prev = current[current.length - 1];
      const gapSec = (toMillis(order.createdAt) - toMillis(prev.createdAt)) / 1000;
      if (gapSec <= windowSec) {
        current.push(order);
      } else {
        if (current.length > 1) groups.push(current);
        current = [order];
      }
    }

    if (current.length > 1) groups.push(current);
  }

  return groups;
};

const main = async () => {
  const options = parseArgs();
  const now = new Date();
  const lookbackStart = new Date(now.getTime() - options.lookbackDays * 24 * 60 * 60 * 1000);
  const mode = options.apply ? 'APPLY' : 'DRY-RUN';

  console.log(`[backfillCheckoutIds] mode=${mode}, windowSec=${options.windowSec}, lookbackDays=${options.lookbackDays}`);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: lookbackStart },
      items: { some: {} }
    },
    select: {
      id: true,
      buyerId: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          itemMeta: true
        }
      }
    },
    orderBy: [{ buyerId: 'asc' }, { createdAt: 'asc' }]
  });

  const clustered = groupOrdersByBuyerAndWindow(orders, options.windowSec);
  let candidateGroups = 0;
  let changedOrders = 0;
  let changedItems = 0;
  let seq = 1;

  for (const group of clustered) {
    const groupSize = group.length;
    const existingCheckoutId = group.map(readCheckoutId).find(Boolean) || '';
    const targetCheckoutId = existingCheckoutId || buildLegacyCheckoutId(group[0].buyerId, group[0].createdAt, seq++);

    const missingOrders = group.filter((order) => !hasCheckoutId(order));
    if (missingOrders.length === 0) {
      continue;
    }

    candidateGroups += 1;

    for (const order of missingOrders) {
      if (!Array.isArray(order.items) || order.items.length === 0) continue;
      changedOrders += 1;
      changedItems += order.items.length;

      if (!options.apply) {
        continue;
      }

      for (const item of order.items) {
        const currentMeta =
          item.itemMeta && typeof item.itemMeta === 'object' && !Array.isArray(item.itemMeta)
            ? item.itemMeta
            : {};

        await prisma.orderItem.update({
          where: { id: item.id },
          data: {
            itemMeta: {
              ...currentMeta,
              checkoutId: targetCheckoutId,
              splitOrderCount: groupSize,
              backfilledBy: 'backfillCheckoutIds',
              backfilledAt: now.toISOString()
            }
          }
        });
      }
    }
  }

  console.log(
    `[backfillCheckoutIds] candidateGroups=${candidateGroups}, changedOrders=${changedOrders}, changedItems=${changedItems}`
  );
  if (!options.apply) {
    console.log('[backfillCheckoutIds] dry-run complete. Add --apply to persist changes.');
  }
};

main()
  .catch((error) => {
    console.error('[backfillCheckoutIds] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });

