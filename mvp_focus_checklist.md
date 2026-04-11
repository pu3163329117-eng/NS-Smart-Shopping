# NS Matrix 聚焦版 MVP 清单

## 目标

本清单默认采用 **聚焦版 MVP** 策略，而不是“整站所有模块一起上线”。

聚焦版 MVP 的目标只有一条主链：

> 用户进入网站 -> 登录 -> 浏览商品 / 使用 AI Lab -> 下单支付 -> 查看订单 -> 完成一次评价或项目发布

也就是说，这一版不追求“所有模块都上线”，而追求：

- 主价值清晰
- 主链路能跑通
- 能拿去做真实用户验证
- 能支撑第一笔 GMV 和第一条可录制 Demo

---

## 一、MVP 范围

## 必须保留的公开模块

- 首页 `Home`
- 登录 `Login`
- 商城列表 `Market`
- 商品详情 `ProductDetail`
- 结账页 `Checkout`
- 钱包 `Wallet`
- 我的资料 / 我的订单 `Profile / MyOrders`
- AI Lab `AILab`
- 基础帮助页 `Help / Terms / Privacy`

## 可以保留但不作为对外主卖点的模块

- Maker 后台
- 地址管理
- 商品评价
- AI 发布到 Market

这些模块服务于闭环，但不需要在对外叙事中占太大比重。

## 暂时从公开 MVP 中移除或降级为 Beta 的模块

- 社区 `Social`
- 众筹 `Crowdfunding`
- Gushi 全套
- 投资者大屏 `InvestorDashboard`
- 后台审核 `AdminAudit`
- About 页如果不影响主叙事，可以保留；如果分散注意力，也可临时降级

原则：

- 路由可以保留
- 但不要继续作为首页级主入口或核心承诺功能

---

## 二、导航层处理

## 需要从公开导航中移除的入口

### 顶部导航

文件：

- `smart-ja-web/src/components/Navbar.vue`

建议移除或隐藏：

- `Social`
- `Crowdfunding`
- `AI Mentor`（如果它和 `AI Lab` 对普通用户是重复概念）
- `About` 视情况保留

建议保留：

- `Home`
- `Market`
- `AI Lab`

### 底部导航

文件：

- `smart-ja-web/src/components/BottomNav.vue`

建议改成：

- 首页
- 市场
- AI Lab
- 订单或钱包
- 我的

当前不建议保留：

- 社区
- 众筹

### 页脚入口

文件：

- `smart-ja-web/src/components/Footer.vue`

建议 Platform 区只保留：

- Market
- AI Lab
- Help / Terms / Privacy

不建议继续突出：

- Crowdfunding

---

## 三、当前阻塞 MVP 的关键问题

## P0 阻塞项：必须先修

### 1. Crowdfunding 页面存在前端调用错误

文件：

- `smart-ja-web/src/views/Crowdfunding.vue`
- `smart-ja-web/src/services/api.js`

问题：

- 页面在调用 `MarketService.get(...)`
- 页面在调用 `MarketService.post(...)`
- 但 `MarketService` 并没有定义通用 `get/post` 方法

这意味着：

- 众筹页不是“功能弱”
- 而是“运行时就可能直接报错”

处理建议：

- 短期：直接从公开 MVP 中隐藏 Crowdfunding
- 中期：单独新增 `CrowdfundingService`

### 2. Social 分页协议未对齐

文件：

- `smart-ja-web/src/store/social.js`
- `smart-ja-web/server/routes/social.js`

问题：

- 前端用 `cursor`
- 后端用 `page`

结果：

- 社区分页行为不稳定
- 社区无法作为 MVP 成熟模块对外展示

处理建议：

- 二选一统一协议
- 更快的方式：先统一成 `page + limit`

### 3. AI Lab 错误提示未收口

文件：

- `smart-ja-web/src/views/AILab.vue`
- `smart-ja-web/src/locales/zh.json`
- `smart-ja-web/src/locales/en.json`

问题：

- 页面使用了 `aiLab.errorMessage`
- 但语言包中没有这个 key

结果：

- 用户直接看到技术占位符
- 非常伤信任

处理建议：

- 补齐 `aiLab.errorMessage`
- 补齐 `aiLab.connectionFailed`
- 顺带检查 `aiLab` 下所有实际被调用的 key

### 4. AI Lab 配额展示不够可信

文件：

- `smart-ja-web/src/views/AILab.vue`

问题：

- quota 拉取失败时回退本地缓存
- 用户无法区分是真没额度还是系统异常

处理建议：

- 后端 quota 获取失败时显示“暂时无法确认额度”
- 不要默默回退成一个会误导用户的数字

### 5. 文档与当前主线不一致

文件：

- `README.md`

问题：

- 仍在描述旧的 `smart-ja-backend`
- 仍写旧端口和旧启动方式

结果：

- 新人、演示人员、协作者很容易按错环境启动

处理建议：

- 统一 README 到 `smart-ja-web + smart-ja-web/server + fullstack`

---

## 四、MVP 必须跑通的业务闭环

## 闭环 1：登录闭环

验收标准：

- 用户能请求验证码
- 用户能完成登录
- 登录后 token 和 user_info 正常写入本地
- 刷新后仍能保持登录状态

涉及文件：

- `smart-ja-web/src/store/auth.js`
- `smart-ja-web/src/views/Login.vue`
- `smart-ja-web/server/routes/auth.js`
- `smart-ja-web/server/controllers/authController.js`

## 闭环 2：交易闭环

验收标准：

- 用户能在 Market 看到真实商品
- 用户能进入商品详情
- 用户能选择地址
- 用户能完成一次下单
- 钱包余额正确扣减
- 订单能在个人页 / 订单页看到
- 可完成确认收货
- 可提交一条评价

涉及文件：

- `smart-ja-web/src/views/Market.vue`
- `smart-ja-web/src/views/ProductDetail.vue`
- `smart-ja-web/src/views/Checkout.vue`
- `smart-ja-web/src/views/Wallet.vue`
- `smart-ja-web/src/views/UserProfile.vue`
- `smart-ja-web/server/routes/market.js`
- `smart-ja-web/server/routes/orders.js`
- `smart-ja-web/server/routes/user.js`

## 闭环 3：AI Lab 闭环

验收标准：

- 用户能进入 AI Lab
- 能成功发送一次对话
- 能看到清晰、正常的人类可读报错
- 能完成一次项目发布到 Market
- 发布后的项目能在 Market / ProductDetail 中访问

涉及文件：

- `smart-ja-web/src/views/AILab.vue`
- `smart-ja-web/src/services/aiService.js`
- `smart-ja-web/server/routes/ai.js`
- `smart-ja-web/server/routes/zeroclaw.js`
- `smart-ja-web/server/routes/ailab.js`

---

## 五、上线前必须准备的内容

## 真实可展示商品

最低要求：

- 3 到 5 个商品
- 至少 1 个价格像真实商品，不要全是演示价
- 每个商品有：
  - 标题
  - 图片
  - 价格
  - 描述
  - 可下单状态

建议商品来源：

- 后端种子数据
- 现有 Market 服务表
- AI Lab 发布的项目

## 演示账号

至少准备：

- 1 个普通买家账号
- 1 个创客账号
- 1 个带余额的钱包账号

要求：

- 登录方式要简单
- 演示时不能依赖临场手工造数

## 演示环境

要求：

- 必须是一套“前后端一起启动”的方式
- 不允许继续出现“只开前端”造成误判

推荐：

- 使用 fullstack docker compose
- 或写一个统一启动说明文档

---

## 六、建议的实施顺序

## 第 1 阶段：先收缩范围

- 从 Navbar 移除 `Social` / `Crowdfunding`
- 从 BottomNav 移除 `Social` / `Crowdfunding`
- 页脚淡化 `Crowdfunding`
- 对外只保留：
  - Home
  - Market
  - AI Lab
  - Login / Profile / Wallet

目标：

- 先把“用户会走到的路径”变短
- 避免用户进入未成熟模块

## 第 2 阶段：修阻塞问题

- 修 Crowdfunding 前端错误调用
- 修 Social 分页协议
- 修 AI Lab i18n 报错
- 修 AI Lab 配额展示
- 修 README 和启动说明

目标：

- 先清掉明显的 runtime 错误和信任伤害点

## 第 3 阶段：跑通交易闭环

- 准备真实商品数据
- 准备真实地址和余额账号
- 实测下单
- 实测订单展示
- 实测确认收货
- 实测评价

目标：

- 拿到第一条完整交易链路

## 第 4 阶段：跑通 AI Lab 闭环

- 实测 quota
- 实测对话
- 实测发布到 Market
- 实测发布后商品详情可访问

目标：

- 让 AI Lab 成为真正能演示的核心功能

## 第 5 阶段：做一次彩排

- 用一个全新账号走完整流程
- 录屏
- 记录报错和卡点
- 对照本清单逐条验收

---

## 七、最终验收标准

只有满足下面 7 条，才建议对外说“我们的 MVP 跑通了”：

1. 用户能成功登录
2. 用户能看到真实商品列表
3. 用户能进入商品详情页
4. 用户能完成一次支付下单
5. 用户能在个人中心看到订单结果
6. 用户能在 AI Lab 完成一次有效对话
7. 用户能从 AI Lab 发布一个项目到 Market

---

## 八、最重要的一句话

这一版不要追求“整站都能讲故事”，而要追求：

> 至少有一条真正跑通、可验证、可演示、可成交的主链。

当前最合适的主链就是：

> `Home -> Login -> Market -> Product -> Checkout -> Order -> Review`

加上一条 AI 主链：

> `Home -> AI Lab -> Chat -> Publish to Market`
