<script setup>
import { computed, onMounted } from 'vue';
import { useOrderStore } from '../store/order';

const orderStore = useOrderStore();

onMounted(() => {
  orderStore.fetchMyOrders();
});

const orders = computed(() => orderStore.orders);
const isLoading = computed(() => orderStore.isLoading);

const getStatusColor = (status) => {
  const map = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-gray-100 text-gray-700'
  };
  return map[status] || 'bg-gray-50 text-gray-500';
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pt-24">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">我的订单</h1>

      <div v-if="isLoading" class="flex justify-center py-20">
         <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>

      <div v-else-if="orders.length === 0" class="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div class="text-6xl mb-4">📭</div>
        <h3 class="text-xl font-bold text-gray-800 mb-2">暂无订单</h3>
        <p class="text-gray-500 mb-6">去市场上看看有什么需要的服务吧</p>
        <router-link to="/market" class="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
          去逛逛
        </router-link>
      </div>

      <div v-else class="space-y-6">
        <div v-for="order in orders" :key="order.id" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
          <!-- Order Header -->
          <div class="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
            <div class="text-sm text-gray-500">
              <span class="font-bold text-gray-700">订单号：</span> {{ order.id }}
              <span class="mx-2 text-gray-300">|</span>
              {{ new Date(order.createdAt).toLocaleString() }}
            </div>
            <span :class="getStatusColor(order.status)" class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
              {{ order.status }}
            </span>
          </div>

          <!-- Order Body -->
          <div class="p-6 flex flex-col md:flex-row gap-6">
            <!-- Service Info -->
            <div class="flex-1">
              <h3 class="font-bold text-lg text-gray-900 mb-1">{{ order.service?.title || '未知服务' }}</h3>
              <div class="text-sm text-gray-500 mb-4">订单备注: {{ order.notes || '无' }}</div>
              
              <div class="bg-blue-50/50 rounded-xl p-4 border border-blue-50 text-sm space-y-2">
                 <div class="flex gap-2">
                  <span class="text-blue-600 font-bold">🆔 服务ID:</span>
                  <span class="text-gray-700">{{ order.service_id }}</span>
                </div>
                <div class="flex gap-2">
                  <span class="text-blue-600 font-bold">📅 创建时间:</span>
                  <span class="text-gray-700">{{ new Date(order.createdAt).toLocaleString() }}</span>
                </div>
              </div>
            </div>

            <!-- Price & Actions -->
            <div class="flex flex-col justify-between items-end min-w-[120px] border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 mt-4 md:mt-0">
              <div class="text-right">
                <div class="text-xs text-gray-400 mb-1">实付金额</div>
                <div class="text-2xl font-bold text-gray-900">¥{{ order.amount }}</div>
              </div>
              <div class="flex flex-col gap-2 w-full mt-4">
                <button class="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 transition">
                  联系客服
                </button>
                <button v-if="order.status === 'completed'" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition shadow-sm">
                  评价服务
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>