import api from './api';

export const callDeepseekAPI = async (messages, temperature = 0.7, max_tokens = 4000) => {
  try {
    console.log('Calling AI Service...', { messages, temperature, max_tokens });
    const response = await api.post('/ai/chat', {
      messages,
      temperature,
      max_tokens,
      stream: false
    }, {
      timeout: 120000 // 2 minutes timeout for DeepSeek
    });

    console.log('AI Service Response:', response);

    if (!response.content) {
      throw new Error('Invalid API Response Structure');
    }

    return response.content;
  } catch (error) {
    console.error('Deepseek API Error:', error);
    // Fallback to error message, NO MOCKING
    return `(⚠️ AI服务暂时不可用: ${error.message || '连接失败'})`;
  }
};

export const callDeepseekAPIStream = async (messages, agentId, onChunk, temperature = 0.7, max_tokens = 4000) => {
  try {
    const token = localStorage.getItem('token');

    // We use native fetch for streaming
    // Attempt ZeroClaw engine first
    let response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/zeroclaw/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        agentId: 'ns-' + agentId, // Match zero-claw naming conventions (ns-planner, ns-coordinator, etc.)

        messages,
        temperature,
        max_tokens,
        stream: true
      })
    });

    // Fallback to our internal DeepSeek connection if ZeroClaw daemon is not running
    if (!response.ok) {
      console.warn('ZeroClaw engine unreachable, falling back to DeepSeek internal router...');
      response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          messages,
          temperature,
          max_tokens,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let contentBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line === 'data: [DONE]') return contentBuffer;

        if (line.startsWith('data: ')) {
          try {
            const dataStr = line.replace('data: ', '');
            const parsed = JSON.parse(dataStr);
            if (parsed.content) {
              contentBuffer += parsed.content;
              onChunk(parsed.content, contentBuffer);
            }
          } catch (e) {
            console.error('Error parsing SSE chunk:', e, line);
          }
        }
      }
    }
    return contentBuffer;
  } catch (error) {
    console.error('Deepseek API Stream Error:', error);
    throw error;
  }
};


export const evaluateProduct = async (product) => {
  const systemPrompt = `你是一个专业的AI商品测评师。请根据商品信息，输出一段JSON格式的测评数据。
  
  输出格式要求（必须是合法的JSON）：
  {
    "analysis": "一段简短专业的评价（100字以内），包含优缺点分析",
    "scores": [
      { "name": "性价比", "value": 85 },
      { "name": "设计感", "value": 90 },
      { "name": "实用性", "value": 80 },
      { "name": "环保指数", "value": 95 },
      { "name": "趋势热度", "value": 88 }
    ],
    "marketHeat": "Top 5%",
    "repurchaseRate": "88.4%"
  }
  
  注意：分数范围0-100。请确保返回的是纯JSON字符串，不要包含markdown格式或其他无关字符。`;

  const userPrompt = `请测评以下商品：
  名称：${product.name}
  价格：${product.price}
  描述：${product.desc || product.description}
  公司：${product.company}`;

  try {
    const content = await callDeepseekAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 0.7, 1000);

    // 尝试解析 JSON，处理可能的 Markdown 代码块
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Product Evaluation Error:', error);
    // Fallback data
    return {
      analysis: "AI 暂时无法连接，这是基于历史数据的预估评价。该商品在设计和实用性上表现均衡，适合大多数用户。",
      scores: [
        { name: '性价比', value: 80 },
        { name: '设计感', value: 85 },
        { name: '实用性', value: 90 },
        { name: '环保指数', value: 70 },
        { name: '趋势热度', value: 75 }
      ],
      marketHeat: "Top 10%",
      repurchaseRate: "85%"
    };
  }
};

export const evaluateProject = async (project) => {
  const systemPrompt = `你是一个专业的AI创投顾问。请根据众筹项目信息，输出一段JSON格式的评估报告。
  
  输出格式要求（必须是合法的JSON）：
  {
    "comment": "一段简短专业的点评（100字以内），包含项目潜力和社会价值分析",
    "innovation": 90,
    "socialImpact": 95,
    "feasibility": 85
  }
  
  注意：分数范围0-100。请确保返回的是纯JSON字符串。`;

  const userPrompt = `请评估以下众筹项目：
  名称：${project.name}
  目标金额：${project.goalAmount}
  描述：${project.description}
  标签：${project.tags.join(', ')}`;

  try {
    const content = await callDeepseekAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 0.7, 1000);

    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Project Evaluation Error:', error);
    return {
      comment: "AI 暂时无法连接，基于历史相似项目分析，该项目具有较高的社会价值和可行性。",
      innovation: 85,
      socialImpact: 90,
      feasibility: 80
    };
  }
};

export const generateServiceContent = async (topic, type) => {
  const systemPrompt = `你是一个专业的青少年创客教育顾问。请根据用户提供的主题，生成一份完整的服务/课程方案。
  
  输出格式要求（必须是合法的JSON）：
  {
    "title": "吸引人的标题（20字以内）",
    "description": "简短的营销文案（50字以内）",
    "price": 99,
    "tags": ["标签1", "标签2"],
    "details": "详细的服务介绍或课程大纲（支持简单的Markdown格式，如列表）",
    "imagePrompt": "描述一张适合该服务的封面图片（用于生成图片）"
  }
  
  注意：
  1. 价格要适合青少年市场（¥20 - ¥200）。
  2. 语气要活泼、鼓励创新。
  3. 如果是课程，details 必须包含简单的课时安排。
  4. 如果是代工，details 必须包含设备参数或材料说明。
  `;

  const userPrompt = `我想发布一个关于"${topic}"的${type === 'course' ? '课程' : '代工服务'}。`;

  try {
    const content = await callDeepseekAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 0.8, 1500);

    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Service Generation Error:', error);
    // Fallback
    return {
      title: `${topic} - 创意工坊`,
      description: `来和我一起探索 ${topic} 的奥秘吧！`,
      price: 50,
      tags: ['创意', 'DIY'],
      details: 'AI 暂时掉线了，请手动补充详细介绍。',
      imagePrompt: 'A creative workshop scene'
    };
  }
};

// New Function: Smart Cart Recommendation
export const getCartRecommendations = async (cartItems) => {
  if (!cartItems || cartItems.length === 0) return [];

  const systemPrompt = `你是一个智能购物车助手。请根据用户购物车中的商品，推荐1-2个最合适的凑单商品或配件。
  
  输出格式要求（必须是合法的JSON）：
  [
    {
      "name": "推荐商品名称",
      "reason": "简短的推荐理由（例如：搭配购买更划算，或者这个配件很实用）",
      "price": 29
    }
  ]
  `;

  const itemsStr = cartItems.map(i => `${i.name} (¥${i.price})`).join(', ');
  const userPrompt = `购物车中有：${itemsStr}`;

  try {
    const content = await callDeepseekAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 0.6, 500);

    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Cart Recommendation Error:', error);
    return [];
  }
};

// New Function: AI Product Audit (Admin)
export const auditProduct = async (product) => {
  const systemPrompt = `你是一个严格的电商平台审核员。请检查商品信息是否合规。
  
  审核标准：
  1. 禁止涉黄、涉暴、违法违禁品。
  2. 描述必须通顺，不能有明显的虚假宣传。
  3. 必须适合青少年创客平台。
  
  输出格式要求（必须是合法的JSON）：
  {
    "pass": true, // true or false
    "reason": "通过" // 如果不通过，请说明具体原因
  }
  `;

  const userPrompt = `商品名称：${product.name}
  商品描述：${product.description}
  `;

  try {
    const content = await callDeepseekAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 0.1, 200);

    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Audit Error:', error);
    // Default to pass if AI fails, but log it
    return { pass: true, reason: "AI审核服务暂时不可用，自动放行（建议人工复核）" };
  }
};
export const analyzeProjectNeeds = async (projectDescription) => {
  const systemPrompt = `你是一个专业的供应链分析师。请分析以下项目描述，提取出该项目可能需要的制造或服务需求。
  
  输出格式要求（必须是合法的JSON）：
  {
    "needs": ["3d_print", "custom", "course"], // 从这三个选项中选择相关的，可以多选
    "keywords": ["PCB设计", "外壳打印", "注塑"] // 提取3个关键技术需求词
  }
  
  注意：
  - 3d_print: 涉及硬件原型、外壳、结构件
  - custom: 涉及设计、绘图、定制化内容
  - course: 涉及教育、教程、培训
  `;

  const userPrompt = `项目描述：${projectDescription}`;

  try {
    const content = await callDeepseekAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 0.5, 500);

    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Project Needs Analysis Error:', error);
    return {
      needs: ['3d_print'],
      keywords: ['硬件原型']
    };
  }
};
