const toTimestamp = (value) => {
  if (!value) return 0;
  const date = new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
};

export const buildOrderGroups = (rawOrders) => {
  const orders = Array.isArray(rawOrders) ? rawOrders : [];
  const groupMap = new Map();

  for (const order of orders) {
    const checkoutId = String(order?.checkoutId || '').trim();
    const key = checkoutId ? `checkout:${checkoutId}` : `order:${order?.id || Math.random()}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        checkoutId: checkoutId || null,
        isSplit: Boolean(checkoutId),
        orderCount: 0,
        totalAmount: 0,
        latestTime: 0,
        statusSummary: 'unknown',
        shippedOrCompletedCount: 0,
        completedCount: 0,
        refundedCount: 0,
        cancelledCount: 0,
        progressStatus: 'pending',
        orders: []
      });
    }

    const group = groupMap.get(key);
    group.orders.push(order);
    group.orderCount += 1;
    group.totalAmount = Number((group.totalAmount + Number(order?.amount || 0)).toFixed(2));
    group.latestTime = Math.max(group.latestTime, toTimestamp(order?.createdAt || order?.updatedAt));
  }

  const groups = Array.from(groupMap.values());
  for (const group of groups) {
    group.orders.sort(
      (left, right) =>
        toTimestamp(right?.createdAt || right?.updatedAt) -
        toTimestamp(left?.createdAt || left?.updatedAt)
    );

    const statusSet = new Set(
      group.orders
        .map((order) => String(order?.status || '').trim())
        .filter(Boolean)
    );

    group.statusSummary = statusSet.size === 1 ? Array.from(statusSet)[0] : 'mixed';
    group.shippedOrCompletedCount = group.orders.filter((order) =>
      ['shipped', 'completed'].includes(String(order?.status || '').trim())
    ).length;
    group.completedCount = group.orders.filter(
      (order) => String(order?.status || '').trim() === 'completed'
    ).length;
    group.refundedCount = group.orders.filter(
      (order) => String(order?.status || '').trim() === 'refunded'
    ).length;
    group.cancelledCount = group.orders.filter(
      (order) => String(order?.status || '').trim() === 'cancelled'
    ).length;

    const closedCount = group.refundedCount + group.cancelledCount;

    if (group.refundedCount === group.orderCount) {
      group.progressStatus = 'refunded';
    } else if (group.cancelledCount === group.orderCount) {
      group.progressStatus = 'cancelled';
    } else if (closedCount === group.orderCount) {
      group.progressStatus = group.refundedCount > 0 ? 'refunded' : 'cancelled';
    } else if (group.completedCount === group.orderCount) {
      group.progressStatus = 'completed';
    } else if (group.shippedOrCompletedCount > 0) {
      group.progressStatus = 'in_progress';
    } else {
      group.progressStatus = 'pending';
    }
  }

  groups.sort((left, right) => right.latestTime - left.latestTime);
  return groups;
};
