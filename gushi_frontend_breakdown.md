# 谷市前端页面与开发任务拆分

- 文档状态：Working Draft
- 日期：2026-03-18
- 前端技术栈：Vue 3 + Vue Router + Pinia + Axios + ECharts

## 1. 目标

在现有 `smart-ja-web` 前端架构内，新增一组独立的谷市页面与状态模块，完成“行情浏览 -> 查看详情 -> 发布挂单 -> 下单交易 -> 查看个人谷柜”的闭环。

## 2. 建议新增文件

### 路由与状态

- `smart-ja-web/src/router/index.js`
- `smart-ja-web/src/services/api.js`
- `smart-ja-web/src/store/gushi.js`

### 页面

- `smart-ja-web/src/views/GushiHome.vue`
- `smart-ja-web/src/views/GushiDetail.vue`
- `smart-ja-web/src/views/GushiSell.vue`
- `smart-ja-web/src/views/GushiCabinet.vue`
- `smart-ja-web/src/views/GushiOrderDetail.vue`

### 组件

- `smart-ja-web/src/components/gushi/GushiPriceCard.vue`
- `smart-ja-web/src/components/gushi/GushiTrendChart.vue`
- `smart-ja-web/src/components/gushi/GushiListingCard.vue`
- `smart-ja-web/src/components/gushi/GushiTradeList.vue`
- `smart-ja-web/src/components/gushi/GushiFilterBar.vue`
- `smart-ja-web/src/components/gushi/GushiSellForm.vue`

## 3. 路由设计

建议新增：

```js
{ path: '/gushi', name: 'GushiHome', component: GushiHome }
{ path: '/gushi/:productId', name: 'GushiDetail', component: GushiDetail }
{ path: '/gushi/sell', name: 'GushiSell', component: GushiSell, meta: { requiresAuth: true } }
{ path: '/gushi/my', name: 'GushiCabinet', component: GushiCabinet, meta: { requiresAuth: true } }
{ path: '/gushi/orders/:id', name: 'GushiOrderDetail', component: GushiOrderDetail, meta: { requiresAuth: true } }
```

## 4. API 服务层设计

在 `src/services/api.js` 新增：

```js
export const GushiService = {
  getHome: () => api.get('/gushi/home'),
  getProducts: (params) => api.get('/gushi/products', { params }),
  getProductById: (id) => api.get(`/gushi/products/${id}`),
  getTrades: (id, params) => api.get(`/gushi/products/${id}/trades`, { params }),
  getListings: (id, params) => api.get(`/gushi/products/${id}/listings`, { params }),
  createListing: (data) => api.post('/gushi/listings', data),
  updateListing: (id, data) => api.patch(`/gushi/listings/${id}`, data),
  offlineListing: (id) => api.post(`/gushi/listings/${id}/offline`),
  createOrder: (data) => api.post('/gushi/orders', data),
  getOrderDetail: (id) => api.get(`/gushi/orders/${id}`),
  shipOrder: (id, data) => api.post(`/gushi/orders/${id}/ship`, data),
  confirmOrder: (id) => api.post(`/gushi/orders/${id}/confirm`),
  cancelOrder: (id) => api.post(`/gushi/orders/${id}/cancel`),
  addFavorite: (productId) => api.post(`/gushi/favorites/${productId}`),
  removeFavorite: (productId) => api.delete(`/gushi/favorites/${productId}`),
  getMyListings: (params) => api.get('/gushi/me/listings', { params }),
  getMyOrders: (params) => api.get('/gushi/me/orders', { params }),
  getMyFavorites: (params) => api.get('/gushi/me/favorites', { params }),
  getMyTransactions: (params) => api.get('/gushi/me/transactions', { params })
}
```

## 5. Store 设计

建议新增 `src/store/gushi.js`，至少管理以下状态：

- `homeData`
- `productMap`
- `tradeMap`
- `listingMap`
- `myListings`
- `myOrders`
- `myFavorites`
- `loadingStates`

建议 action：

- `loadHome()`
- `loadProduct(productId)`
- `loadTrades(productId)`
- `loadListings(productId)`
- `createListing(payload)`
- `createOrder(payload)`
- `loadMyCabinet()`

## 6. 页面拆分

## 6.1 `GushiHome.vue`

目标：

- 让用户快速理解今天谷市行情

页面模块：

- 顶部搜索栏
- 热门 IP 榜
- 热门单品榜
- 今日涨跌榜
- 最新成交流
- 筛选入口

可复用参考：

- `src/views/Market.vue`
- `src/components/LiveTicker.vue`

开发任务：

1. 接入 `GushiService.getHome`
2. 支持榜单跳转详情页
3. 支持 15 到 30 秒轮询刷新

## 6.2 `GushiDetail.vue`

目标：

- 在单页完成价格判断与下单决策

页面模块：

- 单品头图与基础信息
- 最新价 / 参考价 / 地板价
- 7 日价格曲线
- 成交记录
- 当前在售单列表
- 收藏按钮
- 下单 CTA

可复用参考：

- `src/views/ProductDetail.vue`
- ECharts 图表能力

开发任务：

1. 接入 `getProductById`
2. 接入 `getTrades`
3. 接入 `getListings`
4. 实现收藏交互
5. 实现挂单卡片的立即购买入口

## 6.3 `GushiSell.vue`

目标：

- 让普通用户在标准单品下发寄售单

页面模块：

- 标准单品选择器
- 成色与包装字段
- 瑕疵描述
- 图片上传
- 价格输入
- 发布确认

可复用参考：

- 现有上传接口
- `src/components/PublishModal.vue` 的部分交互思路

开发任务：

1. 商品搜索选择
2. 图片上传接入 `UserService.uploadFile`
3. 创建挂单提交
4. 表单校验与错误提示

## 6.4 `GushiCabinet.vue`

目标：

- 承接“我的挂单 / 我的订单 / 我的收藏”

页面模块：

- Tab: 我的挂单
- Tab: 我的购买
- Tab: 我的出售
- Tab: 我的收藏
- Tab: 谷市流水

可复用参考：

- `src/views/UserProfile.vue`
- `src/views/MyOrders.vue`
- `src/views/Wallet.vue`

开发任务：

1. 接入 `getMyListings`
2. 接入 `getMyOrders`
3. 接入 `getMyFavorites`
4. 接入 `getMyTransactions`

## 6.5 `GushiOrderDetail.vue`

目标：

- 展示谷市订单全链路状态

页面模块：

- 商品快照
- 地址信息
- 物流信息
- 支付与托管状态
- 买家确认收货
- 卖家发货入口

开发任务：

1. 接入 `getOrderDetail`
2. 卖家发货操作
3. 买家确认收货操作

## 7. UI 与交互建议

### 风格方向

- 继续保持现有项目偏视觉化、潮流感、偏黑底高对比的语言
- 谷市可以比现有 Market 更强调“数据面板感”

### 图表建议

- 7 日价格趋势用面积折线
- 榜单可做涨跌颜色区分
- 低样本数据需要标记“样本少”

### 关键提示

- 首页和详情页都要明确“价格基于真实成交”
- 低成交样本要弱化涨跌表达

## 8. 开发顺序

### Frontend Phase 1

- 新增路由
- 新增 `GushiService`
- 完成 `GushiHome.vue`
- 完成 `GushiDetail.vue`

### Frontend Phase 2

- 完成 `GushiSell.vue`
- 完成 `GushiCabinet.vue`

### Frontend Phase 3

- 完成 `GushiOrderDetail.vue`
- 串联下单、发货、确认收货

## 9. 验收标准

### 首页

- 能看到榜单和成交流
- 能进入详情页

### 详情页

- 能看价格曲线
- 能看在售单
- 能发起购买

### 发布页

- 能完成挂单创建

### 我的谷柜

- 能看到我的挂单、订单、收藏和流水

### 订单详情页

- 买卖双方能看到各自可执行动作

## 10. 风险点

### 10.1 继续复用现有 `MarketService`

会让服务层语义越来越混乱，因此建议独立 `GushiService`。

### 10.2 页面职责不清

如果把“谷市”和“普通市场”混到同一个页面，会让用户无法理解价格口径。

### 10.3 图表过度复杂

MVP 首版不需要证券级图表，优先把趋势与成交解释清楚。
