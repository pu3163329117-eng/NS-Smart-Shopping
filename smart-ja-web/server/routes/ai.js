const express = require('express');
const router = express.Router();
const axios = require('axios');

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

// Chat Endpoint
router.post('/chat', async (req, res) => {
  console.log('Received chat request (streaming enabled/disabled flag)');

  const { messages, temperature = 1.0, max_tokens = 4000, stream = false } = req.body;

  if (!API_KEY) {
    console.error('Deepseek API Key missing.');
    return res.status(500).json({ error: 'API Configuration Error: Deepseek API Key is missing.' });
  }

  if (stream) {
    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Establish connection with client

    try {
      const response = await axios({
        method: 'post',
        url: API_URL,
        data: {
          model: 'deepseek-chat',
          messages,
          temperature,
          max_tokens,
          stream: true // Enable streaming from DeepSeek
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        responseType: 'stream', // Important for handling stream in Axios
        timeout: 120000
      });

      response.data.on('data', chunk => {
        const chunkStr = chunk.toString('utf8');
        const lines = chunkStr.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line === 'data: [DONE]') {
            res.write('data: [DONE]\n\n');
            return res.end();
          }

          if (line.startsWith('data: ')) {
            try {
              const dataStr = line.replace('data: ', '');
              const parsed = JSON.parse(dataStr);
              if (parsed.choices && parsed.choices.length > 0 && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                const contentDesc = parsed.choices[0].delta.content;
                res.write(`data: ${JSON.stringify({ content: contentDesc })}\n\n`);
              }
            } catch (e) {
              console.error('Error parsing stream chunk:', e.message, line);
            }
          }
        }
      });

      response.data.on('end', () => {
        res.end();
      });

      response.data.on('error', err => {
        console.error('DeepSeek Stream Error:', err);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      });

    } catch (error) {
      console.error('Deepseek API Request Error Details:', error.response?.data || error.message);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'AI Service Unavailable',
          details: error.response?.data?.error?.message || error.message
        });
      } else {
        res.write(`data: ${JSON.stringify({ error: 'AI Service Error' })}\n\n`);
        res.end();
      }
    }
  } else {
    // Non-streaming response for other tasks
    try {
      const response = await axios.post(API_URL, {
        model: 'deepseek-chat',
        messages,
        temperature,
        max_tokens,
        stream: false
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        timeout: 120000
      });

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('Invalid API Response Structure');
      }

      const content = response.data.choices[0].message.content;
      res.json({ content });
    } catch (error) {
      console.error('Deepseek non-stream API Error:', error.response?.data || error.message);
      res.status(500).json({
        error: 'AI Service Unavailable',
        details: error.response?.data?.error?.message || error.message
      });
    }
  }
});

module.exports = router;
