<template>
  <div class="order-summary">
    <div class="section-header">
      <h3 class="section-title">订单概览</h3>
      <button 
        @click="$emit('view-all-orders')"
        class="view-all-button"
      >
        查看全部 →
      </button>
    </div>

    <!-- 订单状态统计 -->
    <div class="order-stats-grid">
      <OrderStatCard
        icon="⏳"
        title="待付款"
        :count="orderCounts.pendingPay"
        color="from-amber-400 to-orange-500"
        @click="$emit('view-pending-pay')"
      />
      
      <OrderStatCard
        icon="🚚"
        title="待发货"
        :count="orderCounts.pendingShip"
        color="from-blue-400 to-cyan-500"
        @click="$emit('view-pending-ship')"
      />
      
      <OrderStatCard
        icon="📦"
        title="待收货"
        :count="orderCounts.pendingRecv"
        color="from-green-400 to-emerald-500"
        @click="$emit('view-pending-recv')"
      />
      
      <OrderStatCard
        icon="⭐"
        title="待评价"
        :count="orderCounts.review"
        color="from-purple-400 to-pink-500"
        @click="$emit('view-pending-review')"
      />
    </div>

    <!-- 最近订单 -->
    <div v-if="recentOrders.length > 0" class="recent-orders">
      <h4 class="subsection-title">最近订单</h4>
      <div class="orders-list">
        <OrderItem
          v-for="order in recentOrders"
          :key="order.id"
          :order="order"
          @click="$emit('view-order', order.id)"
        />
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon">🛒</div>
      <h4 class="empty-title">暂无订单</h4>
      <p class="empty-description">快去商城逛逛吧</p>
      <button 
        @click="$emit('go-shopping')"
        class="shopping-button"
      >
        去购物
      </button>
    </div>

    <!-- 订单趋势 -->
    <div v-if="orderTrend.length > 0" class="order-trend">
      <h4 class="subsection-title">订单趋势</h4>
      <div class="trend-chart">
        <div 
          v-for="(item, index) in orderTrend"
          :key="index"
          class="trend-bar"
          :style="{ height: item.height + '%' }"
          :title="`${item.day}: ${item.count}单`"
        >
          <div class="bar-fill" :class="item.color"></div>
          <div class="bar-label">{{ item.day }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import OrderStatCard from './OrderStatCard.vue';
import OrderItem from './OrderItem.vue';

interface OrderCounts {
  pendingPay: number;
  pendingShip: number;
  pendingRecv: number;
  review: number;
}

interface OrderItemType {
  id: number;
  productName: string;
  productImage: string;
  price: number;
  status: 'pending' | 'shipped' | 'delivered' | 'completed';
  statusText: string;
  date: string;
}

interface TrendItem {
  day: string;
  count: number;
  height: number;
  color: string;
}

interface Props {
  orderCounts: OrderCounts;
  recentOrders?: OrderItemType[];
  orderTrend?: TrendItem[];
}

interface Emits {
  (e: 'view-all-orders'): void;
  (e: 'view-pending-pay'): void;
  (e: 'view-pending-ship'): void;
  (e: 'view-pending-recv'): void;
  (e: 'view-pending-review'): void;
  (e: 'view-order', orderId: number): void;
  (e: 'go-shopping'): void;
}

const props = withDefaults(defineProps<Props>(), {
  recentOrders: () => [],
  orderTrend: () => []
});

const emit = defineEmits<Emits>();

// 默认最近订单
const defaultRecentOrders: OrderItemType[] = [
  {
    id: 1001,
    productName: '智能编程机器人',
    productImage: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12',
    price: 299,
    status: 'shipped',
    statusText: '已发货',
    date: '2026-02-26'
  },
  {
    id: 1002,
    productName: '3D打印笔套装',
    productImage: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12',
    price: 159,
    status: 'pending',
    statusText: '待付款',
    date: '2026-02-25'
  },
  {
    id: 1003,
    productName: 'AI绘画数位板',
    productImage: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12',
    price: 499,
    status: 'delivered',
    statusText: '待评价',
    date: '2026-02-24'
  }
];

// 默认订单趋势
const defaultOrderTrend: TrendItem[] = [
  { day: '一', count: 3, height: 60, color: 'bg-blue-400' },
  { day: '二', count: 5, height: 100, color: 'bg-blue-500' },
  { day: '三', count: 2, height: 40, color: 'bg-blue-400' },
  { day: '四', count: 4, height: 80, color: 'bg-blue-500' },
  { day: '五', count: 6, height: 120, color: 'bg-blue-600' },
  { day: '六', count: 8, height: 160, color: 'bg-blue-700' },
  { day: '日', count: 4, height: 80, color: 'bg-blue-500' }
];
</script>

<style scoped>
.order-summary {
  animation: slideInRight 0.5s ease-out;
}

.section-header {
  @apply flex items-center justify-between mb-6;
}

.section-title {
  @apply text-xl font-bold text-gray-800;
}

.view-all-button {
  @apply text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors;
}

.order-stats-grid {
  @apply grid grid-cols-2 md:grid-cols-4 gap-4 mb-8;
}

.recent-orders {
  @apply mb-8;
}

.subsection-title {
  @apply text-lg font-semibold text-gray-700 mb-4;
}

.orders-list {
  @apply space-y-3;
}

.empty-state {
  @apply text-center py-8 mb-8;
}

.empty-icon {
  @apply text-5xl mb-4;
}

.empty-title {
  @apply text-lg font-medium text-gray-700 mb-2;
}

.empty-description {
  @apply text-gray-500 mb-4;
}

.shopping-button {
  @apply px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:shadow-lg transition-shadow;
}

.order-trend {
  @apply mt-8;
}

.trend-chart {
  @apply flex items-end justify-between h-32 gap-1;
}

.trend-bar {
  @apply flex flex-col items-center flex-1;
}

.bar-fill {
  @apply w-full rounded-t transition-all duration-500;
  min-height: 10px;
}

.bar-label {
  @apply text-xs text-gray-500 mt-2;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>