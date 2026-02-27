# UserProfile.vue 重构方案

> 文件: `smart-ja-web/src/views/UserProfile.vue`
> 当前行数: 755行
> 目标行数: < 300行
> 优先级: 🔴 高 (第一优先级)

## 📋 现状分析

### 当前问题
1. **职责过多**: 用户信息、签到、订单、钱包、地址、卖家功能、活动、服务等
2. **状态混乱**: 多个modal状态管理复杂
3. **依赖过多**: 导入15+组件和10+服务
4. **缺乏模块化**: 所有功能写在一个文件中

### 代码结构分析
```javascript
// 导入部分 (约50行)
import 15+ 组件
import 10+ 服务/工具

// 状态定义 (约100行)
15+ ref状态变量
多个计算属性

// 方法定义 (约300行)
20+ 方法函数
事件处理函数

// 模板部分 (约300行)
复杂的条件渲染
多个modal对话框
标签页切换逻辑
```

## 🎯 重构目标

### 主要目标
1. 将755行代码拆分为多个小组件
2. 每个组件职责单一，行数<150行
3. 提高代码可维护性和可测试性
4. 保持功能完全一致

### 具体指标
- 主文件行数: < 150行
- 子组件平均行数: < 120行
- 组件复用率: 提高50%
- 测试覆盖率: > 80%

## 🏗️ 重构方案

### 新组件结构
```
UserProfile/                    # 新建目录
├── UserProfile.vue            # 主容器组件 (约120行)
├── components/                # 子组件目录
│   ├── UserBasicInfo.vue      # 基础信息 (约100行)
│   ├── UserStats.vue          # 统计信息 (约80行)
│   ├── UserActions.vue        # 用户操作 (约90行)
│   ├── OrderSummary.vue       # 订单摘要 (约110行)
│   ├── MakerDashboard.vue     # 创客面板 (约120行)
│   └── modals/                # 模态框组件
│       ├── EditProfileModal.vue
│       ├── OrderCenterModal.vue
│       ├── WalletModal.vue
│       ├── AddressModal.vue
│       ├── SellerModal.vue
│       ├── ActivityModal.vue
│       └── ServiceModal.vue
└── composables/               # 组合式函数
    ├── useUserProfile.ts      # 用户资料逻辑
    ├── useUserOrders.ts       # 订单逻辑
    ├── useUserWallet.ts       # 钱包逻辑
    └── useUserMaker.ts        # 创客逻辑
```

### 职责划分

#### 1. UserProfile.vue (主容器)
**职责**: 协调子组件，管理标签页状态
**代码量**: 约120行
```vue
<template>
  <div class="user-profile">
    <UserBasicInfo />
    <UserStats />
    <UserActions />
    
    <div v-if="activeTab === 'personal'">
      <OrderSummary />
      <!-- 其他个人功能 -->
    </div>
    
    <div v-else>
      <MakerDashboard />
    </div>
  </div>
</template>
```

#### 2. UserBasicInfo.vue
**职责**: 显示用户基本信息、头像、等级
**代码量**: 约100行

#### 3. UserStats.vue  
**职责**: 显示积分、经验、签到状态
**代码量**: 约80行

#### 4. UserActions.vue
**职责**: 用户操作按钮（编辑、发布、收入等）
**代码量**: 约90行

#### 5. OrderSummary.vue
**职责**: 显示订单统计和快捷操作
**代码量**: 约110行

#### 6. MakerDashboard.vue
**职责**: 创客工作室功能
**代码量**: 约120行

## 🔧 实施步骤

### 阶段1: 准备工作 (D1下午)
1. 创建新的目录结构
2. 备份原始文件
3. 编写测试用例
4. 制定详细迁移计划

### 阶段2: 提取组合式函数 (D2上午)
1. 创建`composables/useUserProfile.ts`
2. 提取用户资料相关逻辑
3. 创建`composables/useUserOrders.ts`
4. 提取订单相关逻辑

### 阶段3: 创建子组件 (D2下午)
1. 创建`UserBasicInfo.vue`
2. 创建`UserStats.vue`
3. 创建`UserActions.vue`
4. 创建`OrderSummary.vue`

### 阶段4: 重构主组件 (D3上午)
1. 简化`UserProfile.vue`
2. 集成子组件
3. 更新状态管理
4. 测试功能完整性

### 阶段5: 优化和测试 (D3下午)
1. 编写单元测试
2. 进行集成测试
3. 性能优化
4. 代码审查

## 📝 详细迁移计划

### 从原文件迁移的内容

#### 1. 状态变量迁移
```javascript
// 原文件中的状态
const isEditModalOpen = ref(false);
const isPublishModalOpen = ref(false);
// ... 15+ 个状态变量

// 迁移到组合式函数
// useUserProfile.ts
export function useUserProfileModals() {
  const isEditModalOpen = ref(false);
  const isPublishModalOpen = ref(false);
  // ...
  return { isEditModalOpen, isPublishModalOpen, ... };
}
```

#### 2. 方法函数迁移
```javascript
// 原文件中的方法
const handleCheckin = async () => { /* ... */ };
const handleEditProfile = () => { /* ... */ };
// ... 20+ 个方法

// 迁移到组合式函数
// useUserProfile.ts
export function useUserProfileActions() {
  const handleCheckin = async () => { /* ... */ };
  const handleEditProfile = () => { /* ... */ };
  // ...
  return { handleCheckin, handleEditProfile, ... };
}
```

#### 3. 计算属性迁移
```javascript
// 原文件中的计算属性
const totalOrders = computed(() => { /* ... */ });
const makerEarnings = computed(() => { /* ... */ });
// ... 多个计算属性

// 迁移到组合式函数
// useUserProfile.ts
export function useUserProfileComputed() {
  const totalOrders = computed(() => { /* ... */ });
  const makerEarnings = computed(() => { /* ... */ });
  // ...
  return { totalOrders, makerEarnings, ... };
}
```

## 🧪 测试策略

### 单元测试
```javascript
// UserBasicInfo.test.js
describe('UserBasicInfo', () => {
  it('显示用户头像和名称', () => { /* ... */ });
  it('点击编辑按钮打开modal', () => { /* ... */ });
});

// useUserProfile.test.js  
describe('useUserProfile', () => {
  it('签到功能正常工作', async () => { /* ... */ });
  it('更新用户资料', async () => { /* ... */ });
});
```

### 集成测试
```javascript
// UserProfile.integration.test.js
describe('UserProfile 集成测试', () => {
  it('完整用户流程测试', async () => {
    // 1. 加载页面
    // 2. 查看基本信息
    // 3. 执行签到
    // 4. 查看订单
    // 5. 切换创客模式
  });
});
```

## 🚨 风险与应对

### 风险1: 功能不一致
**应对**: 
- 逐步迁移，分阶段测试
- 保持API接口不变
- 并行运行新旧版本对比

### 风险2: 性能下降
**应对**:
- 监控组件渲染性能
- 优化状态更新
- 使用缓存策略

### 风险3: 测试覆盖不足
**应对**:
- 测试驱动开发
- 逐步增加测试用例
- 代码覆盖率监控

### 风险4: 团队协作问题
**应对**:
- 清晰的文档
- 代码审查流程
- 及时沟通进展

## 📊 成功指标

### 代码质量指标
- [ ] 主文件行数 < 150行
- [ ] 子组件平均行数 < 120行
- [ ] 代码复杂度降低 50%
- [ ] 重复代码减少 70%

### 开发效率指标
- [ ] 构建时间减少 30%
- [ ] 热重载速度提升 50%
- [ ] 测试运行时间减少 40%

### 维护性指标
- [ ] 组件复用率 > 60%
- [ ] 测试覆盖率 > 80%
- [ ] 文档完整度 100%

## 👥 责任分配

### OpenClaw (主导)
- 制定重构方案
- 实施代码迁移
- 编写测试用例
- 性能优化

### 需要支持
- 业务逻辑确认
- 用户体验验证
- 测试环境支持
- 部署协调

## 📅 时间计划

### D1下午 (今天)
- [x] 完成现状分析
- [x] 制定重构方案
- [ ] 创建目录结构
- [ ] 备份原始代码

### D2上午
- [ ] 提取组合式函数 (2小时)
- [ ] 创建基础子组件 (2小时)
- [ ] 编写单元测试 (1小时)

### D2下午
- [ ] 创建剩余子组件 (3小时)
- [ ] 集成测试 (1小时)
- [ ] 代码审查 (1小时)

### D3全天
- [ ] 性能优化 (2小时)
- [ ] 完整测试 (3小时)
- [ ] 文档更新 (2小时)
- [ ] 最终验收 (1小时)

## 🎯 验收标准

### 功能验收
- [ ] 所有原有功能正常工作
- [ ] 用户交互体验一致
- [ ] 性能无下降
- [ ] 无引入的bug

### 代码验收
- [ ] 通过ESLint检查
- [ ] 通过Prettier格式化
- [ ] 测试覆盖率达标
- [ ] 代码审查通过

### 文档验收
- [ ] 组件文档完整
- [ ] API文档更新
- [ ] 部署指南更新
- [ ] 团队交接文档

---

## 附录：代码示例

### 新的UserProfile.vue (简化版)
```vue
<template>
  <div class="user-profile-container">
    <UserBasicInfo 
      :user="user" 
      @edit="openEditModal" 
    />
    
    <UserStats 
      :stats="stats" 
      @checkin="handleCheckin" 
    />
    
    <UserActions 
      :actions="availableActions"
      @action="handleUserAction"
    />
    
    <div v-if="activeTab === 'personal'">
      <OrderSummary :orders="orders" />
    </div>
    
    <div v-else>
      <MakerDashboard :makerData="makerData" />
    </div>
    
    <!-- Modal组件 -->
    <EditProfileModal v-if="showEditModal" />
    <!-- 其他modal -->
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useUserProfile } from './composables/useUserProfile';
import { useUserOrders } from './composables/useUserOrders';
import UserBasicInfo from './components/UserBasicInfo.vue';
import UserStats from './components/UserStats.vue';
import UserActions from './components/UserActions.vue';
import OrderSummary from './components/OrderSummary.vue';
import MakerDashboard from './components/MakerDashboard.vue';

const { user, stats, handleCheckin } = useUserProfile();
const { orders } = useUserOrders();

const activeTab = ref('personal');
const showEditModal = ref(false);

const openEditModal = () => {
  showEditModal.value = true;
};
</script>
```

---

*本方案将根据实施情况动态调整*
*制定: OpenClaw*
*日期: 2026-02-27*
*版本: 1.0.0*
