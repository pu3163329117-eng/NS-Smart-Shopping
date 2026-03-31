# 谷市数据模型设计与迁移方案

- 文档状态：Working Draft
- 日期：2026-03-18
- 适配数据库：PostgreSQL
- ORM：Prisma

## 1. 设计目标

在不破坏现有 `Service`、`Order`、`UserTransaction` 主链路的前提下，为谷市新增一套可标准化、可挂单、可托管成交、可聚合行情的数据结构。

## 2. 现有模型复用策略

直接复用：

- `User`
- `Address`
- `UserTransaction`

保留但不复用为谷市标准品主表：

- `Service`
- `ServiceSku`

需要扩展：

- `Order`
- `OrderItem`

需要新增：

- `GushiProduct`
- `GushiListing`
- `GushiPriceSnapshot`
- `GushiFavorite`

## 3. 为什么不直接复用 `Service`

现有 `Service` 更偏向创作者商品/服务模型，包含以下谷市不需要的语义：

- `productionMode`
- `factoryData`
- `fundingGoal`
- `pledgedAmount`
- `backersCount`

谷市更需要：

- 标准化单品信息
- 同款聚合
- 成色与瑕疵
- 挂单库存
- 行情快照

因此建议独立建表。

## 4. 新增模型设计

## 4.1 `GushiProduct`

用途：

- 表示一个标准化谷子单品
- 承担“同款聚合”的主键角色

建议字段：

```prisma
model GushiProduct {
  id             String    @id @default(cuid())
  slug           String?   @unique
  ipName         String
  characterName  String
  category       String
  seriesName     String
  variantName    String?
  releaseChannel String?
  releaseDate    DateTime?
  officialImage  String?
  officialPrice  Float?
  tags           Json?
  status         String    @default("active")
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  listings       GushiListing[]
  favorites      GushiFavorite[]
  priceSnapshots GushiPriceSnapshot[]
  orders         Order[]

  @@index([ipName, category])
  @@index([characterName, category])
  @@index([status, createdAt])
}
```

说明：

- `slug` 方便前端做更友好的 SEO/分享链接
- `tags` 用于 IP 标签、限定标签、联名标签
- `orders` 便于直接从订单反查单品成交

## 4.2 `GushiListing`

用途：

- 表示卖家的寄售挂单

建议字段：

```prisma
model GushiListing {
  id                 String       @id @default(cuid())
  sellerId           String
  gushiProductId     String
  conditionGrade     String
  isOpened           Boolean      @default(false)
  hasOriginalPackage Boolean      @default(false)
  defectNotes        String?
  images             Json?
  price              Float
  quantity           Int          @default(1)
  availableQuantity  Int          @default(1)
  status             String       @default("active")
  auditStatus        String       @default("pending")
  viewCount          Int          @default(0)
  soldCount          Int          @default(0)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  seller             User         @relation(fields: [sellerId], references: [id], onDelete: Cascade)
  product            GushiProduct @relation(fields: [gushiProductId], references: [id], onDelete: Cascade)
  orders             Order[]

  @@index([sellerId, status, createdAt])
  @@index([gushiProductId, auditStatus, price])
  @@index([gushiProductId, status, createdAt])
}
```

说明：

- `quantity` 是原始挂单数量
- `availableQuantity` 是剩余可售数量
- `auditStatus` 建议值：`pending | approved | rejected`
- `status` 建议值：`active | offline | sold_out | deleted`

## 4.3 `GushiPriceSnapshot`

用途：

- 记录某个时间点的行情快照
- 支撑榜单和价格曲线

建议字段：

```prisma
model GushiPriceSnapshot {
  id                 String       @id @default(cuid())
  gushiProductId     String
  latestPrice        Float?
  referencePrice7d   Float?
  floorPrice         Float?
  avgPrice24h        Float?
  changePercentDaily Float?
  volume24h          Int          @default(0)
  turnover24h        Float        @default(0)
  capturedAt         DateTime     @default(now())

  product            GushiProduct @relation(fields: [gushiProductId], references: [id], onDelete: Cascade)

  @@index([gushiProductId, capturedAt])
  @@index([capturedAt])
}
```

说明：

- 首版可以不做高频分钟级快照
- MVP 可按成交后更新 + 定时聚合写入

## 4.4 `GushiFavorite`

用途：

- 表示用户收藏的标准单品

建议字段：

```prisma
model GushiFavorite {
  id             String       @id @default(cuid())
  userId         String
  gushiProductId String
  createdAt      DateTime     @default(now())

  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  product        GushiProduct @relation(fields: [gushiProductId], references: [id], onDelete: Cascade)

  @@unique([userId, gushiProductId])
  @@index([gushiProductId, createdAt])
}
```

## 5. 扩展现有 `Order`

谷市仍然使用统一订单基础表，但必须加入业务分流字段。

建议扩展：

```prisma
model Order {
  // existing fields...
  bizType          String        @default("default")
  gushiProductId   String?
  gushiListingId   String?
  settlementStatus String        @default("none")
  settledAt        DateTime?
  refundStatus     String        @default("none")

  gushiProduct     GushiProduct? @relation(fields: [gushiProductId], references: [id], onDelete: SetNull)
  gushiListing     GushiListing? @relation(fields: [gushiListingId], references: [id], onDelete: SetNull)

  @@index([bizType, status, createdAt])
  @@index([gushiProductId, status, createdAt])
  @@index([gushiListingId, createdAt])
}
```

建议枚举语义：

- `bizType`: `default | gushi`
- `settlementStatus`: `none | held | released | refunded`
- `refundStatus`: `none | requested | approved | rejected | refunded`

## 6. 扩展现有 `OrderItem`

首版可以继续复用现有：

- `title`
- `price`
- `quantity`
- `image`

但更稳妥的方式是补一个快照字段：

```prisma
model OrderItem {
  // existing fields...
  itemMeta Json?
}
```

建议 `itemMeta` 存储：

- `conditionGrade`
- `isOpened`
- `hasOriginalPackage`
- `defectNotes`
- `ipName`
- `characterName`
- `category`
- `seriesName`
- `variantName`

原因：

- 下单后即使挂单被修改或下架，订单详情仍能展示正确快照

## 7. 需要给 `UserTransaction` 增加的类型口径

不一定需要改 schema，但业务上需要统一新增以下 `type`：

- `gushi_hold`
- `gushi_release`
- `gushi_income`
- `gushi_refund`

建议 `channel`：

- `wallet_hold`
- `wallet_release`
- `wallet_refund`

## 8. 迁移顺序

### Migration 1

- 新增 `GushiProduct`
- 新增 `GushiListing`
- 新增 `GushiPriceSnapshot`
- 新增 `GushiFavorite`

### Migration 2

- 扩展 `Order`
- 扩展 `OrderItem`

### Migration 3

- 补充索引
- 初始化种子标准单品数据

## 9. 初始化数据建议

MVP 首批种子数据建议只做少量高流通单品。

建议字段最小闭环：

- `ipName`
- `characterName`
- `category`
- `seriesName`
- `variantName`
- `officialImage`

建议首批只覆盖：

- 2 到 3 个热门 IP
- 每个 IP 5 到 10 个标准单品

## 10. 风险点

### 10.1 表关系过深

如果把谷市字段全部塞进 `Service` 和 `OrderItem`，后续维护会变复杂。

### 10.2 订单快照缺失

如果不保留挂单快照，订单历史会随着卖家修改挂单而失真。

### 10.3 行情查询性能

如果直接每次从订单实时聚合行情，后续流量上来后会吃力，因此需要 `GushiPriceSnapshot` 做缓存层。

## 11. 结论

最稳的 Prisma 改造方案是：

1. 独立建 `GushiProduct`、`GushiListing`、`GushiPriceSnapshot`、`GushiFavorite`
2. 扩展 `Order` 以支持谷市托管订单
3. 给 `OrderItem` 加快照字段
4. 钱包继续复用 `UserTransaction`
