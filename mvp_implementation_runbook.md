# NS Matrix MVP 落地执行单

## 1. 启动方式（二选一）

### 本地双进程

直接运行根目录：

- `start_demo.bat`

说明：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3005`

### Docker 全栈

直接运行根目录：

- `start_fullstack_docker.bat`

说明：

- 默认访问：`http://localhost:8080`

---

## 2. 先做 10 分钟环境确认

1. 登录页能打开：`/login`
2. 市场页能打开：`/market`
3. AI Lab 能打开：`/ai-lab`
4. 众筹页能打开：`/crowdfunding`
5. 社区页能打开：`/social`

---

## 3. MVP 主链路验收（必须过）

1. `Home -> Login`：完成登录，刷新后仍保持登录
2. `Market -> ProductDetail -> Checkout`：完成一次下单
3. `Profile / MyOrders`：能看到订单并完成一次确认收货
4. `AI Lab -> Chat`：完成一次有效对话
5. `AI Lab -> Publish`：发布一个项目到 Market，并可在商品详情访问

---

## 4. 回归重点（本轮改动相关）

1. 导航入口全展示
- 顶部导航可见：Home / Market / Social / Crowdfunding / AI Lab / AI Mentor / About
- 底部导航可见：首页 / 市场 / 社区 / 众筹 / AI Lab / 钱包 / 我的
- 页脚 Platform 可见：About / Market / Social / Crowdfunding / AI Lab / AI Mentor / Profile

2. AI Lab 配额提示
- 后端配额正常时，显示剩余次数
- 后端配额异常时，显示“暂时无法确认免费额度”，不再误导为固定数字

3. Crowdfunding 页面
- 页面可正常加载项目列表
- 申请/支持按钮不再报 `MarketService.get/post` 调用错误

---

## 5. 每次提交前固定检查

在 `smart-ja-web` 下执行：

```bash
npm run build
```

只要构建通过，再进入人工验收流程。
