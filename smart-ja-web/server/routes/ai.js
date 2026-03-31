const express = require('express');
const router = express.Router();
const axios = require('axios');
const authenticateToken = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const aiDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 100,
  message: { error: 'Rate Limit Exceeded', message: "每日接口调用已达上限，请明天再试" },
});

const aiBurstLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 3,
  message: { error: 'Too Many Requests', message: "操作太快了，冷却一下吧！" }
});

// DeepSeek API Configuration
const API_KEY = process.env.DEEPSEEK_API_KEY;
const API_URL = 'https://api.deepseek.com/chat/completions';

// Mock Responses (Fallback)
const MOCK_RESPONSES = {
  planner: [
    "这是一个非常有意思的想法！能详细描述一下您的目标用户是谁吗？或者您希望这个产品解决什么核心痛点？我们先确定MPV（最小可行性产品）的功能边界。[CONFIRM]",
    "收到。这个概念很有潜力。为了进一步细化方案，您觉得这个产品的核心差异化卖点是什么？是价格、功能还是设计？[CONFIRM]"
  ],
  designer: [
    "明白了。对于这个产品，您倾向于什么样的设计风格？是极简科技风（如Apple风格），还是复古工业风？另外，您对材质有什么特殊要求吗（如环保材料、金属质感）？[CONFIRM]",
    "收到。我会尝试为您生成几个不同的设计方向。在进入建模之前，您希望产品的外观更偏向于圆润亲和，还是硬朗酷炫？[CONFIRM]"
  ],
  supply: [
    "收到设计方案。如果要量产这个产品，我们需要重点考虑关键部件的供应链。您预期的单件成本（BOM Cost）大约是多少？这将决定我们选择什么样的模具和工艺。[CONFIRM]",
    "为了控制成本，我建议核心电子元器件优先选用成熟的通用模块。您计划首批试产多少台？如果是小批量（<500台），建议使用3D打印或简易模具。[CONFIRM]"
  ],
  sales: [
    "这个产品的卖点很独特！我们不仅可以在电商平台销售，还可以考虑在Kickstarter或Indiegogo发起众筹。您觉得早鸟价定在多少比较合适？[CONFIRM]",
    "根据产品定位，我建议我们主打“创新体验”的营销策略。Slogan可以更具情感共鸣。您觉得这句如何：“重新定义你的生活方式”。[CONFIRM]"
  ],
  cfo: [
    "```json\n{\n  \"revenue\": 0,\n  \"cost\": 0,\n  \"profit\": 0,\n  \"roi\": 0,\n  \"chartData\": []\n}\n```\n(数据服务暂时离线，请稍后再试)[CONFIRM]"
  ]
};

const getMockResponse = (messages) => {
  const systemMsg = messages.find(m => m.role === 'system')?.content || '';
  const lastUserMsg = messages.slice().reverse().find(m => m.role === 'user')?.content || '';

  // Helper to pick random response but try to vary based on input length or hash
  const pick = (arr) => arr[Math.abs(lastUserMsg.length) % arr.length];

  if (systemMsg.includes('NS-Planner')) {
    if (lastUserMsg.includes('卖点') || lastUserMsg.includes('核心')) {
      return "差异化卖点是产品脱颖而出的关键。对于您的创意，建议从'情感连接'或'极致效率'两个维度思考。比如，它是否能帮用户节省每天30分钟的时间？或者它是否能成为用户表达个性的符号？[CONFIRM]";
    }
    return pick(MOCK_RESPONSES.planner);
  }

  if (systemMsg.includes('NS-Designer')) {
    if (lastUserMsg.includes('风格') || lastUserMsg.includes('外观')) {
      return "既然您关注风格，我建议尝试目前流行的'赛博朋克'或'复古未来主义'。透明外壳搭配霓虹灯效，能极大提升产品的社交属性。您觉得这种大胆的设计如何？[CONFIRM]";
    }
    return pick(MOCK_RESPONSES.designer);
  }

  if (systemMsg.includes('NS-SupplyChain')) return pick(MOCK_RESPONSES.supply);
  if (systemMsg.includes('NS-Sales')) return pick(MOCK_RESPONSES.sales);
  if (systemMsg.includes('NS-CIO/CFO')) return MOCK_RESPONSES.cfo[0];

  return "AI 正在思考您的需求... 请稍候。[CONFIRM]";
};

const prisma = require('../utils/prisma');

router.get('/quota', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    let usage = await prisma.aiUsage.findUnique({ where: { userId } });
    
    const isTestAccount = user && (user.username === 'test' || user.username?.toLowerCase().includes('test'));
    if (isTestAccount) {
      return res.json({ remaining: 9999, isTestAccount: true });
    }

    const FREE_QUOTA_PER_WEEK = 50;
    const currentWeekMonday = new Date();
    const day = currentWeekMonday.getDay();
    const diff = currentWeekMonday.getDate() - day + (day === 0 ? -6 : 1);
    const weekString = new Date(currentWeekMonday.setDate(diff)).toISOString().split('T')[0];

    if (!usage) {
      usage = await prisma.aiUsage.create({
        data: { userId, freeQuotaResetDate: weekString, freeUsedToday: 0 }
      });
    } else if (usage.freeQuotaResetDate !== weekString) {
      usage = await prisma.aiUsage.update({
        where: { userId },
        data: { freeQuotaResetDate: weekString, freeUsedToday: 0 }
      });
    }

    res.json({ remaining: Math.max(0, FREE_QUOTA_PER_WEEK - usage.freeUsedToday) });
  } catch (error) {
    console.error('Failed to get quota:', error);
    // If it fails, fallback to 50
    res.json({ remaining: 50 });
  }
});


router.post('/chat', aiBurstLimiter, aiDailyLimiter, authenticateToken, async (req, res) => {
  console.log('Received chat request (streaming enabled/disabled flag)');

  let { messages, temperature = 1.0, max_tokens = 4000, stream = false, agent_type } = req.body;
  const userId = req.user.id;

  if (!API_KEY) {
    console.error('Deepseek API Key missing.');
    return res.status(500).json({ error: 'API Configuration Error: Deepseek API Key is missing.' });
  }

  // ==== 计费与额度校验 ====
  let isFree = true;
  const COST_PER_MSG = 0.1;
  const FREE_QUOTA_PER_WEEK = 50;
  
  const currentWeekMonday = new Date();
  const day = currentWeekMonday.getDay();
  const diff = currentWeekMonday.getDate() - day + (day === 0 ? -6 : 1);
  const weekString = new Date(currentWeekMonday.setDate(diff)).toISOString().split('T')[0];

  try {
    let usage = await prisma.aiUsage.findUnique({ where: { userId } });
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const isTestAccount = user && (user.username === 'test' || user.username?.toLowerCase().includes('test'));

    // 初始化额度表
    if (!usage) {
      usage = await prisma.aiUsage.create({
        data: { userId, freeQuotaResetDate: weekString, freeUsedToday: 0 }
      });
    }

    // 重置每周免费额度
    if (usage.freeQuotaResetDate !== weekString) {
      usage = await prisma.aiUsage.update({
        where: { userId },
        data: { freeQuotaResetDate: weekString, freeUsedToday: 0 }
      });
    }

    if (isTestAccount || usage.freeUsedToday < FREE_QUOTA_PER_WEEK) {
      isFree = true;
    } else {
      isFree = false;
      if (Number(user.walletBalance || 0) < COST_PER_MSG) {
        return res.status(402).json({
          error: 'Insufficient Balance',
          message: 'Weekly free AI quota has been used up. Please recharge your wallet balance to continue.'
        });
      }
    }

  } catch (error) {
    console.error('Failed to check AI usage:', error);
    return res.status(500).json({ error: 'Failed to verify AI quotas' });
  }

  // Intercept and inject Database context if it's the Store Assistant
  try {
    const isStoreAssistant = agent_type === 'store_assistant' || messages.some(m => m.role === 'system' && m.content.includes('导购'));
    if (isStoreAssistant) {
      const services = await prisma.service.findMany({
        take: 12,
        orderBy: [{ sales: 'desc' }, { views: 'desc' }, { createdAt: 'desc' }],
        where: { status: 'active' },
        include: {
          user: { select: { username: true, sign: true, reputation: true } }
        }
      });

      const formattedServices = services.map((service) => ({
        id: service.id,
        title: service.title,
        price: service.price,
        type: service.type || 'unclassified',
        description: service.description,
        sales: service.sales || 0,
        provider: service.provider || service.user?.username || 'unknown-maker',
        details: service.details ? `${service.details.substring(0, 100)}...` : 'No details'
      }));

      const contextStr = `\n\n[SYSTEM DB CONTEXT]\nCurrent Smart-JA NS-Store hot services (injected from backend):\n\`\`\`json\n${JSON.stringify(formattedServices, null, 2)}\n\`\`\`\n\n[ROLE INSTRUCTION]\nYou are Smart-JA flagship store AI sales assistant. Recommend only existing products and quote real title/price from context.`;

      const sysIdx = messages.findIndex((m) => m.role === 'system');
      if (sysIdx !== -1) {
        if (!messages[sysIdx].content.includes('[SYSTEM DB CONTEXT]')) {
          messages[sysIdx].content += contextStr;
        }
      } else {
        messages.unshift({ role: 'system', content: contextStr });
      }
    }
  } catch (err) {
    console.error('Failed to inject DB context for AI:', err);
  }

  // Inject fallback rendering instructions for AI Lab agents
  if (messages && Array.isArray(messages)) {
    const sysIdx = messages.findIndex(m => m.role === 'system');
    const fallbackRenderInstructions = `\n\n【底层渲染指令】\n1. DRAW 指令：如果用户在对话中想要看产品概念图，请在段落末尾强制输出格式 \`[DRAW: 这里用纯英文写下你的画面prompt描述]\`。\n2. 商业画布指令：当你需要输出或总结商业画布方案时，必须严格使用 \`\`\`json 的格式输出商业画布 JSON 代码块，其中应包含 name, pitch, price, type, tags, description 等核心字段。`;
    if (sysIdx !== -1 && !messages[sysIdx].content.includes('【底层渲染指令】')) {
      messages[sysIdx].content += fallbackRenderInstructions;
    }
  }

  // 成功发起请求前/后的扣费回调逻辑
  const chargeUserForAi = async () => {
    try {
      if (isFree) {
        await prisma.aiUsage.update({
          where: { userId },
          data: { freeUsedToday: { increment: 1 } }
        });
      } else {
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.findUnique({ where: { id: userId } });
          const newBalance = Number(user.walletBalance || 0) - COST_PER_MSG;

          await tx.user.update({
            where: { id: userId },
            data: { walletBalance: newBalance }
          });

          await tx.userTransaction.create({
            data: {
              userId,
              type: 'payment',
              title: 'AI Lab Usage Charge',
              amount: -COST_PER_MSG,
              balanceAfter: newBalance,
              channel: 'wallet',
              status: 'completed',
              counterparty: 'NS Matrix'
            }
          });

          await tx.aiUsage.update({
            where: { userId },
            data: { paidUsedTotal: { increment: 1 } }
          });
        });
      }
    } catch (e) {
      console.error("CRITICAL: Failed to charge user for AI Usage:", e);
    }
  };

  if (stream) {
    // 省略原来的 stream API 设置
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const response = await axios({
        method: 'post',
        url: API_URL,
        data: { model: 'deepseek-chat', messages, temperature, max_tokens, stream: true },
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        responseType: 'stream',
        timeout: 120000
      });

      response.data.on('data', chunk => {
        const chunkStr = chunk.toString('utf8');
        const lines = chunkStr.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line === 'data: [DONE]') {
            res.write('data: [DONE]\n\n');
            // Charge only after stream completes successfully.
            chargeUserForAi();
            return res.end();
          }

          if (line.startsWith('data: ')) {
            try {
              const dataStr = line.replace('data: ', '');
              const parsed = JSON.parse(dataStr);
              if (parsed.choices && parsed.choices[0].delta?.content) {
                res.write(`data: ${JSON.stringify({ content: parsed.choices[0].delta.content })}\n\n`);
              }
            } catch (e) {
              // Ignore partial JSON
            }
          }
        }
      });

      response.data.on('end', () => res.end());
      response.data.on('error', err => {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      });

    } catch (error) {
      // ... 错误处理
      res.end();
    }
  } else {
    try {
      const response = await axios.post(API_URL, {
        model: 'deepseek-chat', messages, temperature, max_tokens, stream: false
      }, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        timeout: 120000
      });

      const content = response.data.choices[0].message.content;
      // 成功返回后扣费
      await chargeUserForAi();
      res.json({ content });
    } catch (error) {
      res.status(500).json({ error: 'AI Service Unavailable' });
    }
  }
});

// AILab Handoff: Publish generated project to Market
router.post('/publish', authenticateToken, async (req, res) => {
  try {
    const payload = req.body.serviceData || req.body || {};
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const title = payload.title || payload.name || payload.productName || 'NS-AI incubated project';
    const description = payload.description || payload.desc || payload.summary || 'Generated by NS Matrix AI incubator.';
    const rawPrice = payload.price ?? payload.pricing ?? payload.salePrice;
    const parsedPrice = Number(String(rawPrice ?? '').replace(/[,，]/g, '').replace(/[^\d.-]/g, ''));
    const type = payload.type || payload.category || 'custom';
    const coverImage =
      payload.image ||
      payload.imageUrl ||
      payload.imageURL ||
      payload.cover ||
      payload.coverUrl ||
      payload.thumbnail ||
      payload.poster ||
      null;

    const rawTags = payload.tags ?? payload.tagList;
    const extractedTags = Array.isArray(rawTags)
      ? rawTags
      : (typeof rawTags === 'string' ? rawTags.split(/[,\s，、|/]+/).filter(Boolean) : ['创新']);
    const finalTags = Array.from(new Set(['AI 孵化', ...extractedTags]));

    const finalPrice = Number.isFinite(parsedPrice) ? parsedPrice : 299;
    const serviceId = `ai-proj-${Date.now()}`;
    const finalImage = coverImage || 'https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

    // Use a transaction to atomically create Service + launch SKUs
    const result = await prisma.$transaction(async (tx) => {
      const service = await tx.service.create({
        data: {
          id: serviceId,
          title,
          description,
          price: finalPrice,
          type,
          tags: finalTags,
          status: 'active',
          sales: 0,
          views: 1024,
          userId: user.id,
          provider: user.username || 'NS AI Maker',
          image: finalImage
        }
      });

      // Auto-generate launch SKUs for AI-incubated products
      const earlyBirdPrice = Math.round(finalPrice * 0.7 * 100) / 100; // 30% off early bird

      const skus = await Promise.all([
        tx.serviceSku.create({
          data: {
            serviceId: service.id,
            name: '极客首发版（限量）',
            price: earlyBirdPrice,
            stock: 500,
            image: finalImage,
            sort: 0
          }
        }),
        tx.serviceSku.create({
          data: {
            serviceId: service.id,
            name: '标准版',
            price: finalPrice,
            stock: 9999,
            image: finalImage,
            sort: 1
          }
        })
      ]);

      return { service, skus };
    });

    console.log(`[NS-Matrix] Project "${result.service.title}" published with ${result.skus.length} launch SKUs.`);
    res.json({
      success: true,
      service: result.service,
      skus: result.skus,
      message: 'Your incubated project is now live on NS Market!'
    });
  } catch (error) {
    console.error('AI Publish Error:', error);
    res.status(500).json({ error: 'Failed to publish AI project' });
  }
});

module.exports = router;

