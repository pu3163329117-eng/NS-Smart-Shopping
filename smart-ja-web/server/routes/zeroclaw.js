const express = require('express');
const router = express.Router();
const axios = require('axios');
const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/auth');
const { search } = require('duck-duck-scrape');
const rateLimit = require('express-rate-limit');

const { RedisStore } = require('rate-limit-redis');
const { redisClient } = require('../utils/redis');

const aiDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 100,
  message: { error: 'Rate Limit Exceeded', message: "每日接口调用已达上限，请明天再试" },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: 'ai_daily:',
  })
});

const aiBurstLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 3,
  message: { error: 'Too Many Requests', message: "计算太密集了，请稍等30秒！" }
});

// Multi-Agent Node.js Orchestration Engine
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY;
// Allow connecting from Docker container to host via host.docker.internal, or via ENV override
const API_URL = process.env.ZEROCLAW_API_URL || 'http://host.docker.internal:8080/webhook';

const loadAgentMind = (agentName) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const yaml = require('js-yaml');
        const filePath = path.join(__dirname, '..', 'agents', `${agentName}.yaml`);
        if (fs.existsSync(filePath)) {
            const doc = yaml.load(fs.readFileSync(filePath, 'utf8'));
            return doc.system_prompt || doc.prompt || '';
        }
    } catch (e) {
        console.error(`Failed to load mind for ${agentName}:`, e);
    }
    return '';
};

router.post('/draw', aiBurstLimiter, aiDailyLimiter, authenticateToken, async (req, res) => {
    try {
        const { prompt } = req.body;
        console.log('ZeroClaw Image Gen Request:', prompt);
        
        // Use keyless pollinations.ai for demo stability
        const encodedPrompt = encodeURIComponent(prompt + " masterpiece, high quality, highly detailed");
        const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;
        
        // We can just return the URL, the browser will fetch the image
        res.json({ url: url });
        
    } catch (error) {
        console.error('ZeroClaw Image Engine Error:', error.message);
        res.status(500).json({ error: 'Image service unavailable' });
    }
});

router.post('/agent', aiBurstLimiter, aiDailyLimiter, authenticateToken, async (req, res) => {
    console.log('ZeroClaw Engine (Node Native) activated!');

    const { messages, agentId, temperature = 0.7, max_tokens = 4000, stream = true } = req.body;
    const userId = req.user.id;

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

        if (isTestAccount || usage.freeUsedToday < FREE_QUOTA_PER_WEEK) {
            isFree = true;
        } else {
            isFree = false;
            if (Number(user.walletBalance || 0) < COST_PER_MSG) {
                return res.status(402).json({
                    error: 'Insufficient Balance',
                    message: '您的本周免费 AI 额度已用完，继续使用需扣除钱包余额（0.1元/次），请先充值。'
                });
            }
        }
    } catch (error) {
        console.error('Failed to check AI usage:', error);
        return res.status(500).json({ error: 'Failed to verify AI quotas' });
    }

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
                    await tx.user.update({ where: { id: userId }, data: { walletBalance: newBalance } });
                    await tx.userTransaction.create({
                        data: {
                            userId, type: 'payment', title: 'AI 实验室调用扣费',
                            amount: -COST_PER_MSG, balanceAfter: newBalance,
                            channel: 'wallet', status: 'completed', counterparty: 'NS Matrix'
                        }
                    });
                    await tx.aiUsage.update({ where: { userId }, data: { paidUsedTotal: { increment: 1 } } });
                });
            }
        } catch (e) {
            console.error("CRITICAL: Failed to charge user for AI Usage:", e);
        }
    };

    try {
        let targetAgent = agentId ? agentId.replace('ns-', '') : 'sales';
        let routingLog = '';

        // --- Coordinator Logic ---
        // If it's a general request to the assistant, the Coordinator decides
        if (targetAgent === 'sales' || !agentId) {
            const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user')?.content || '';
            const techKeywords = ['画图', '图纸', '设计', '开发', '创客', '产品想法', '3d', '建模', '材料'];

            if (techKeywords.some(k => lastUserMessage.toLowerCase().includes(k))) {
                targetAgent = 'planner';
                routingLog = 'Coordinator Decision: Routing to Planner/Designer for Maker Request.';
            } else {
                routingLog = 'Coordinator Decision: Routing to Sales (General Inquiry/Shopping).';
            }
        }
        console.log(routingLog);

        let systemPrompt = '';
        let agentNames = {
            'planner': '高级创客规划师',
            'designer': '高级工业设计师',
            'coordinator': '项目孵化总管',
            'sales': 'NS AI导购',
            'mentor': '首席AI导师',
            'product_lead': 'AI产品研发总监',
            'design_lead': 'AI主设计师'
        };
        let baseMind = loadAgentMind(targetAgent) || `你是${agentNames[targetAgent] || '智能创客助手'}。`;
        
        if (targetAgent === 'sales') {
            systemPrompt = `【系统动态上下文】你是 NS AI 导购。你现在运行在 ZeroClaw 多智能体框架下。如果用户想买东西，你就查知识库（前端传的目录）推荐；如果用户想自己【创造/设计】东西，请温柔地告诉他：“我帮你接通了后台的创客 Planner 智能体，他马上来协助你画图并梳理商业计划。”`;

            // Inject Real-time Store Database
            try {
                const services = await prisma.service.findMany({
                    take: 12,
                    orderBy: [{ sales: 'desc' }, { views: 'desc' }, { createdAt: 'desc' }],
                    include: { user: { select: { username: true, sign: true, reputation: true } } }
                });

                const formattedServices = services.map(s => ({
                    id: s.id,
                    "商品名称": s.title,
                    "价格(元)": s.price,
                    "核心卖点": s.description,
                    "销/阅": `${s.sales}/${s.views}`,
                    "创客": s.provider || s.user?.username || 'NS Studio'
                }));

                systemPrompt += `\n\n【商城商品速查表】\n\`\`\`json\n${JSON.stringify(formattedServices, null, 2)}\n\`\`\``;
            } catch (err) {
                console.error("Failed to inject DB context:", err);
            }
        } else {
            systemPrompt = `【ZeroClaw 动态网关通信】前置智能体已将通讯链路转移给你。\n\n`;
        }

        // Adjust messages to inject the dynamic target agent mind
        const lastUserMsgText = messages.slice().reverse().find(m => m.role === 'user')?.content || '';
        
        let searchContext = '';
        const searchKeywords = ['联网', '实时', '最新', '搜索', '新闻', '查一下', '怎么样了', '2024', '现在的', '怎么看'];
        if (searchKeywords.some(w => lastUserMsgText.includes(w))) {
            try {
                console.log('ZeroClaw Internet Skill Triggered for query:', lastUserMsgText);
                routingLog += ' (Internet Skill Activated)';
                const searchRes = await search(lastUserMsgText, { safeSearch: 'off' });
                if (searchRes && searchRes.results && searchRes.results.length > 0) {
                    searchContext = '\n\n【ZeroClaw 实时联网模块检索结果】\n以下是系统在用户发言后实时检索到的网际网络最新资讯，请务必作为你的先验知识回答问题：\n';
                    searchRes.results.slice(0, 3).forEach((r, i) => {
                        searchContext += `\n[${i+1}] 标题：${r.title}\n摘要：${r.description}`;
                    });
                }
            } catch (err) {
                console.error('ZeroClaw Internet Skill Failed:', err.message);
            }
        }

        const currentDateTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        const timeContext = `\n【重要系统全局参数：时间校准】当前系统的绝对真实时间是：${currentDateTime}。不论你的内置训练数据是什么年份，请必须以此时刻作为基准时间（"今天"、"现在"）进行所有计算和表达。`;

        // We MUST write this to ZeroClaw's actual workspace IDENTITY.md so it treats it as a SYSTEM prompt,
        // rather than passing it in the User Webhook message where it gets ignored as a "user jailbreak attempt".
        try {
            const fs = require('fs');
            const os = require('os');
            const path = require('path');
            const identityPath = path.join(os.homedir(), '.zeroclaw', 'workspace', 'IDENTITY.md');
            const identityContent = `# 智能体角色定义\n你的当前人设是：${agentNames[targetAgent] || '智能总管'}\n${baseMind}\n${timeContext}\n${searchContext}\n【极其重要的底层渲染指令】\n1. DRAW 指令：如果用户在对话中提到想要看产品概念图、设计草图等，请在段落末尾强制输出特殊标记 \`[DRAW: 这里用纯英文写下你的画面prompt描述，必须细致]\`。\n2. 商业画布指令：如果你的人设是导师或需要梳理商业逻辑，并在点子成熟或被要求梳理时，必须使用 \`[CANVAS_JSON: {...}]\` 格式输出商业画布JSON（内部只能包含正确的JSON字符串，不要有多余换行和格式错误）。注意格式，绝对不要回复链接或包含额外的markdown代码块（如\`\`\`json），必须原样输出内部指令标记符！`;
            fs.writeFileSync(identityPath, identityContent, 'utf8');
        } catch (e) {
            console.error("Failed to write IDENTITY.md to ZeroClaw workspace:", e);
        }

        // Now just pass the pure, clean user query to the webhook
        const latestUserMessage = messages.slice().reverse().find(m => m.role === 'user')?.content || '';
        const payloadToZeroClaw = latestUserMessage;

        if (stream) {
            // Because ZeroClaw /webhook is synchronous, we wait for it, then chunk it out as SSE
            const response = await axios.post(API_URL, {
                message: payloadToZeroClaw
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 120000
            });

            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();

            if (routingLog) {
                res.write(`data: ${JSON.stringify({ content: `[${routingLog}]\n\n` })}\n\n`);
            }

            const replyText = response.data.response || "Agent computation finished but no string output was produced.";
            // Fix: the dot in regex does NOT match newlines. Use [\s\S] to match any character, including newlines.
            const chunks = replyText.match(/[\s\S]{1,3}/g) || [replyText];

            let chunkIdx = 0;
            const timer = setInterval(() => {
                if (chunkIdx >= chunks.length) {
                    clearInterval(timer);
                    res.write('data: [DONE]\n\n');
                    chargeUserForAi();
                    res.end();
                    return;
                }
                res.write(`data: ${JSON.stringify({ content: chunks[chunkIdx] })}\n\n`);
                chunkIdx++;
            }, 50);

        } else {
            const response = await axios.post(API_URL, {
                message: payloadToZeroClaw
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 120000
            });

            await chargeUserForAi();
            return res.json({ content: response.data.response });
        }
    } catch (error) {
        console.error('ZeroClaw Engine Error:', error?.response?.data || error.message);
        if (!res.headersSent) {
            return res.status(503).json({ error: 'AI Service Unavailable', details: error.message });
        } else {
            res.write(`data: ${JSON.stringify({ error: 'AI Connection failed' })}\n\n`);
            res.end();
        }
    }
});

module.exports = router;
