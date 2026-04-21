const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');
const express = require('express');
const axios = require('axios');
const { search } = require('duck-duck-scrape');

const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/auth');
const { createRateLimiter } = require('../utils/rateLimiter');

const router = express.Router();

const API_URL = process.env.ZEROCLAW_API_URL || 'http://host.docker.internal:8080/webhook';
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
  prefix: 'rate:zeroclaw:daily:',
});

const aiBurstLimiter = createRateLimiter({
  windowMs: 30 * 1000,
  max: 3,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests, please retry shortly',
  },
  prefix: 'rate:zeroclaw:burst:',
});

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
      throw new Error('User not found while charging ZeroClaw usage');
    }

    const currentBalance = Number(user.walletBalance || 0);
    if (currentBalance < COST_PER_MESSAGE) {
      const error = new Error('Insufficient balance while charging ZeroClaw usage');
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
        title: 'ZeroClaw AI Usage Charge',
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

const loadAgentMind = (agentName) => {
  try {
    const filePath = path.join(__dirname, '..', 'agents', `${agentName}.yaml`);
    if (!fs.existsSync(filePath)) {
      return '';
    }

    const doc = yaml.load(fs.readFileSync(filePath, 'utf8'));
    return doc?.system_prompt || doc?.prompt || '';
  } catch (error) {
    console.error(`Failed to load mind for ${agentName}:`, error);
    return '';
  }
};

router.post('/draw', aiBurstLimiter, aiDailyLimiter, authenticateToken, async (req, res) => {
  try {
    const { prompt } = req.body || {};
    const encodedPrompt = encodeURIComponent(`${prompt || ''} masterpiece, high quality, highly detailed`);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;

    return res.json({ url });
  } catch (error) {
    console.error('ZeroClaw image engine error:', error.message);
    return res.status(500).json({ error: 'Image service unavailable' });
  }
});

router.post('/agent', aiBurstLimiter, aiDailyLimiter, authenticateToken, async (req, res) => {
  const {
    messages = [],
    agentId,
    stream = true,
    confirmPaid = false,
  } = req.body || {};

  const normalizedMessages = Array.isArray(messages) ? messages : [];
  const userId = req.user.id;

  let isFree = true;

  try {
    const weekString = getMondayOfCurrentWeek();
    const [user, usage] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      ensureAiUsageForWeek(userId, weekString),
    ]);

    const hasFreeQuota = isTestAccount(user) || usage.freeUsedToday < FREE_QUOTA_PER_WEEK;

    if (hasFreeQuota) {
      isFree = true;
    } else {
      isFree = false;
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
    console.error('Failed to verify AI quotas:', error);
    return res.status(500).json({ error: 'Failed to verify AI quotas' });
  }

  const markCharge = async () => {
    try {
      await chargeUserForAi({ userId, isFree });
    } catch (error) {
      console.error('CRITICAL: Failed to charge user for ZeroClaw usage:', error);
    }
  };

  try {
    let targetAgent = agentId ? String(agentId).replace('ns-', '') : 'sales';
    let routingLog = '';

    if (targetAgent === 'sales' || !agentId) {
      const lastUserMessage = normalizedMessages
        .slice()
        .reverse()
        .find((item) => item.role === 'user')?.content || '';

      const techKeywords = ['画图', '图纸', '设计', '开发', '创客', '产品想法', '3d', '建模', '材料'];
      if (techKeywords.some((word) => String(lastUserMessage).toLowerCase().includes(word))) {
        targetAgent = 'planner';
        routingLog = 'Coordinator Decision: Routing to Planner/Designer for Maker Request.';
      } else {
        routingLog = 'Coordinator Decision: Routing to Sales (General Inquiry/Shopping).';
      }
    }

    const agentNames = {
      planner: 'Planner',
      designer: 'Designer',
      coordinator: 'Coordinator',
      sales: 'Sales',
      mentor: 'Mentor',
      product_lead: 'Product Lead',
      design_lead: 'Design Lead',
    };

    const baseMind =
      loadAgentMind(targetAgent) ||
      `You are the ${agentNames[targetAgent] || 'assistant'} in ZeroClaw orchestration.`;

    const lastUserMsgText = normalizedMessages
      .slice()
      .reverse()
      .find((item) => item.role === 'user')?.content || '';

    let searchContext = '';
    const searchKeywords = ['联网', '实时', '最新', '搜索', '新闻', '查一下', '现在', 'today', 'latest'];

    if (searchKeywords.some((word) => String(lastUserMsgText).toLowerCase().includes(String(word).toLowerCase()))) {
      try {
        const searchRes = await search(String(lastUserMsgText), { safeSearch: 'off' });
        if (searchRes?.results?.length) {
          searchContext += '\n\n[ZeroClaw Internet Search Context]';
          searchRes.results.slice(0, 3).forEach((result, index) => {
            searchContext += `\n[${index + 1}] ${result.title}\n${result.description}`;
          });
          routingLog += ' (Internet Skill Activated)';
        }
      } catch (error) {
        console.error('ZeroClaw internet search failed:', error.message);
      }
    }

    const currentDateTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const timeContext = `\n[System Time] ${currentDateTime}`;

    try {
      const identityPath = path.join(os.homedir(), '.zeroclaw', 'workspace', 'IDENTITY.md');
      const identityContent = `# Agent Identity\nRole: ${agentNames[targetAgent] || 'Assistant'}\n${baseMind}${timeContext}${searchContext}`;
      fs.writeFileSync(identityPath, identityContent, 'utf8');
    } catch (error) {
      console.error('Failed to write IDENTITY.md to ZeroClaw workspace:', error);
    }

    const latestUserMessage = normalizedMessages
      .slice()
      .reverse()
      .find((item) => item.role === 'user')?.content || '';

    if (stream) {
      const response = await axios.post(
        API_URL,
        { message: latestUserMessage },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 120000,
        }
      );

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      if (routingLog) {
        res.write(`data: ${JSON.stringify({ content: `[${routingLog}]\n\n` })}\n\n`);
      }

      const replyText = response?.data?.response || 'Agent completed but returned empty output.';
      const chunks = String(replyText).match(/[\s\S]{1,3}/g) || [String(replyText)];

      let chunkIndex = 0;
      const timer = setInterval(() => {
        if (chunkIndex >= chunks.length) {
          clearInterval(timer);
          res.write('data: [DONE]\n\n');
          res.end();
          void markCharge();
          return;
        }

        res.write(`data: ${JSON.stringify({ content: chunks[chunkIndex] })}\n\n`);
        chunkIndex += 1;
      }, 50);

      return;
    }

    const response = await axios.post(
      API_URL,
      { message: latestUserMessage },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000,
      }
    );

    await markCharge();
    return res.json({ content: response?.data?.response || '' });
  } catch (error) {
    console.error('ZeroClaw engine error:', error?.response?.data || error.message);

    if (!res.headersSent) {
      return res.status(503).json({ error: 'AI Service Unavailable', details: error.message });
    }

    res.write(`data: ${JSON.stringify({ error: 'AI Connection failed' })}\n\n`);
    res.end();
  }
});

module.exports = router;
