-- Smart JA Database Schema

-- 1. 学生公司表
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    founder_name VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 产品表
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 订单表
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    customer_name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, shipped
    total_amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. AI 交互日志 (用于后期分析)
CREATE TABLE ai_logs (
    id SERIAL PRIMARY KEY,
    user_query TEXT,
    ai_response TEXT,
    sentiment_score FLOAT, -- 情感分析分数
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入初始化占位数据
INSERT INTO companies (name, founder_name, description) VALUES 
('绿意未来', '张小明', '致力于环保文具的创新。'),
('TechKid 智趣', '李华', '让每个孩子都能动手做编程。'),
('艺创空间', '王美丽', 'AI 与艺术的结合。');

INSERT INTO products (company_id, name, description, price, image_url, stock) VALUES
(1, 'EcoFuture Notebook', '植入种子的笔记本，写完埋入土里，长出希望。', 29.90, 'https://images.unsplash.com/photo-1544816155-12df9643f363', 100),
(2, 'TechKid Kit', '专为 8 岁儿童设计的模块化编程套件。', 199.00, 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b', 50),
(3, 'ArtSpace Hoodie', 'AI 辅助设计的限量版卫衣。', 89.00, 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2', 200);
