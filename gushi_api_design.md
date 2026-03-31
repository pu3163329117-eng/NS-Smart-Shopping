# 谷市 API 设计与落地拆分

- 文档状态：Working Draft
- 日期：2026-03-18
- API Base：`/api/gushi`

## 1. 设计原则

1. 谷市使用独立路由域，不混入现有 `/api/market`
2. 鉴权继续复用现有 JWT 中间件
3. 钱包与流水复用现有用户体系
4. 谷市订单不复用现有 `/api/orders` 的即时结算逻辑

## 2. 推荐文件结构

- `smart-ja-web/server/routes/gushi.js`
- `smart-ja-web/server/utils/gushiMappers.js`
- `smart-ja-web/server/utils/gushiPrice.js`

后续可选拆分：

- `smart-ja-web/server/routes/gushiAdmin.js`
- `smart-ja-web/server/routes/gushiOrders.js`

## 3. 鉴权规则

### 无需登录

- `GET /api/gushi/home`
- `GET /api/gushi/products`
- `GET /api/gushi/products/:id`
- `GET /api/gushi/products/:id/trades`
- `GET /api/gushi/products/:id/listings`

### 需要登录

- 发布挂单
- 收藏
- 下单
- 发货
- 确认收货
- 我的谷柜

### 管理后台

当前项目没有真正的角色权限模型。

MVP 临时方案建议：

- 使用环境变量配置管理员邮箱白名单
- 或使用固定用户 ID 白名单

不要直接依赖前端 `meta.isAdmin` 作为安全边界。

## 4. 公共响应结构建议

成功响应：

```json
{
  "success": true,
  "data": {}
}
```

分页响应：

```json
{
  "success": true,
  "data": [],
  "nextCursor": "xxx"
}
```

错误响应：

```json
{
  "success": false,
  "message": "error message"
}
```

## 5. API 分组

## 5.1 首页与行情

### `GET /api/gushi/home`

用途：

- 返回谷市首页榜单与摘要数据

返回建议：

- `hotIps`
- `hotProducts`
- `topGainers`
- `topLosers`
- `latestTrades`
- `floorPriceBoard`

实现建议：

- 读取最近一条 `GushiPriceSnapshot`
- 对低样本数据进行弱化处理

### `GET /api/gushi/products`

用途：

- 标准单品列表页

查询参数：

- `q`
- `ipName`
- `characterName`
- `category`
- `sortBy`
- `cursor`
- `limit`

推荐排序：

- `latest`
- `volume_desc`
- `change_desc`
- `change_asc`
- `floor_price_asc`
- `floor_price_desc`

### `GET /api/gushi/products/:id`

用途：

- 标准单品详情

返回建议：

- 标准单品基础信息
- 最新价
- 参考价
- 地板价
- 今日涨跌幅
- 7 日价格曲线
- 收藏数
- 当前在售数量

### `GET /api/gushi/products/:id/trades`

用途：

- 历史成交列表

查询参数：

- `cursor`
- `limit`

数据来源：

- `Order` where `bizType = gushi` and `status = completed`

### `GET /api/gushi/products/:id/listings`

用途：

- 当前在售挂单

查询参数：

- `conditionGrade`
- `sortBy`
- `cursor`
- `limit`

业务规则：

- 仅返回 `auditStatus = approved`
- 仅返回 `status = active`
- 仅返回 `availableQuantity > 0`

## 5.2 挂单与收藏

### `POST /api/gushi/listings`

用途：

- 创建挂单

请求体建议：

```json
{
  "gushiProductId": "xxx",
  "conditionGrade": "A",
  "isOpened": true,
  "hasOriginalPackage": false,
  "defectNotes": "边角轻微磨损",
  "images": ["https://..."],
  "price": 88,
  "quantity": 1
}
```

服务端校验：

- 标准单品必须存在
- 图片至少 1 张
- 价格必须大于 0
- 数量必须大于 0

创建后的默认状态：

- `status = active`
- `auditStatus = pending`

### `PATCH /api/gushi/listings/:id`

用途：

- 编辑自己的挂单

规则：

- 已产生订单的挂单只允许修改非关键字段
- 价格修改后可进入重新审核

### `POST /api/gushi/listings/:id/offline`

用途：

- 卖家主动下架

规则：

- 已锁定中的订单不得直接下架

### `POST /api/gushi/favorites/:productId`

用途：

- 收藏单品

### `DELETE /api/gushi/favorites/:productId`

用途：

- 取消收藏

## 5.3 托管订单

### `POST /api/gushi/orders`

用途：

- 创建谷市托管订单

请求体建议：

```json
{
  "listingId": "xxx",
  "quantity": 1,
  "addressId": "xxx"
}
```

关键逻辑：

1. 校验挂单有效性
2. 校验库存
3. 校验买家余额
4. 扣除买家余额
5. 记录 `gushi_hold` 流水
6. 创建 `Order`
7. 锁定挂单库存

与现有 `/api/orders` 最大区别：

- 不立即给卖家记收入

### `GET /api/gushi/orders/:id`

用途：

- 订单详情

权限：

- 仅买家或卖家可见

### `POST /api/gushi/orders/:id/ship`

用途：

- 卖家填写物流并发货

请求体建议：

```json
{
  "trackingCompany": "SF",
  "trackingNumber": "SF123456789"
}
```

规则：

- 仅卖家可操作
- 订单必须为 `paid`

### `POST /api/gushi/orders/:id/confirm`

用途：

- 买家确认收货

关键逻辑：

1. 订单状态改为 `completed`
2. 更新 `settlementStatus = released`
3. 给卖家增加余额
4. 写入 `gushi_income` 和 `gushi_release`
5. 更新挂单销量
6. 更新行情快照

### `POST /api/gushi/orders/:id/cancel`

用途：

- 买家取消或系统退款

关键逻辑：

1. 校验可取消状态
2. 恢复挂单库存
3. 退回买家余额
4. 记录 `gushi_refund`

## 5.4 我的谷柜

### `GET /api/gushi/me/listings`

用途：

- 我的挂单列表

### `GET /api/gushi/me/orders`

用途：

- 我的谷市订单

建议支持：

- `type=buy`
- `type=sell`
- `status`

### `GET /api/gushi/me/favorites`

用途：

- 我的收藏单品

### `GET /api/gushi/me/transactions`

用途：

- 仅返回谷市相关钱包流水

## 5.5 后台接口

### `GET /api/gushi/admin/products`

用途：

- 查询标准单品池

### `POST /api/gushi/admin/products`

用途：

- 新增标准单品

### `PATCH /api/gushi/admin/products/:id`

用途：

- 修改标准单品

### `GET /api/gushi/admin/listings/pending`

用途：

- 查询待审核挂单

### `POST /api/gushi/admin/listings/:id/approve`

用途：

- 审核通过

### `POST /api/gushi/admin/listings/:id/reject`

用途：

- 审核拒绝

## 6. 价格聚合工具职责

建议将行情聚合逻辑放进 `server/utils/gushiPrice.js`，至少提供以下函数：

- `computeProductSnapshot(gushiProductId)`
- `getLatestCompletedTrade(gushiProductId)`
- `getReferencePrice7d(gushiProductId)`
- `getFloorPrice(gushiProductId)`
- `getDailyChangePercent(gushiProductId)`
- `writeSnapshot(gushiProductId)`

调用时机：

- 订单确认收货后
- 定时任务补算时

## 7. 实施顺序

### Phase 1

- `GET /home`
- `GET /products`
- `GET /products/:id`
- `GET /products/:id/trades`
- `GET /products/:id/listings`

### Phase 2

- `POST /listings`
- `PATCH /listings/:id`
- 收藏接口
- `GET /me/*`

### Phase 3

- `POST /orders`
- `POST /orders/:id/ship`
- `POST /orders/:id/confirm`
- `POST /orders/:id/cancel`

### Phase 4

- `GET /admin/*`
- `POST /admin/*`

## 8. 风险点

### 8.1 即时结算误用

如果谷市订单错误复用现有 `/api/orders`，卖家会在买家未确认收货前直接拿到钱。

### 8.2 库存并发

创建订单时必须在事务中扣减 `availableQuantity`，否则会超卖。

### 8.3 行情脏数据

只有 `completed` 的谷市订单能进入行情。

## 9. 结论

谷市 API 的关键不是“多一组商品接口”，而是：

1. 独立业务域
2. 托管结算
3. 行情聚合
4. 和现有钱包系统安全复用
