const crypto = require('crypto');
const express = require('express');
const axios = require('axios');

const router = express.Router();

const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/auth');
const { createRateLimiter } = require('../utils/rateLimiter');
const { uploadBufferToObjectStorage } = require('../utils/objectStorage');

const API_KEY = process.env.DEEPSEEK_API_KEY;
const API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';
const AI_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const ENABLE_AI_MOCK = String(process.env.ENABLE_AI_MOCK || 'false').toLowerCase() === 'true';
const REQUIRE_PAYMENT_CONFIRM = String(process.env.AI_REQUIRE_PAYMENT_CONFIRM || 'true').toLowerCase() === 'true';

const FREE_QUOTA_PER_WEEK = 50;
const COST_PER_MESSAGE = 0.1;

const aiDailyLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000,
  max: 100,
  message: {
    error: 'Rate Limit Exceeded',
    message: 'Daily AI request limit reached',
  },
  prefix: 'rate:ai:daily:',
});

const aiBurstLimiter = createRateLimiter({
  windowMs: 30 * 1000,
  max: 3,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests, please retry shortly',
  },
  prefix: 'rate:ai:burst:',
});

const aiPublishLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    error: 'Too Many Requests',
    message: 'Publishing too frequently, please retry shortly',
  },
  prefix: 'rate:ai:publish:',
});

const MOCK_RESPONSES = {
  planner: [
    "Great idea. Let's clarify the target user and the top pain point first.",
    'Got it. What is the single most important differentiator of this product?',
  ],
  designer: [
    'Understood. Do you prefer a minimal or bold visual style?',
    'Before prototyping, should the product feel soft/rounded or sharp/technical?',
  ],
  supply: [
    'For production planning, what is your target BOM range and first batch size?',
    'For early runs under 500 units, consider low-cost tooling and modular components.',
  ],
  sales: [
    'This concept has strong storytelling potential. What is your launch channel priority?',
    'We can frame positioning around innovation + practical value. What is your expected price band?',
  ],
  cfo: ['{"revenue":0,"cost":0,"profit":0,"roi":0,"chartData":[]}'],
};

const getMondayOfCurrentWeek = () => {
  const current = new Date();
  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  current.setDate(diff);
  return current.toISOString().split('T')[0];
};

const isTestAccount = (user) => {
  const username = String(user?.username || '').toLowerCase();
  return username === 'test' || username.includes('test');
};

const ensureAiUsageForWeek = async (userId, weekString) => {
  let usage = await prisma.aiUsage.findUnique({ where: { userId } });

  if (!usage) {
    usage = await prisma.aiUsage.create({
      data: {
        userId,
        freeQuotaResetDate: weekString,
        freeUsedToday: 0,
      },
    });
    return usage;
  }

  if (usage.freeQuotaResetDate !== weekString) {
    usage = await prisma.aiUsage.update({
      where: { userId },
      data: {
        freeQuotaResetDate: weekString,
        freeUsedToday: 0,
      },
    });
  }

  return usage;
};

const pickMockResponse = (messages = []) => {
  const systemMsg = messages.find((item) => item.role === 'system')?.content || '';
  const lastUserMsg = messages
    .slice()
    .reverse()
    .find((item) => item.role === 'user')?.content || '';

  const pick = (pool) => pool[Math.abs(lastUserMsg.length) % pool.length];

  if (systemMsg.includes('NS-Planner')) return pick(MOCK_RESPONSES.planner);
  if (systemMsg.includes('NS-Designer')) return pick(MOCK_RESPONSES.designer);
  if (systemMsg.includes('NS-SupplyChain')) return pick(MOCK_RESPONSES.supply);
  if (systemMsg.includes('NS-Sales')) return pick(MOCK_RESPONSES.sales);
  if (systemMsg.includes('NS-CIO/CFO')) return MOCK_RESPONSES.cfo[0];

  return 'AI is processing your request. Please wait a moment.';
};

const chargeUserForAi = async ({ userId, isFree }) => {
  if (isFree) {
    await prisma.aiUsage.update({
      where: { userId },
      data: {
        freeUsedToday: { increment: 1 },
      },
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found while charging AI usage');
    }

    const currentBalance = Number(user.walletBalance || 0);
    if (currentBalance < COST_PER_MESSAGE) {
      const error = new Error('Insufficient balance while charging AI usage');
      error.code = 'INSUFFICIENT_BALANCE';
      throw error;
    }

    const nextBalance = Number((currentBalance - COST_PER_MESSAGE).toFixed(4));

    await tx.user.update({
      where: { id: userId },
      data: { walletBalance: nextBalance },
    });

    await tx.userTransaction.create({
      data: {
        userId,
        type: 'payment',
        title: 'AI Lab Usage Charge',
        amount: -COST_PER_MESSAGE,
        balanceAfter: nextBalance,
        channel: 'wallet',
        status: 'completed',
        counterparty: 'NS Matrix',
      },
    });

    await tx.aiUsage.update({
      where: { userId },
      data: {
        paidUsedTotal: { increment: 1 },
      },
    });
  });
};

const injectStoreContextIfNeeded = async ({ messages, agentType }) => {
  const normalizedMessages = Array.isArray(messages) ? messages : [];

  const isStoreAssistant =
    agentType === 'store_assistant' ||
    normalizedMessages.some(
      (item) =>
        item.role === 'system' &&
        (String(item.content || '').includes('store assistant') ||
          String(item.content || '').includes('Shopping Assistant'))
    );

  const alreadyHasContext = normalizedMessages.some(
    (item) =>
      item.role === 'system' &&
      (String(item.content || '').includes('[SYSTEM DB CONTEXT]') ||
        String(item.content || '').includes('LIVE CATALOG PREVIEW'))
  );

  if (!isStoreAssistant || alreadyHasContext) {
    return normalizedMessages;
  }

  const services = await prisma.service.findMany({
    take: 12,
    orderBy: [{ sales: 'desc' }, { views: 'desc' }, { createdAt: 'desc' }],
    where: { status: 'active' },
    include: {
      user: {
        select: {
          username: true,
          sign: true,
          reputation: true,
        },
      },
    },
  });

  const formattedServices = services.map((service) => ({
    id: service.id,
    title: service.title,
    price: service.price,
    type: service.type || 'unclassified',
    description: service.description,
    sales: service.sales || 0,
    provider: service.provider || service.user?.username || 'unknown-maker',
    details: service.details ? `${String(service.details).slice(0, 100)}...` : 'No details',
  }));

  const context =
    '\n\n[SYSTEM DB CONTEXT]\nCurrent Smart-JA NS-Store hot services (injected from backend):\n```json\n' +
    `${JSON.stringify(formattedServices, null, 2)}` +
    '\n```\n\n[ROLE INSTRUCTION]\nYou are Smart-JA flagship store AI sales assistant. Recommend only existing products and quote real title/price from context.';

  const systemIndex = normalizedMessages.findIndex((item) => item.role === 'system');
  if (systemIndex === -1) {
    return [{ role: 'system', content: context }, ...normalizedMessages];
  }

  if (!String(normalizedMessages[systemIndex].content || '').includes('[SYSTEM DB CONTEXT]')) {
    normalizedMessages[systemIndex].content = `${normalizedMessages[systemIndex].content || ''}${context}`;
  }

  return normalizedMessages;
};

const injectFallbackRenderingInstructions = (messages) => {
  if (!Array.isArray(messages)) {
    return messages;
  }

  const systemIndex = messages.findIndex((item) => item.role === 'system');
  if (systemIndex === -1) {
    return messages;
  }

  const instructions =
    '\n\n[Fallback Rendering Instructions]\n1) If user asks for concept art, append [DRAW: detailed English prompt].\n2) If user asks for business canvas output, return a strict JSON block with fields: name, pitch, price, type, tags, description.';

  if (!String(messages[systemIndex].content || '').includes('[Fallback Rendering Instructions]')) {
    messages[systemIndex].content = `${messages[systemIndex].content || ''}${instructions}`;
  }

  return messages;
};

const extractAssistantText = (responseData) =>
  responseData?.choices?.[0]?.message?.content || responseData?.choices?.[0]?.text || '';

const toPriceNumber = (value, fallback) => {
  const parsed = Number(String(value ?? '').replace(/[,$]/g, '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeTags = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 12);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  return [];
};

const inferImageExtension = (url, mimeType = '') => {
  const byMime = String(mimeType).split('/')[1]?.toLowerCase();
  if (['jpeg', 'jpg', 'png', 'webp', 'gif'].includes(byMime)) {
    return byMime === 'jpeg' ? 'jpg' : byMime;
  }

  const cleanUrl = String(url || '').split('?')[0];
  const byUrl = cleanUrl.split('.').pop()?.toLowerCase();
  if (['jpeg', 'jpg', 'png', 'webp', 'gif'].includes(byUrl)) {
    return byUrl === 'jpeg' ? 'jpg' : byUrl;
  }

  return 'jpg';
};

const persistCoverImageIfNeeded = async (sourceUrl) => {
  const fallbackImage =
    'https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

  if (!sourceUrl || typeof sourceUrl !== 'string') {
    return fallbackImage;
  }

  const normalized = sourceUrl.trim();
  if (!normalized) {
    return fallbackImage;
  }

  if (!/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  try {
    const downloadResponse = await axios.get(normalized, {
      responseType: 'arraybuffer',
      timeout: 15000,
    });

    if (downloadResponse.status < 200 || downloadResponse.status >= 300) {
      return normalized;
    }

    const extension = inferImageExtension(normalized, downloadResponse.headers['content-type']);
    const uploaded = await uploadBufferToObjectStorage({
      buffer: Buffer.from(downloadResponse.data),
      originalname: `ai-gen-${Date.now()}.${extension}`,
      mimetype: downloadResponse.headers['content-type'] || `image/${extension === 'jpg' ? 'jpeg' : extension}`,
    });

    return uploaded?.url || normalized;
  } catch (error) {
    console.warn('[AI Publish] Failed to persist external image, using original URL:', error.message);
    return normalized;
  }
};

router.get('/quota', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (isTestAccount(user)) {
      return res.json({
        remaining: 9999,
        isTestAccount: true,
      });
    }

    const usage = await ensureAiUsageForWeek(userId, getMondayOfCurrentWeek());

    return res.json({
      remaining: Math.max(0, FREE_QUOTA_PER_WEEK - usage.freeUsedToday),
    });
  } catch (error) {
    console.error('Failed to get AI quota:', error);
    return res.json({ remaining: FREE_QUOTA_PER_WEEK });
  }
});

router.post('/chat', aiBurstLimiter, aiDailyLimiter, authenticateToken, async (req, res) => {
  const {
    temperature = 1,
    max_tokens = 4000,
    stream = false,
    agent_type,
    confirmPaid = false,
  } = req.body || {};

  let messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const userId = req.user.id;

  if (!messages.length) {
    return res.status(400).json({ error: 'messages is required' });
  }

  const weekString = getMondayOfCurrentWeek();
  let shouldChargeAsFree = true;

  try {
    const [user, usage] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      ensureAiUsageForWeek(userId, weekString),
    ]);

    const hasFreeQuota = isTestAccount(user) || usage.freeUsedToday < FREE_QUOTA_PER_WEEK;

    if (hasFreeQuota) {
      shouldChargeAsFree = true;
    } else {
      shouldChargeAsFree = false;
      const currentBalance = Number(user?.walletBalance || 0);

      if (currentBalance < COST_PER_MESSAGE) {
        return res.status(402).json({
          error: 'Insufficient Balance',
          message: 'Weekly free AI quota is exhausted. Please top up your wallet balance to continue.',
        });
      }

      if (REQUIRE_PAYMENT_CONFIRM && !confirmPaid) {
        return res.status(402).json({
          error: 'Payment Confirmation Required',
          message: `Weekly free AI quota is exhausted. Confirm to charge ${COST_PER_MESSAGE} from wallet for this request.`,
        });
      }
    }
  } catch (error) {
    console.error('Failed to verify AI quota:', error);
    return res.status(500).json({ error: 'Failed to verify AI quotas' });
  }

  try {
    messages = await injectStoreContextIfNeeded({ messages, agentType: agent_type });
  } catch (error) {
    console.warn('Failed to inject store context:', error.message);
  }

  injectFallbackRenderingInstructions(messages);

  if (!API_KEY && !ENABLE_AI_MOCK) {
    return res.status(500).json({ error: 'API Configuration Error: DeepSeek API key is missing.' });
  }

  if (!API_KEY && ENABLE_AI_MOCK) {
    return res.json({ content: pickMockResponse(messages) });
  }

  const markCharge = async () => {
    try {
      await chargeUserForAi({ userId, isFree: shouldChargeAsFree });
    } catch (error) {
      console.error('CRITICAL: Failed to charge user for AI usage:', error);
    }
  };

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let finished = false;
    const finishSuccess = () => {
      if (finished) return;
      finished = true;
      res.write('data: [DONE]\n\n');
      res.end();
      void markCharge();
    };

    const finishFailure = (message) => {
      if (finished) return;
      finished = true;
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    };

    try {
      const upstream = await axios({
        method: 'post',
        url: API_URL,
        data: {
          model: AI_MODEL,
          messages,
          temperature,
          max_tokens,
          stream: true,
        },
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
        timeout: 120000,
      });

      let pending = '';

      upstream.data.on('data', (chunk) => {
        pending += chunk.toString('utf8');
        const lines = pending.split('\n');
        pending = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const raw = trimmed.slice(5).trim();
          if (raw === '[DONE]') {
            finishSuccess();
            return;
          }

          try {
            const parsed = JSON.parse(raw);
            const delta = parsed?.choices?.[0]?.delta?.content;
            if (delta) {
              res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
            }
          } catch {
            // Ignore chunk parse errors from partial/event noise.
          }
        }
      });

      upstream.data.on('end', () => {
        if (!finished) {
          finishSuccess();
        }
      });

      upstream.data.on('error', (error) => {
        console.error('DeepSeek streaming error:', error);
        finishFailure('AI stream failed');
      });
    } catch (error) {
      console.error('DeepSeek stream request failed:', error?.response?.data || error.message);

      if (ENABLE_AI_MOCK) {
        res.write(`data: ${JSON.stringify({ content: pickMockResponse(messages) })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      finishFailure('AI service unavailable');
    }

    return;
  }

  try {
    const response = await axios.post(
      API_URL,
      {
        model: AI_MODEL,
        messages,
        temperature,
        max_tokens,
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      }
    );

    const content = extractAssistantText(response.data) || (ENABLE_AI_MOCK ? pickMockResponse(messages) : '');
    if (!content) {
      return res.status(503).json({ error: 'AI Service Unavailable' });
    }

    await markCharge();
    return res.json({ content });
  } catch (error) {
    console.error('DeepSeek non-stream request failed:', error?.response?.data || error.message);

    if (ENABLE_AI_MOCK) {
      return res.json({ content: pickMockResponse(messages) });
    }

    return res.status(503).json({ error: 'AI Service Unavailable' });
  }
});

router.post('/publish', aiPublishLimiter, authenticateToken, async (req, res) => {
  try {
    const payload = req.body?.serviceData || req.body || {};

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const title = String(payload.title || payload.name || payload.productName || 'NS-AI incubated project').trim();
    const description = String(
      payload.description || payload.desc || payload.summary || 'Generated by NS Matrix AI incubator.'
    ).trim();
    const type = String(payload.type || payload.category || 'custom').trim() || 'custom';

    const rawPrice = payload.price ?? payload.pricing ?? payload.salePrice;
    const finalPrice = toPriceNumber(rawPrice, 299);

    const imageCandidate =
      payload.image ||
      payload.imageUrl ||
      payload.imageURL ||
      payload.cover ||
      payload.coverUrl ||
      payload.thumbnail ||
      payload.poster ||
      null;

    const normalizedTags = normalizeTags(payload.tags ?? payload.tagList);
    const tags = Array.from(new Set(['AI incubation', ...normalizedTags]));

    const finalImageUrl = await persistCoverImageIfNeeded(imageCandidate);

    const serviceId = `ai-proj-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const created = await prisma.$transaction(async (tx) => {
      const service = await tx.service.create({
        data: {
          id: serviceId,
          title,
          description,
          price: finalPrice,
          type,
          tags,
          status: 'active',
          sales: 0,
          views: 0,
          userId: user.id,
          provider: user.username || 'NS AI Maker',
          image: finalImageUrl,
        },
      });

      const earlyBirdPrice = Number(Math.max(0.01, finalPrice * 0.7).toFixed(2));

      const skus = await Promise.all([
        tx.serviceSku.create({
          data: {
            serviceId: service.id,
            name: 'Early Bird (Limited)',
            price: earlyBirdPrice,
            stock: 500,
            image: finalImageUrl,
            sort: 0,
          },
        }),
        tx.serviceSku.create({
          data: {
            serviceId: service.id,
            name: 'Standard Edition',
            price: finalPrice,
            stock: 9999,
            image: finalImageUrl,
            sort: 1,
          },
        }),
      ]);

      return { service, skus };
    });

    return res.json({
      success: true,
      service: created.service,
      skus: created.skus,
      message: 'Your incubated project is now live on NS Market!',
    });
  } catch (error) {
    console.error('AI publish error:', error);
    return res.status(500).json({ error: 'Failed to publish AI project' });
  }
});

module.exports = router;
