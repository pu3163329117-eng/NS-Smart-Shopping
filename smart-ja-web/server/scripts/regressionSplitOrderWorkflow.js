/* eslint-disable no-console */
require('dotenv').config();

const axios = require('axios');
const prisma = require('../utils/prisma');
const { generateToken, hashPassword } = require('../utils/auth');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const hasArg = (flag) => args.includes(flag);
  const readArgValue = (prefix, fallback) => {
    const raw = args.find((arg) => arg.startsWith(`${prefix}=`));
    if (!raw) return fallback;
    return raw.slice(prefix.length + 1);
  };

  return {
    baseUrl: readArgValue('--base-url', process.env.REGRESSION_BASE_URL || 'http://127.0.0.1:3002'),
    keepData: hasArg('--keep-data'),
    verbose: hasArg('--verbose')
  };
};

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const assert = (condition, message, details) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};

const createHttpClient = (baseUrl) =>
  axios.create({
    baseURL: baseUrl,
    timeout: 15000,
    validateStatus: () => true
  });

const safeJson = (payload) => {
  try {
    return JSON.stringify(payload);
  } catch (_) {
    return String(payload);
  }
};

const requestWithExpect = async ({ client, token, method, url, data, expectedStatus, label, verbose }) => {
  const response = await client.request({
    method,
    url,
    data,
    headers: token
      ? {
        Authorization: `Bearer ${token}`
      }
      : undefined
  });

  if (verbose) {
    console.log(`[http] ${method.toUpperCase()} ${url} => ${response.status}`);
  }

  if (response.status !== expectedStatus) {
    const error = new Error(`[${label}] expected status ${expectedStatus}, got ${response.status}`);
    error.details = {
      method,
      url,
      expectedStatus,
      actualStatus: response.status,
      responseBody: response.data
    };
    throw error;
  }

  return response.data;
};

const createUser = async ({ id, email, username, walletBalance }) => {
  const password = await hashPassword('Regression!123');
  return prisma.user.create({
    data: {
      id,
      email,
      username,
      password,
      walletBalance,
      walletPoints: 0,
      walletCoupons: 0,
      level: 1,
      exp: 0
    }
  });
};

const main = async () => {
  const options = parseArgs();
  const runTag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const client = createHttpClient(options.baseUrl);

  const ids = {
    buyer: `rg-buyer-${runTag}`,
    lowBuyer: `rg-low-buyer-${runTag}`,
    raceBuyerA: `rg-race-buyer-a-${runTag}`,
    raceBuyerB: `rg-race-buyer-b-${runTag}`,
    providerA: `rg-provider-a-${runTag}`,
    providerB: `rg-provider-b-${runTag}`,
    serviceA: `rg-service-a-${runTag}`,
    serviceB: `rg-service-b-${runTag}`,
    serviceC: `rg-service-c-${runTag}`,
    skuA: `rg-sku-a-${runTag}`,
    skuB: `rg-sku-b-${runTag}`,
    skuC: `rg-sku-c-${runTag}`
  };

  const emails = {
    buyer: `rg.buyer.${runTag}@example.com`,
    lowBuyer: `rg.lowbuyer.${runTag}@example.com`,
    raceBuyerA: `rg.race.buyer.a.${runTag}@example.com`,
    raceBuyerB: `rg.race.buyer.b.${runTag}@example.com`,
    providerA: `rg.provider.a.${runTag}@example.com`,
    providerB: `rg.provider.b.${runTag}@example.com`
  };

  const initialWallets = {
    buyer: 1000,
    lowBuyer: 20,
    raceBuyerA: 500,
    raceBuyerB: 500,
    providerA: 50,
    providerB: 70
  };

  const prices = {
    skuA: 120,
    skuB: 80,
    skuC: 55
  };

  const quantities = {
    skuA: 2,
    skuB: 1
  };

  const expectedAmounts = {
    orderA: roundMoney(prices.skuA * quantities.skuA),
    orderB: roundMoney(prices.skuB * quantities.skuB)
  };

  const expectedTotal = roundMoney(expectedAmounts.orderA + expectedAmounts.orderB);
  const expectedPoints = Math.floor(expectedTotal / 10);

  const created = {
    userIds: [ids.buyer, ids.lowBuyer, ids.raceBuyerA, ids.raceBuyerB, ids.providerA, ids.providerB],
    orderIds: [],
    addressId: null
  };

  try {
    console.log(`[regression] runTag=${runTag}`);
    console.log(`[regression] baseUrl=${options.baseUrl}`);

    const health = await client.get('/health');
    assert(health.status === 200, 'Backend health check failed', {
      status: health.status,
      body: health.data
    });

    const buyer = await createUser({
      id: ids.buyer,
      email: emails.buyer,
      username: 'Regression Buyer',
      walletBalance: initialWallets.buyer
    });
    const lowBuyer = await createUser({
      id: ids.lowBuyer,
      email: emails.lowBuyer,
      username: 'Regression Low Buyer',
      walletBalance: initialWallets.lowBuyer
    });
    const raceBuyerA = await createUser({
      id: ids.raceBuyerA,
      email: emails.raceBuyerA,
      username: 'Regression Race Buyer A',
      walletBalance: initialWallets.raceBuyerA
    });
    const raceBuyerB = await createUser({
      id: ids.raceBuyerB,
      email: emails.raceBuyerB,
      username: 'Regression Race Buyer B',
      walletBalance: initialWallets.raceBuyerB
    });
    const providerA = await createUser({
      id: ids.providerA,
      email: emails.providerA,
      username: 'Regression Provider A',
      walletBalance: initialWallets.providerA
    });
    const providerB = await createUser({
      id: ids.providerB,
      email: emails.providerB,
      username: 'Regression Provider B',
      walletBalance: initialWallets.providerB
    });

    await prisma.service.createMany({
      data: [
        {
          id: ids.serviceA,
          title: 'Regression Service A',
          description: 'Regression Service A',
          price: prices.skuA,
          userId: providerA.id,
          status: 'active'
        },
        {
          id: ids.serviceB,
          title: 'Regression Service B',
          description: 'Regression Service B',
          price: prices.skuB,
          userId: providerB.id,
          status: 'active'
        },
        {
          id: ids.serviceC,
          title: 'Regression Service C (Scarce)',
          description: 'Regression Service C',
          price: prices.skuC,
          userId: providerA.id,
          status: 'active'
        }
      ]
    });

    await prisma.serviceSku.createMany({
      data: [
        {
          id: ids.skuA,
          serviceId: ids.serviceA,
          name: 'Regression SKU A',
          price: prices.skuA,
          stock: 20,
          sort: 1
        },
        {
          id: ids.skuB,
          serviceId: ids.serviceB,
          name: 'Regression SKU B',
          price: prices.skuB,
          stock: 20,
          sort: 1
        },
        {
          id: ids.skuC,
          serviceId: ids.serviceC,
          name: 'Regression SKU C (Scarce)',
          price: prices.skuC,
          stock: 1,
          sort: 1
        }
      ]
    });

    const address = await prisma.address.create({
      data: {
        userId: buyer.id,
        receiver: 'Regression Receiver',
        phone: '13800000000',
        region: 'Shanghai Pudong',
        detail: 'Regression Street 1'
      }
    });
    created.addressId = address.id;

    const buyerToken = generateToken({ id: buyer.id, email: buyer.email });
    const lowBuyerToken = generateToken({ id: lowBuyer.id, email: lowBuyer.email });
    const raceBuyerAToken = generateToken({ id: raceBuyerA.id, email: raceBuyerA.email });
    const raceBuyerBToken = generateToken({ id: raceBuyerB.id, email: raceBuyerB.email });
    const providerAToken = generateToken({ id: providerA.id, email: providerA.email });
    const providerBToken = generateToken({ id: providerB.id, email: providerB.email });

    const orderCreatePayload = {
      items: [
        { skuId: ids.skuA, quantity: quantities.skuA },
        { skuId: ids.skuB, quantity: quantities.skuB }
      ],
      total: expectedTotal,
      addressId: address.id
    };

    await requestWithExpect({
      client,
      method: 'post',
      url: '/api/orders',
      data: orderCreatePayload,
      expectedStatus: 401,
      label: 'createOrderWithoutToken',
      verbose: options.verbose
    });

    const insufficientFundsBody = await requestWithExpect({
      client,
      token: lowBuyerToken,
      method: 'post',
      url: '/api/orders',
      data: {
        items: [{ skuId: ids.skuA, quantity: 1 }],
        total: prices.skuA
      },
      expectedStatus: 400,
      label: 'insufficientFunds',
      verbose: options.verbose
    });
    assert(insufficientFundsBody.code === 'INSUFFICIENT_FUNDS', 'Expected INSUFFICIENT_FUNDS error code', insufficientFundsBody);

    await requestWithExpect({
      client,
      token: buyerToken,
      method: 'post',
      url: '/api/orders',
      data: {
        items: [{ skuId: `missing-sku-${runTag}`, quantity: 1 }],
        total: 10
      },
      expectedStatus: 400,
      label: 'invalidSku',
      verbose: options.verbose
    });

    await requestWithExpect({
      client,
      token: buyerToken,
      method: 'post',
      url: '/api/orders',
      data: {
        items: [{ skuId: ids.skuA, quantity: 9999 }],
        total: roundMoney(prices.skuA * 9999)
      },
      expectedStatus: 400,
      label: 'insufficientStock',
      verbose: options.verbose
    });

    const createRes = await requestWithExpect({
      client,
      token: buyerToken,
      method: 'post',
      url: '/api/orders',
      data: orderCreatePayload,
      expectedStatus: 201,
      label: 'createSplitOrder',
      verbose: options.verbose
    });

    assert(createRes && createRes.split === true, 'Expected split checkout response', createRes);
    assert(createRes.orderCount === 2, 'Expected exactly 2 split orders', createRes);
    assert(Array.isArray(createRes.orders) && createRes.orders.length === 2, 'Missing split orders array', createRes);
    assert(typeof createRes.checkoutId === 'string' && createRes.checkoutId.length > 0, 'Missing checkoutId', createRes);

    created.orderIds.push(...createRes.orders.map((order) => order.id));

    const orderA = createRes.orders.find((order) => order.providerId === providerA.id);
    const orderB = createRes.orders.find((order) => order.providerId === providerB.id);

    assert(orderA, 'Missing provider A split order', createRes.orders);
    assert(orderB, 'Missing provider B split order', createRes.orders);
    assert(roundMoney(orderA.amount) === expectedAmounts.orderA, 'Provider A order amount mismatch', orderA);
    assert(roundMoney(orderB.amount) === expectedAmounts.orderB, 'Provider B order amount mismatch', orderB);

    const buyerAfterPurchase = await prisma.user.findUnique({ where: { id: buyer.id } });
    const providerAAfterPurchase = await prisma.user.findUnique({ where: { id: providerA.id } });
    const providerBAfterPurchase = await prisma.user.findUnique({ where: { id: providerB.id } });

    assert(buyerAfterPurchase, 'Buyer not found after purchase');
    assert(providerAAfterPurchase, 'Provider A not found after purchase');
    assert(providerBAfterPurchase, 'Provider B not found after purchase');

    assert(
      roundMoney(buyerAfterPurchase.walletBalance) === roundMoney(initialWallets.buyer - expectedTotal),
      'Buyer wallet balance mismatch after purchase',
      buyerAfterPurchase
    );
    assert(
      Number(buyerAfterPurchase.walletPoints) === expectedPoints,
      'Buyer points mismatch after purchase',
      buyerAfterPurchase
    );
    assert(
      roundMoney(providerAAfterPurchase.walletBalance) === roundMoney(initialWallets.providerA + expectedAmounts.orderA),
      'Provider A wallet mismatch after purchase',
      providerAAfterPurchase
    );
    assert(
      roundMoney(providerBAfterPurchase.walletBalance) === roundMoney(initialWallets.providerB + expectedAmounts.orderB),
      'Provider B wallet mismatch after purchase',
      providerBAfterPurchase
    );

    const buyerPaymentTxn = await prisma.userTransaction.findFirst({
      where: {
        userId: buyer.id,
        type: 'payment',
        orderId: createRes.checkoutId
      }
    });

    assert(buyerPaymentTxn, 'Missing buyer payment transaction for checkoutId', {
      checkoutId: createRes.checkoutId
    });

    const buyerPointsTxn = await prisma.userTransaction.findFirst({
      where: {
        userId: buyer.id,
        type: 'points',
        orderId: createRes.checkoutId
      }
    });

    assert(buyerPointsTxn, 'Missing buyer points transaction for checkoutId', {
      checkoutId: createRes.checkoutId
    });

    const providerATxn = await prisma.userTransaction.findFirst({
      where: {
        userId: providerA.id,
        type: 'income',
        orderId: orderA.id
      }
    });
    const providerBTxn = await prisma.userTransaction.findFirst({
      where: {
        userId: providerB.id,
        type: 'income',
        orderId: orderB.id
      }
    });

    assert(providerATxn, 'Missing provider A income transaction', { orderId: orderA.id });
    assert(providerBTxn, 'Missing provider B income transaction', { orderId: orderB.id });

    const persistedOrders = await prisma.order.findMany({
      where: {
        id: {
          in: [orderA.id, orderB.id]
        }
      },
      include: {
        items: true
      }
    });

    assert(persistedOrders.length === 2, 'Expected 2 persisted split orders', persistedOrders);

    for (const order of persistedOrders) {
      assert(Array.isArray(order.items) && order.items.length > 0, 'Order missing items', order);
      for (const item of order.items) {
        const meta = item.itemMeta && typeof item.itemMeta === 'object' ? item.itemMeta : null;
        assert(meta && meta.checkoutId === createRes.checkoutId, 'Order item checkoutId mismatch', item);
        assert(Number(meta.splitOrderCount) === 2, 'Order item splitOrderCount mismatch', item);
      }
    }

    await requestWithExpect({
      client,
      token: buyerToken,
      method: 'get',
      url: `/api/orders/${orderA.id}`,
      expectedStatus: 200,
      label: 'buyerGetOrderA',
      verbose: options.verbose
    });

    await requestWithExpect({
      client,
      token: providerBToken,
      method: 'get',
      url: `/api/orders/${orderA.id}`,
      expectedStatus: 403,
      label: 'providerBAccessOrderAForbidden',
      verbose: options.verbose
    });

    await requestWithExpect({
      client,
      token: buyerToken,
      method: 'put',
      url: `/api/orders/${orderA.id}/status`,
      data: { status: 'shipped' },
      expectedStatus: 403,
      label: 'buyerCannotUpdateStatus',
      verbose: options.verbose
    });

    await requestWithExpect({
      client,
      token: providerBToken,
      method: 'put',
      url: `/api/orders/${orderA.id}/status`,
      data: { status: 'shipped' },
      expectedStatus: 403,
      label: 'providerBCannotUpdateOrderA',
      verbose: options.verbose
    });

    await requestWithExpect({
      client,
      token: providerAToken,
      method: 'put',
      url: `/api/orders/${orderA.id}/status`,
      data: { status: 'completed' },
      expectedStatus: 400,
      label: 'invalidTransitionPaidToCompleted',
      verbose: options.verbose
    });

    await requestWithExpect({
      client,
      token: providerAToken,
      method: 'put',
      url: `/api/orders/${orderA.id}/status`,
      data: { status: 'refunded' },
      expectedStatus: 400,
      label: 'invalidTransitionPaidToRefunded',
      verbose: options.verbose
    });

    await requestWithExpect({
      client,
      token: providerAToken,
      method: 'put',
      url: `/api/orders/${orderA.id}/status`,
      data: { status: 'shipped' },
      expectedStatus: 200,
      label: 'providerAShipOrderA',
      verbose: options.verbose
    });

    await requestWithExpect({
      client,
      token: buyerToken,
      method: 'post',
      url: `/api/orders/${orderB.id}/confirm`,
      expectedStatus: 400,
      label: 'cannotConfirmUnshippedOrder',
      verbose: options.verbose
    });

    await requestWithExpect({
      client,
      token: buyerToken,
      method: 'post',
      url: `/api/orders/${orderA.id}/confirm`,
      expectedStatus: 200,
      label: 'buyerConfirmOrderA',
      verbose: options.verbose
    });

    await requestWithExpect({
      client,
      token: buyerToken,
      method: 'post',
      url: `/api/orders/${orderA.id}/confirm`,
      expectedStatus: 400,
      label: 'cannotConfirmOrderTwice',
      verbose: options.verbose
    });

    await requestWithExpect({
      client,
      token: providerBToken,
      method: 'put',
      url: `/api/orders/${orderB.id}/status`,
      data: { status: 'shipped' },
      expectedStatus: 200,
      label: 'providerBShipOrderB',
      verbose: options.verbose
    });

    await requestWithExpect({
      client,
      token: buyerToken,
      method: 'post',
      url: `/api/orders/${orderB.id}/confirm`,
      expectedStatus: 200,
      label: 'buyerConfirmOrderB',
      verbose: options.verbose
    });

    await requestWithExpect({
      client,
      token: providerAToken,
      method: 'put',
      url: `/api/orders/${orderA.id}/status`,
      data: { status: 'shipped' },
      expectedStatus: 400,
      label: 'cannotMoveCompletedBackToShipped',
      verbose: options.verbose
    });

    const concurrencyPayload = {
      items: [{ skuId: ids.skuC, quantity: 1 }],
      total: prices.skuC
    };

    const [raceResA, raceResB] = await Promise.all([
      client.request({
        method: 'post',
        url: '/api/orders',
        data: concurrencyPayload,
        headers: { Authorization: `Bearer ${raceBuyerAToken}` }
      }),
      client.request({
        method: 'post',
        url: '/api/orders',
        data: concurrencyPayload,
        headers: { Authorization: `Bearer ${raceBuyerBToken}` }
      })
    ]);

    if (options.verbose) {
      console.log(`[http] RACE /api/orders buyerA => ${raceResA.status}`);
      console.log(`[http] RACE /api/orders buyerB => ${raceResB.status}`);
    }

    const raceStatuses = [raceResA.status, raceResB.status].sort((a, b) => a - b);
    assert(
      raceStatuses[0] === 201 && raceStatuses[1] === 400,
      'Expected exactly one success and one stock failure in race purchase',
      {
        statuses: raceStatuses,
        buyerA: raceResA.data,
        buyerB: raceResB.data
      }
    );

    const raceWinnerRes = raceResA.status === 201 ? raceResA : raceResB;
    const raceLoserRes = raceResA.status === 400 ? raceResA : raceResB;
    const raceWinnerBuyerId = raceResA.status === 201 ? raceBuyerA.id : raceBuyerB.id;
    const raceLoserBuyerId = raceResA.status === 400 ? raceBuyerA.id : raceBuyerB.id;

    assert(raceWinnerRes.data && raceWinnerRes.data.id, 'Race winner order payload is invalid', raceWinnerRes.data);
    created.orderIds.push(raceWinnerRes.data.id);
    assert(
      String(raceLoserRes.data?.message || '').includes('Insufficient stock'),
      'Race loser should fail by insufficient stock',
      raceLoserRes.data
    );

    const finalSkuC = await prisma.serviceSku.findUnique({ where: { id: ids.skuC } });
    assert(finalSkuC, 'SKU C not found after race test');
    assert(Number(finalSkuC.stock) === 0, 'SKU C stock mismatch after race test', finalSkuC);

    const raceBuyerAFinal = await prisma.user.findUnique({ where: { id: raceBuyerA.id } });
    const raceBuyerBFinal = await prisma.user.findUnique({ where: { id: raceBuyerB.id } });
    assert(raceBuyerAFinal, 'Race Buyer A not found');
    assert(raceBuyerBFinal, 'Race Buyer B not found');
    const raceADeduction = roundMoney(initialWallets.raceBuyerA - Number(raceBuyerAFinal.walletBalance || 0));
    const raceBDeduction = roundMoney(initialWallets.raceBuyerB - Number(raceBuyerBFinal.walletBalance || 0));

    assert(
      (raceADeduction === prices.skuC && raceBDeduction === 0) ||
      (raceADeduction === 0 && raceBDeduction === prices.skuC),
      'Exactly one race buyer should be charged once',
      {
        raceADeduction,
        raceBDeduction
      }
    );

    const raceIncomeTxn = await prisma.userTransaction.findFirst({
      where: {
        userId: providerA.id,
        type: 'income',
        orderId: raceWinnerRes.data.id
      }
    });
    assert(raceIncomeTxn, 'Missing provider income transaction for race winner order', {
      orderId: raceWinnerRes.data.id
    });

    const winnerOrder = await prisma.order.findUnique({
      where: { id: raceWinnerRes.data.id },
      select: { buyerId: true }
    });
    assert(winnerOrder && winnerOrder.buyerId === raceWinnerBuyerId, 'Race winner order buyer mismatch', winnerOrder);
    assert(winnerOrder && winnerOrder.buyerId !== raceLoserBuyerId, 'Race loser unexpectedly won order', winnerOrder);

    const buyerBeforeCancel = await prisma.user.findUnique({
      where: { id: buyer.id },
      select: { walletBalance: true }
    });
    const providerABeforeCancel = await prisma.user.findUnique({
      where: { id: providerA.id },
      select: { walletBalance: true }
    });
    const skuABeforeCancel = await prisma.serviceSku.findUnique({
      where: { id: ids.skuA },
      select: { stock: true }
    });
    const serviceABeforeCancel = await prisma.service.findUnique({
      where: { id: ids.serviceA },
      select: { sales: true }
    });
    assert(buyerBeforeCancel && providerABeforeCancel && skuABeforeCancel && serviceABeforeCancel, 'Cancel baseline data missing');

    const cancelOrder = await requestWithExpect({
      client,
      token: buyerToken,
      method: 'post',
      url: '/api/orders',
      data: {
        items: [{ skuId: ids.skuA, quantity: 1 }],
        total: prices.skuA
      },
      expectedStatus: 201,
      label: 'createCancelableOrder',
      verbose: options.verbose
    });
    assert(cancelOrder && cancelOrder.id, 'Cancelable order payload is invalid', cancelOrder);
    created.orderIds.push(cancelOrder.id);

    await requestWithExpect({
      client,
      token: lowBuyerToken,
      method: 'post',
      url: `/api/orders/${cancelOrder.id}/cancel`,
      expectedStatus: 403,
      label: 'unauthorizedCancelOrder',
      verbose: options.verbose
    });

    const cancelledOrder = await requestWithExpect({
      client,
      token: buyerToken,
      method: 'post',
      url: `/api/orders/${cancelOrder.id}/cancel`,
      expectedStatus: 200,
      label: 'buyerCancelOrder',
      verbose: options.verbose
    });
    assert(cancelledOrder.status === 'cancelled', 'Cancel order status mismatch', cancelledOrder);

    await requestWithExpect({
      client,
      token: buyerToken,
      method: 'post',
      url: `/api/orders/${cancelOrder.id}/cancel`,
      expectedStatus: 400,
      label: 'cannotCancelTwice',
      verbose: options.verbose
    });

    const buyerAfterCancel = await prisma.user.findUnique({
      where: { id: buyer.id },
      select: { walletBalance: true }
    });
    const providerAAfterCancel = await prisma.user.findUnique({
      where: { id: providerA.id },
      select: { walletBalance: true }
    });
    const skuAAfterCancel = await prisma.serviceSku.findUnique({
      where: { id: ids.skuA },
      select: { stock: true }
    });
    const serviceAAfterCancel = await prisma.service.findUnique({
      where: { id: ids.serviceA },
      select: { sales: true }
    });
    assert(buyerAfterCancel && providerAAfterCancel && skuAAfterCancel && serviceAAfterCancel, 'Cancel verification data missing');

    assert(
      roundMoney(buyerAfterCancel.walletBalance) === roundMoney(buyerBeforeCancel.walletBalance),
      'Buyer wallet mismatch after cancel compensation',
      { before: buyerBeforeCancel.walletBalance, after: buyerAfterCancel.walletBalance }
    );
    assert(
      roundMoney(providerAAfterCancel.walletBalance) === roundMoney(providerABeforeCancel.walletBalance),
      'Provider A wallet mismatch after cancel compensation',
      { before: providerABeforeCancel.walletBalance, after: providerAAfterCancel.walletBalance }
    );
    assert(Number(skuAAfterCancel.stock) === Number(skuABeforeCancel.stock), 'SKU A stock mismatch after cancel', {
      before: skuABeforeCancel.stock,
      after: skuAAfterCancel.stock
    });
    assert(Number(serviceAAfterCancel.sales) === Number(serviceABeforeCancel.sales), 'Service A sales mismatch after cancel', {
      before: serviceABeforeCancel.sales,
      after: serviceAAfterCancel.sales
    });

    const cancelBuyerTxn = await prisma.userTransaction.findFirst({
      where: {
        userId: buyer.id,
        type: 'refund',
        orderId: cancelOrder.id
      }
    });
    const cancelProviderTxn = await prisma.userTransaction.findFirst({
      where: {
        userId: providerA.id,
        type: 'refund_out',
        orderId: cancelOrder.id
      }
    });
    assert(cancelBuyerTxn, 'Missing buyer cancel refund transaction', { orderId: cancelOrder.id });
    assert(cancelProviderTxn, 'Missing provider cancel reversal transaction', { orderId: cancelOrder.id });

    const buyerBeforeRefund = await prisma.user.findUnique({
      where: { id: buyer.id },
      select: { walletBalance: true }
    });
    const providerBBeforeRefund = await prisma.user.findUnique({
      where: { id: providerB.id },
      select: { walletBalance: true }
    });
    const skuBBeforeRefund = await prisma.serviceSku.findUnique({
      where: { id: ids.skuB },
      select: { stock: true }
    });
    const serviceBBeforeRefund = await prisma.service.findUnique({
      where: { id: ids.serviceB },
      select: { sales: true }
    });
    assert(buyerBeforeRefund && providerBBeforeRefund && skuBBeforeRefund && serviceBBeforeRefund, 'Refund baseline data missing');

    const refundableOrder = await requestWithExpect({
      client,
      token: buyerToken,
      method: 'post',
      url: '/api/orders',
      data: {
        items: [{ skuId: ids.skuB, quantity: 1 }],
        total: prices.skuB
      },
      expectedStatus: 201,
      label: 'createRefundableOrder',
      verbose: options.verbose
    });
    assert(refundableOrder && refundableOrder.id, 'Refundable order payload is invalid', refundableOrder);
    created.orderIds.push(refundableOrder.id);

    await requestWithExpect({
      client,
      token: providerBToken,
      method: 'put',
      url: `/api/orders/${refundableOrder.id}/status`,
      data: { status: 'shipped' },
      expectedStatus: 200,
      label: 'shipRefundableOrder',
      verbose: options.verbose
    });

    await requestWithExpect({
      client,
      token: buyerToken,
      method: 'post',
      url: `/api/orders/${refundableOrder.id}/cancel`,
      expectedStatus: 400,
      label: 'cannotCancelShippedOrder',
      verbose: options.verbose
    });

    await requestWithExpect({
      client,
      token: lowBuyerToken,
      method: 'post',
      url: `/api/orders/${refundableOrder.id}/refund`,
      data: { restock: true },
      expectedStatus: 403,
      label: 'unauthorizedRefundOrder',
      verbose: options.verbose
    });

    const refundedOrder = await requestWithExpect({
      client,
      token: buyerToken,
      method: 'post',
      url: `/api/orders/${refundableOrder.id}/refund`,
      data: { restock: true },
      expectedStatus: 200,
      label: 'buyerRefundOrder',
      verbose: options.verbose
    });
    assert(refundedOrder.status === 'refunded', 'Refund order status mismatch', refundedOrder);

    await requestWithExpect({
      client,
      token: buyerToken,
      method: 'post',
      url: `/api/orders/${refundableOrder.id}/refund`,
      data: { restock: true },
      expectedStatus: 400,
      label: 'cannotRefundTwice',
      verbose: options.verbose
    });

    const buyerAfterRefund = await prisma.user.findUnique({
      where: { id: buyer.id },
      select: { walletBalance: true }
    });
    const providerBAfterRefund = await prisma.user.findUnique({
      where: { id: providerB.id },
      select: { walletBalance: true }
    });
    const skuAAfterRefund = await prisma.serviceSku.findUnique({
      where: { id: ids.skuA },
      select: { stock: true }
    });
    const skuBAfterRefund = await prisma.serviceSku.findUnique({
      where: { id: ids.skuB },
      select: { stock: true }
    });
    const serviceAAfterRefund = await prisma.service.findUnique({
      where: { id: ids.serviceA },
      select: { sales: true }
    });
    const serviceBAfterRefund = await prisma.service.findUnique({
      where: { id: ids.serviceB },
      select: { sales: true }
    });
    assert(
      buyerAfterRefund &&
      providerBAfterRefund &&
      skuAAfterRefund &&
      skuBAfterRefund &&
      serviceAAfterRefund &&
      serviceBAfterRefund,
      'Refund verification data missing'
    );

    assert(
      roundMoney(buyerAfterRefund.walletBalance) === roundMoney(buyerBeforeRefund.walletBalance),
      'Buyer wallet mismatch after refund compensation',
      { before: buyerBeforeRefund.walletBalance, after: buyerAfterRefund.walletBalance }
    );
    assert(
      roundMoney(providerBAfterRefund.walletBalance) === roundMoney(providerBBeforeRefund.walletBalance),
      'Provider B wallet mismatch after refund compensation',
      { before: providerBBeforeRefund.walletBalance, after: providerBAfterRefund.walletBalance }
    );
    assert(Number(skuBAfterRefund.stock) === Number(skuBBeforeRefund.stock), 'SKU B stock mismatch after refund', {
      before: skuBBeforeRefund.stock,
      after: skuBAfterRefund.stock
    });
    assert(Number(serviceBAfterRefund.sales) === Number(serviceBBeforeRefund.sales), 'Service B sales mismatch after refund', {
      before: serviceBBeforeRefund.sales,
      after: serviceBAfterRefund.sales
    });
    assert(Number(skuAAfterRefund.stock) === Number(skuAAfterCancel.stock), 'SKU A stock drift detected after refund', {
      before: skuAAfterCancel.stock,
      after: skuAAfterRefund.stock
    });
    assert(Number(serviceAAfterRefund.sales) === Number(serviceAAfterCancel.sales), 'Service A sales drift detected after refund', {
      before: serviceAAfterCancel.sales,
      after: serviceAAfterRefund.sales
    });

    const refundBuyerTxn = await prisma.userTransaction.findFirst({
      where: {
        userId: buyer.id,
        type: 'refund',
        orderId: refundableOrder.id
      }
    });
    const refundProviderTxn = await prisma.userTransaction.findFirst({
      where: {
        userId: providerB.id,
        type: 'refund_out',
        orderId: refundableOrder.id
      }
    });
    assert(refundBuyerTxn, 'Missing buyer refund transaction', { orderId: refundableOrder.id });
    assert(refundProviderTxn, 'Missing provider refund reversal transaction', { orderId: refundableOrder.id });

    const finalOrders = await prisma.order.findMany({
      where: { id: { in: [orderA.id, orderB.id] } },
      select: { id: true, status: true }
    });

    assert(finalOrders.every((order) => order.status === 'completed'), 'Final order status mismatch', finalOrders);

    const finalSkuA = await prisma.serviceSku.findUnique({ where: { id: ids.skuA } });
    const finalSkuB = await prisma.serviceSku.findUnique({ where: { id: ids.skuB } });
    assert(finalSkuA, 'SKU A not found after workflow');
    assert(finalSkuB, 'SKU B not found after workflow');
    assert(Number(finalSkuA.stock) === 18, 'SKU A stock mismatch after workflow', finalSkuA);
    assert(Number(finalSkuB.stock) === 19, 'SKU B stock mismatch after workflow', finalSkuB);

    console.log('[regression] PASS: split checkout workflow is consistent.');
    console.log(
      `[regression] checkoutId=${createRes.checkoutId}, orders=${created.orderIds.join(', ')}, total=${expectedTotal}, stockA=${finalSkuA.stock}, stockB=${finalSkuB.stock}, stockC=${finalSkuC.stock}`
    );
  } catch (error) {
    console.error('[regression] FAIL:', error.message);
    if (error.details) {
      console.error('[regression] details:', safeJson(error.details));
    }
    process.exitCode = 1;
  } finally {
    if (!options.keepData) {
      try {
        await prisma.order.deleteMany({ where: { id: { in: created.orderIds } } });
        await prisma.serviceSku.deleteMany({ where: { id: { in: [ids.skuA, ids.skuB, ids.skuC] } } });
        await prisma.service.deleteMany({ where: { id: { in: [ids.serviceA, ids.serviceB, ids.serviceC] } } });
        if (created.addressId) {
          await prisma.address.deleteMany({ where: { id: created.addressId } });
        }
        await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });

        console.log('[regression] cleanup done (use --keep-data to preserve fixtures).');
      } catch (cleanupError) {
        console.error('[regression] cleanup failed:', cleanupError.message);
      }
    } else {
      console.log('[regression] keep-data enabled, fixtures retained for inspection.');
    }

    await prisma.$disconnect().catch(() => {});
  }
};

main();
