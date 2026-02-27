<template>
  <button
    class="order-item"
    @click="$emit('click')"
  >
    <!-- 产品图片 -->
    <div class="product-image">
      <img 
        :src="order.productImage" 
        :alt="order.productName"
        class="image"
      />
    </div>

    <!-- 订单信息 -->
    <div class="order-info">
      <div class="product-name">{{ order.productName }}</div>
      <div class="order-meta">
        <div class="order-price">¥{{ order.price }}</div>
        <div class="order-date">{{ order.date }}</div>
      </div>
    </div>

    <!-- 订单状态 -->
    <div class="order-status">
      <StatusBadge :status="order.status" :text="order.statusText" />
    </div>

    <!-- 操作箭头 -->
    <div class="order-arrow">›</div>
  </button>
</template>

<script setup lang="ts">
import StatusBadge from './StatusBadge.vue';

interface Order {
  id: number;
  productName: string;
  productImage: string;
  price: number;
  status: 'pending' | 'shipped' | 'delivered' | 'completed';
  statusText: string;
  date: string;
}

interface Props {
  order: Order;
}

interface Emits {
  (e: 'click'): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>

<style scoped>
.order-item {
  @apply flex items-center gap-4 p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50;
  @apply hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-300;
  @apply active:scale-95 active:shadow-inner;
}

.product-image {
  @apply flex-shrink-0;
}

.image {
  @apply w-12 h-12 rounded-lg object-cover;
}

.order-info {
  @apply flex-1 min-w-0;
}

.product-name {
  @apply font-medium text-gray-800 truncate mb-1;
}

.order-meta {
  @apply flex items-center gap-3 text-sm;
}

.order-price {
  @apply font-semibold text-blue-600;
}

.order-date {
  @apply text-gray-500;
}

.order-status {
  @apply flex-shrink-0;
}

.order-arrow {
  @apply text-gray-400 text-xl transition-transform duration-300;
}

.order-item:hover .order-arrow {
  @apply transform translate-x-1 text-blue-500;
}
</style>