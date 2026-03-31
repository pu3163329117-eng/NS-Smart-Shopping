# 谷市 PRD v1.0

- 文档状态：Draft
- 日期：2026-03-18
- 适配项目：`smart-ja-web`
- 适配架构：Vue 3 + Vite + Vue Router + Pinia + Axios + Express + Prisma + PostgreSQL

---

## 1. 产品概述

“谷市”是谷子二次元平台中的一个新业务模块，定位为：

- 面向二次元谷子与周边的实时行情系统
- 面向个人卖家与买家的安全寄售交易市场
- 基于真实成交、有效挂单和标准化单品的价格发现工具

“谷市”第一阶段不做金融化产品，不做杠杆和纯纸面交易，核心是把以下四件事做扎实：

1. 标准化单品
2. 真实成交记录
3. 可理解的价格口径
4. 安全的交易履约

---

## 2. 为什么现在做

当前平台已经具备以下基础能力：

- 市场页与商品详情页
- 用户登录与身份体系
- 钱包与交易流水
- 下单、发货、确认收货流程
- 图片上传
- Prisma 数据层与 Express API 层

现有代码中可直接复用的模块包括：

- 前端市场页：`smart-ja-web/src/views/Market.vue`
- 前端钱包页：`smart-ja-web/src/views/Wallet.vue`
- 前端路由：`smart-ja-web/src/router/index.js`
- API 服务层：`smart-ja-web/src/services/api.js`
- 后端订单路由：`smart-ja-web/server/routes/orders.js`
- 后端用户路由：`smart-ja-web/server/routes/user.js`
- 后端市场路由：`smart-ja-web/server/routes/market.js`
- 数据模型：`smart-ja-web/server/prisma/schema.prisma`

这意味着“谷市”不是从零搭建，而是在现有交易平台上新增一个更强的“行情 + 寄售”业务域。

---

## 3. 当前架构基线与设计原则

### 3.1 当前前端架构

- 前端为 Vue 3 + Composition API
- 路由使用 Vue Router
- 服务请求统一走 `src/services/api.js`
- 已有市场、钱包、订单、创作者后台、审核后台页面
- 支持 ECharts，可用于行情图表

### 3.2 当前后端架构

- Node.js + Express
- Prisma + PostgreSQL
- JWT 鉴权
- Multer 上传
- Swagger 文档挂载

### 3.3 当前数据能力

已有模型包括：

- `User`
- `Service`
- `Order`
- `OrderItem`
- `ServiceSku`
- `UserTransaction`
- `Review`
- `Address`

### 3.4 设计原则

谷市设计必须遵守以下原则：

1. 不直接污染现有 `Service` 业务语义  
当前 `Service` 更偏向“创作者服务/商品”，包含 `productionMode`、`factoryData`、`fundingGoal` 等字段，不适合直接承担谷子标准品模型。

2. 复用现有用户、钱包、地址、上传、订单基础设施  
谷市不应新建一套完全平行的用户和支付体系。

3. 谷市订单与现有普通订单逻辑分流  
现有普通订单在下单时会直接给卖家记收入；谷市需要托管结算，因此不能完全沿用现有 `/api/orders` 的即时结算逻辑。

4. 前端采用独立模块接入  
谷市应新增独立路由和独立 API 模块，而不是把现有 `MarketService` 继续堆大。

---

## 4. 产品目标与非目标

### 4.1 产品目标

- 让用户每天打开平台就能看到谷子和周边的价格变化
- 让用户基于真实成交判断“值不值”
- 让个人卖家快速、安全地卖出闲置谷子
- 让平台沉淀出标准化行情数据资产

### 4.2 非目标

- 不做虚拟币、积分盘、合约盘
- 不做杠杆、做空、T+0 等金融玩法
- 不做复杂自动撮合引擎
- 不做无实物支撑的纯价格投机系统

---

## 5. 用户角色

### 5.1 买家

核心诉求：

- 看到当前真实价格
- 看到历史成交趋势
- 找到低价可靠货源
- 安全完成购买

### 5.2 卖家

核心诉求：

- 借行情辅助定价
- 快速发布挂单
- 安全收款
- 低纠纷率完成交易

### 5.3 平台运营

核心诉求：

- 审核挂单
- 识别异常价格
- 处理履约纠纷
- 维护标准商品池

---

## 6. 核心业务闭环

谷市 MVP 的最小完整闭环如下：

1. 平台建立标准商品池
2. 卖家在标准商品下发布寄售单
3. 买家浏览行情和在售单
4. 买家下单并付款
5. 平台冻结货款
6. 卖家发货并上传物流
7. 买家确认收货
8. 平台释放货款给卖家
9. 系统将该成交写入行情

这个闭环决定了谷市的核心业务不是“商品发布”，而是“标准品 + 挂单 + 托管成交 + 行情更新”。

---

## 7. 产品范围

## 7.1 P0 必做范围

### FR-1 谷市首页

页面目标：

- 提供“今天谷圈发生了什么”的高频入口

展示内容：

- 热门 IP 榜
- 热门单品榜
- 今日涨幅榜
- 今日跌幅榜
- 最新成交流
- 当前最低在售价榜
- 24h 成交量榜

交互要求：

- 支持按 IP、角色、品类筛选
- 支持搜索标准单品
- 支持从榜单进入详情页

验收标准：

- 用户能在 3 次点击内进入任意单品详情页
- 首页数据刷新延迟不超过 30 秒

### FR-2 标准单品详情页

页面目标：

- 让用户在单页内完成价格判断与交易决策

展示内容：

- 标准单品基础信息
- 最新价
- 参考价
- 今日涨跌幅
- 7 日价格曲线
- 历史成交记录
- 当前在售单
- 成色分布
- 官方参考信息

交互要求：

- 支持按成色筛选在售单
- 支持按价格排序
- 支持收藏单品

验收标准：

- 用户能看清“价格是怎么来的”
- 用户能直接从详情页进入下单

### FR-3 发布寄售单

页面目标：

- 让普通用户不需要“商家入驻”也能卖谷

卖家发布字段：

- 所属 IP
- 角色
- 品类
- 系列/版本
- 是否限定
- 是否拆封
- 是否带原包装
- 成色等级
- 瑕疵说明
- 实拍图
- 库存数量
- 一口价

业务规则：

- 卖家必须挂靠到标准单品下
- 不允许自由创建未审核标准单品直接开卖
- 平台可提供“申请新增标准单品”入口

验收标准：

- 卖家可以在 2 分钟内完成一条挂单
- 未审核挂单不进入公开市场

### FR-4 下单与托管交易

页面目标：

- 让谷市具备可信履约

交易流程：

1. 买家提交订单
2. 买家付款至平台托管
3. 卖家发货
4. 买家确认收货
5. 平台结算给卖家

业务规则：

- 谷市订单创建后，不立即结算给卖家
- 只有在买家确认收货后，卖家收入才进入钱包余额
- 取消单或纠纷单可触发退款

验收标准：

- 买家能看到订单状态
- 卖家能填写物流信息
- 买家能确认收货
- 成交完成后行情自动更新

### FR-5 我的谷柜

页面目标：

- 让用户有一个稳定的交易与持有中心

模块内容：

- 我的挂单
- 我的购买
- 我的出售
- 我的收藏
- 我的成交记录
- 我的钱包流水

设计原则：

- 不强制复用 `MakerDashboard`
- 入口放在个人中心体系中更合理

### FR-6 审核与运营后台

需要支持：

- 标准单品维护
- 挂单审核
- 异常价格提示
- 可疑商品下架
- 纠纷单管理

建议初期可复用现有审核页思路，再逐步拆分谷市专属后台。

## 7.2 P1 可做范围

- 求购单
- 卖家信用等级
- 平台验货标签
- 成交提醒订阅
- 单品关注数和热度趋势

## 7.3 P2 后续范围

- 组合榜单
- 社区讨论区
- 自动价格建议
- 更精细的行情 K 线与时间粒度

---

## 8. 关键业务规则

### 8.1 价格口径

谷市所有展示价格遵循以下定义：

- 最新价：最近一笔已确认收货订单价格
- 参考价：近 7 日已完成订单的成交中位数
- 今日涨跌幅：今日成交均价相对昨日成交均价的变动
- 地板价：当前最低有效在售价
- 24h 成交量：近 24 小时完成订单数
- 24h 成交额：近 24 小时完成订单总金额

### 8.2 有效成交定义

只有以下订单进入正式行情：

- `bizType = gushi`
- 订单状态为 `completed`
- 未退款

### 8.3 挂单有效性

有效挂单必须满足：

- 状态为 `active`
- 库存大于 0
- 已审核通过
- 未被卖家下架

### 8.4 实时定义

MVP 中的实时定义为：

- 订单完成后立即更新详情页指标
- 首页榜单通过轮询每 15 到 30 秒刷新
- 首版不强依赖 WebSocket

### 8.5 托管结算规则

资金流程必须和当前普通订单分开：

- 下单时：买家余额扣款，记录为托管冻结
- 发货时：订单状态变为 `shipped`
- 收货确认时：平台把托管金额释放给卖家
- 退款时：托管金额返还给买家

---

## 9. 标准化商品策略

谷市能否成立，核心在于标准化。

### 9.1 MVP 首批覆盖品类

建议只做 2 到 3 个高流通品类：

- 吧唧
- 立牌
- 手办

### 9.2 标准单品字段

每个标准单品至少包含：

- IP 名称
- 角色名
- 品类
- 系列名
- 款式名
- 版本
- 发售渠道
- 发售时间
- 官方参考图

### 9.3 成色标准

建议统一成色等级：

- `S`：近乎全新
- `A`：轻微使用痕迹
- `B`：有明显瑕疵
- `C`：瑕疵较重

并要求卖家补充：

- 是否拆封
- 是否带原包装
- 瑕疵描述
- 实拍图

---

## 10. 结合当前架构的实现方案

## 10.1 前端信息架构

建议新增以下路由：

- `/gushi`
- `/gushi/:productId`
- `/gushi/sell`
- `/gushi/my`
- `/gushi/orders/:id`

建议新增以下视图文件：

- `smart-ja-web/src/views/GushiHome.vue`
- `smart-ja-web/src/views/GushiDetail.vue`
- `smart-ja-web/src/views/GushiSell.vue`
- `smart-ja-web/src/views/GushiCabinet.vue`
- `smart-ja-web/src/views/GushiOrderDetail.vue`

建议新增以下 API 模块：

- 在 `smart-ja-web/src/services/api.js` 中新增 `GushiService`

建议新增以下状态模块：

- `smart-ja-web/src/store/gushi.js`

前端复用关系：

- 复用 `Market.vue` 的筛选、列表、滚动加载结构
- 复用 `Wallet.vue` 的资金展示逻辑
- 复用 `MyOrders.vue` 的订单列表展示思路
- 复用现有上传接口 `/api/upload`

## 10.2 后端模块划分

建议新增独立路由：

- `smart-ja-web/server/routes/gushi.js`

并在 `smart-ja-web/server/server.js` 中新增挂载：

- `app.use('/api/gushi', gushiRoutes)`

原因：

- 避免把谷市逻辑强塞进现有 `/api/market`
- 避免影响现有创作者服务型商品逻辑
- 便于后续独立扩展行情和托管结算规则

## 10.3 数据模型策略

### 保持不动

以下模型尽量复用：

- `User`
- `Address`
- `UserTransaction`

### 建议扩展

建议扩展 `Order`：

- 新增 `bizType`
- 新增 `gushiProductId`
- 新增 `gushiListingId`
- 新增 `settlementStatus`
- 新增 `settledAt`
- 新增 `refundStatus`

建议扩展 `OrderItem`：

- 增加谷市单品快照字段，或直接继续使用现有 `title/price/image/quantity`

### 建议新增

新增 `GushiProduct`

字段建议：

- `id`
- `ipName`
- `characterName`
- `category`
- `seriesName`
- `variantName`
- `releaseChannel`
- `releaseDate`
- `officialImage`
- `officialPrice`
- `status`
- `createdAt`
- `updatedAt`

新增 `GushiListing`

字段建议：

- `id`
- `sellerId`
- `gushiProductId`
- `conditionGrade`
- `isOpened`
- `hasOriginalPackage`
- `defectNotes`
- `images`
- `price`
- `quantity`
- `status`
- `auditStatus`
- `createdAt`
- `updatedAt`

新增 `GushiPriceSnapshot`

字段建议：

- `id`
- `gushiProductId`
- `latestPrice`
- `referencePrice7d`
- `floorPrice`
- `changePercentDaily`
- `volume24h`
- `turnover24h`
- `capturedAt`

新增 `GushiFavorite`

字段建议：

- `id`
- `userId`
- `gushiProductId`
- `createdAt`

### 不建议的方案

不建议直接把谷市标准单品塞进 `Service` 表。

原因：

- 现有 `Service` 语义偏创作者商品/服务
- 字段不够贴合标准化谷子单品
- 会把创作者业务和谷市业务强耦合

## 10.4 订单与钱包策略

当前 `smart-ja-web/server/routes/orders.js` 的逻辑是：

- 买家下单后立即扣款
- 卖家立即记收入

这个逻辑不适合谷市。

因此谷市应新增独立订单逻辑：

- `POST /api/gushi/orders`
- `POST /api/gushi/orders/:id/ship`
- `POST /api/gushi/orders/:id/confirm`
- `POST /api/gushi/orders/:id/cancel`

资金与流水仍复用 `UserTransaction`，但需要新增交易类型：

- `gushi_hold`
- `gushi_release`
- `gushi_income`
- `gushi_refund`

---

## 11. API 草案

## 11.1 行情与商品

- `GET /api/gushi/home`
- `GET /api/gushi/products`
- `GET /api/gushi/products/:id`
- `GET /api/gushi/products/:id/trades`
- `GET /api/gushi/products/:id/listings`

## 11.2 挂单与收藏

- `POST /api/gushi/listings`
- `PATCH /api/gushi/listings/:id`
- `POST /api/gushi/listings/:id/offline`
- `POST /api/gushi/favorites/:productId`
- `DELETE /api/gushi/favorites/:productId`

## 11.3 订单与履约

- `POST /api/gushi/orders`
- `GET /api/gushi/orders/:id`
- `POST /api/gushi/orders/:id/ship`
- `POST /api/gushi/orders/:id/confirm`
- `POST /api/gushi/orders/:id/cancel`

## 11.4 我的谷柜

- `GET /api/gushi/me/listings`
- `GET /api/gushi/me/orders`
- `GET /api/gushi/me/favorites`
- `GET /api/gushi/me/transactions`

## 11.5 运营后台

- `GET /api/gushi/admin/products`
- `POST /api/gushi/admin/products`
- `PATCH /api/gushi/admin/products/:id`
- `GET /api/gushi/admin/listings/pending`
- `POST /api/gushi/admin/listings/:id/approve`
- `POST /api/gushi/admin/listings/:id/reject`

---

## 12. 前后端改造清单

### 12.1 前端改造

必须修改：

- `smart-ja-web/src/router/index.js`
- `smart-ja-web/src/services/api.js`

建议新增：

- `smart-ja-web/src/views/GushiHome.vue`
- `smart-ja-web/src/views/GushiDetail.vue`
- `smart-ja-web/src/views/GushiSell.vue`
- `smart-ja-web/src/views/GushiCabinet.vue`
- `smart-ja-web/src/views/GushiOrderDetail.vue`
- `smart-ja-web/src/store/gushi.js`

### 12.2 后端改造

必须修改：

- `smart-ja-web/server/server.js`
- `smart-ja-web/server/prisma/schema.prisma`

建议新增：

- `smart-ja-web/server/routes/gushi.js`
- `smart-ja-web/server/utils/gushiPrice.js`
- `smart-ja-web/server/utils/gushiMappers.js`

### 12.3 后台与运营

建议先低成本接入：

- 在现有 `AdminAudit` 入口下增加谷市审核 tab

后续再独立：

- 谷市专属运营后台

---

## 13. 数据指标

上线后重点关注：

- 谷市首页 DAU
- 单品详情页 UV
- 每日新增有效挂单数
- 每日完成成交单数
- 挂单 7 日成交率
- 成交转化率
- 收藏率
- 复购率
- 纠纷率

---

## 14. 里程碑建议

### M1：标准化与行情展示

目标：

- 跑通标准单品池
- 跑通首页榜单
- 跑通详情页行情展示

### M2：寄售与托管订单

目标：

- 跑通挂单
- 跑通下单
- 跑通发货与确认收货
- 跑通托管释放

### M3：运营与风控

目标：

- 跑通审核后台
- 跑通异常价格识别
- 跑通基础纠纷处理

---

## 15. 风险与应对

### 15.1 合规风险

风险：

- 产品表达过度金融化，容易被误解

应对：

- 对外统一使用“行情”“参考价”“寄售交易”表达
- 不强调“投资收益”

### 15.2 低样本价格失真

风险：

- 刚上线阶段成交量低，价格会不稳定

应对：

- 展示样本量
- 低样本时弱化涨跌幅权重
- 同时展示地板价和参考价

### 15.3 假货与纠纷

风险：

- 谷市强依赖成色、真假、版本

应对：

- 实拍强制
- 成色标准化
- 审核与举报机制
- 托管结算

---

## 16. 最终建议

结合你当前已有架构，谷市最合理的落地路径不是“改造现有 Market 让它承载一切”，而是：

1. 前端新增独立 `Gushi` 业务入口
2. 后端新增独立 `/api/gushi` 路由域
3. 数据层新增 `GushiProduct`、`GushiListing`、`GushiPriceSnapshot`
4. 用户、钱包、地址、上传、鉴权继续复用现有基础设施
5. 订单采用统一 `Order` 基础表，但谷市订单走独立托管逻辑

这样做的好处是：

- 不会破坏你现有市场和创作者业务
- 可以快速复用当前已上线能力
- 后续也方便把谷市单独做成平台一级业务模块
