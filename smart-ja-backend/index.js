import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Gemini Setup
// 注意：用户需要在 .env 文件中设置 GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE');

// Database Configuration
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/smartja',
  // 设置较短的超时时间，以便快速降级
  connectionTimeoutMillis: 2000,
});

// 数据库连接状态
let isDbConnected = false;

// 尝试连接数据库
pool.connect().then(() => {
  isDbConnected = true;
  console.log('✅ Database connected successfully');
}).catch(err => {
  console.log('⚠️ Database connection failed. Switching to In-Memory Mode for Demo.');
  // console.error(err); // 隐藏详细错误，保持控制台整洁
});

// Routes
app.get('/', (req, res) => {
  res.send('Smart JA Backend is Running!');
});

// 获取所有产品
app.get('/api/products', async (req, res) => {
  // 路演演示数据 (Mock Data)
  const mockProducts = [
    {
      id: 1,
      name: 'EcoFuture Notebook',
      desc: '植入种子的笔记本，写完埋入土里，长出希望。',
      price: 29.9,
      company: '绿意未来',
      longDesc: 'EcoFuture 笔记本不仅仅是一个记录想法的地方，它是生命的载体。每一页纸张中都精心嵌入了各类花草种子。当你写满一本笔记，只需将它埋入土中，浇水施肥，几周后，你的文字将化作一片生机勃勃的花园。我们相信，创意的终点不应是废纸篓，而是新生命的起点。适合送给热爱环保、充满梦想的孩子。',
      img: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=2000'
    },
    {
      id: 2,
      name: 'TechKid Kit',
      desc: '专为 8 岁儿童设计的模块化编程套件。',
      price: 199.0,
      company: 'TechKid 智趣',
      longDesc: 'TechKid 编程套件专为 6-12 岁儿童量身定制，无需任何代码基础。通过磁吸式模块拼接，孩子们可以轻松搭建智能小车、机械臂甚至简单的气象站。配套的图形化编程 APP，让逻辑思维训练像搭积木一样简单有趣。这不仅是一个玩具，更是通往未来科技世界的金钥匙，培养孩子解决问题的核心能力。',
      img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2000'
    },
    {
      id: 3,
      name: 'ArtSpace Hoodie',
      desc: 'AI 辅助设计的限量版卫衣。',
      price: 89.0,
      company: '艺创空间',
      longDesc: 'ArtSpace 卫衣打破了传统设计的界限。每一件卫衣的图案都由我们的学生设计师与 AI 算法共同创作，融合了梵高的星空与赛博朋克的霓虹。采用 100% 有机棉，穿着舒适透气。穿上它，你就是行走的艺术品，展现独一无二的个性主张。支持定制，让 AI 将你的梦境绘制成衣。',
      img: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=2000'
    }
  ];

  try {
    if (isDbConnected) {
      // 如果数据库连接成功，尝试查询
      // const result = await pool.query('SELECT * FROM products');
      // res.json(result.rows);
      
      // 为了路演效果稳定，即使连接了数据库，我们也优先返回格式完美的 Mock 数据
      // 除非您已经手动往数据库里填好了完美的数据
      res.json(mockProducts);
    } else {
      // 降级模式：直接返回 Mock 数据
      console.log('Serving from In-Memory Mock Data');
      res.json(mockProducts);
    }
  } catch (err) {
    console.error(err);
    // 出错时也返回 Mock 数据，确保前端不挂
    res.json(mockProducts);
  }
});

// AI 智能导购接口
app.post('/api/ai/chat', async (req, res) => {
  const { message } = req.body;
  
  try {
    if (!process.env.GEMINI_API_KEY) {
      // 模拟模式（未配置 Key 时）
      return res.json({
        reply: `[演示模式] 收到你的需求："${message}"。我们推荐 TechKid 编程套件，它非常适合培养逻辑思维！`
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro"});
    
    const prompt = `你是一个针对青少年的创业公司产品导购员。
    目前我们有以下产品：
    1. EcoFuture Notebook (环保笔记本)
    2. TechKid Kit (编程套件)
    3. ArtSpace Hoodie (AI 设计卫衣)
    
    用户的需求是：${message}
    
    请用亲切、鼓励的语气推荐其中一个产品，并说明理由。限制在 100 字以内。`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    res.json({ reply: text });
    
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ error: 'AI service busy' });
  }
});

app.listen(port, () => {
  console.log(`Smart JA Server running on port ${port}`);
});
