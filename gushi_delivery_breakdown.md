# 谷市交付拆分总览

- 文档状态：Working Draft
- 日期：2026-03-18
- 关联文档：`gushi_market_prd.md`

## 1. 目标

把《谷市 PRD》拆成可以直接排期和分工的交付包，确保当前项目可以在不破坏既有市场、钱包、订单能力的前提下，新增一套独立的“谷市”业务域。

本次拆分聚焦 4 个交付包：

1. 数据模型与迁移
2. 后端 API 与托管交易逻辑
3. 前端页面与状态管理
4. 运营后台与 Antigravity 交接

## 2. 当前架构约束

- 前端主应用位于 `smart-ja-web/src`
- 后端主应用位于 `smart-ja-web/server`
- 现有市场商品依赖 `Service`
- 现有普通订单依赖 `Order` + `OrderItem`
- 现有钱包依赖 `User.walletBalance` + `UserTransaction`
- 现有 `/api/orders` 是即时结算，不适合谷市托管结算
- 当前代码没有真正落地的 `role/admin` 权限体系，后台接口需要临时白名单方案

## 3. 交付包拆分

## A. 数据层交付包

目标：

- 建立谷市标准单品、挂单、价格快照、收藏数据模型
- 扩展现有订单模型以承载谷市托管逻辑

输出物：

- `gushi_schema_design.md`
- Prisma schema 变更清单
- 数据迁移顺序

核心任务：

1. 新增 `GushiProduct`
2. 新增 `GushiListing`
3. 新增 `GushiPriceSnapshot`
4. 新增 `GushiFavorite`
5. 扩展 `Order`
6. 可选扩展 `OrderItem`
7. 设计必要索引

依赖：

- 无前置依赖，可先行

## B. 后端 API 交付包

目标：

- 新增独立 `/api/gushi` 业务域
- 跑通行情、挂单、托管下单、发货、收货、收藏、后台审核

输出物：

- `gushi_api_design.md`
- `server/routes/gushi.js`
- `server/utils/gushiMappers.js`
- `server/utils/gushiPrice.js`

核心任务：

1. 首页行情接口
2. 单品列表与详情接口
3. 历史成交与在售单接口
4. 发布挂单接口
5. 谷市托管订单接口
6. 我的谷柜接口
7. 后台审核接口

依赖：

- 依赖数据模型落地

## C. 前端交付包

目标：

- 提供独立的谷市入口、行情页、详情页、卖货页、个人谷柜

输出物：

- `gushi_frontend_breakdown.md`
- 新增 `GushiService`
- 新增 `gushi` store
- 新增谷市路由与页面

核心任务：

1. `/gushi` 首页
2. `/gushi/:productId` 单品详情页
3. `/gushi/sell` 发布挂单页
4. `/gushi/my` 我的谷柜
5. `/gushi/orders/:id` 谷市订单详情页

依赖：

- 最低依赖首页和详情接口
- 发布挂单和订单页依赖后端交易接口

## D. 运营与交接包

目标：

- 让 Antigravity 能快速理解谷市项目边界、工作顺序与注意事项

输出物：

- `smart-ja-web/HANDOVER_ANTIGRAVITY_GUSHI.md`

核心任务：

1. 说明谷市业务定位
2. 说明为何不能复用现有 `/api/orders`
3. 说明实施顺序与责任分工建议
4. 说明验收口径与风险点

## 4. 推荐实施顺序

### Sprint 1

- 完成 Prisma 数据模型
- 完成 `/api/gushi/home`
- 完成 `/api/gushi/products`
- 完成 `/api/gushi/products/:id`
- 完成谷市首页和详情页静态接入

### Sprint 2

- 完成挂单接口
- 完成我的挂单与我的收藏
- 完成发布页与谷柜页

### Sprint 3

- 完成托管下单
- 完成发货与确认收货
- 完成价格更新逻辑
- 完成订单详情页

### Sprint 4

- 完成后台审核
- 完成基础异常价格告警
- 完成灰度测试与修正

## 5. 推荐分工

### Backend

- Prisma schema
- `/api/gushi` 路由
- 价格聚合工具
- 托管结算逻辑

### Frontend

- 谷市页面
- 谷市服务层
- 谷市 store
- 图表与榜单渲染

### QA / Review

- 订单状态流转检查
- 钱包流水核对
- 异常价格与低库存场景测试

## 6. Definition of Done

达到以下条件，谷市 MVP 才算真正完成：

1. 存在标准单品池
2. 卖家可在标准单品下发挂单
3. 买家可查看真实行情并下单
4. 订单采用托管逻辑
5. 收货确认后才给卖家结算
6. 完成订单会更新行情
7. 用户能在“我的谷柜”查看挂单、订单、收藏
8. 运营可审核挂单并处理下架

## 7. 建议下一步

最顺的推进方式是：

1. 先按 `gushi_schema_design.md` 改 Prisma
2. 再按 `gushi_api_design.md` 落后端
3. 最后按 `gushi_frontend_breakdown.md` 接前端页面

Antigravity 接手时，优先阅读：

1. `gushi_market_prd.md`
2. `gushi_delivery_breakdown.md`
3. `gushi_schema_design.md`
4. `gushi_api_design.md`
5. `gushi_frontend_breakdown.md`
