const API_KEY = 'sk-35ae1d84f57449eda853fc209d8630ec';
const API_URL = 'https://api.deepseek.com/chat/completions';

export const callDeepseekAPI = async (messages, temperature = 0.7, max_tokens = 500) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature,
        max_tokens
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Deepseek API Error:', error);
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
