<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from '../composables/useToast';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';

use([CanvasRenderer, LineChart, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent]);

const router = useRouter();
const { show: showToast } = useToast();
const currentTab = ref('overview'); // overview, services, orders, users, system

// --- Mock Data ---

// Overview
const stats = {
  gmv: '¥128,500',
  orders: 1256,
  users: 3580,
  activeProviders: 12
};

// Services (B-Side Management)
const pendingServices = ref([
  { id: 101, name: '少儿 Python 进阶课', provider: '极客星编程', price: 199, status: 'pending', date: '2026-05-20' },
  { id: 102, name: '3D 建模代工 (SLA)', provider: '未来工场', price: 80, status: 'pending', date: '2026-05-21' }
]);

const activeServices = ref([
  { id: 1, name: 'Python 零基础入门', provider: '极客星编程', sales: 450, rating: 4.8 },
  { id: 2, name: 'Arduino 工作坊', provider: '创客空间', sales: 120, rating: 4.9 }
]);

// Orders (3D Print & Course Bookings)
const orders = ref([
  { id: 'ORD-20260521-01', user: 'User_9527', item: '3D打印代工', status: 'processing', amount: 50, date: '10:30' },
  { id: 'ORD-20260521-02', user: 'Alice', item: 'Python 课程', status: 'completed', amount: 99, date: '09:15' },
  { id: 'ORD-20260520-05', user: 'Bob', item: '智能小车套件', status: 'shipped', amount: 299, date: 'Yesterday' }
]);

// System Status (Simplified Ops)
const systemStatus = ref({
  cpu: 45,
  memory: 60,
  dbConnections: 128,
  lastBackup: '2026-05-21 03:00:00'
});

const systemLogs = ref([
  { time: '10:45:22', level: 'INFO', msg: 'New service application received: ID 102' },
  { time: '10:30:05', level: 'INFO', msg: 'Order ORD-20260521-01 payment confirmed' },
  { time: '09:00:00', level: 'WARN', msg: 'High traffic detected on /market/service' }
]);

// --- Charts ---
const revenueOption = {
  tooltip: { trigger: 'axis' },
  grid: { top: 20, right: 20, bottom: 20, left: 40 },
  xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  yAxis: { type: 'value' },
  series: [{ data: [820, 932, 901, 934, 1290, 1330, 1320], type: 'line', smooth: true, areaStyle: { opacity: 0.2 }, itemStyle: { color: '#4f46e5' } }]
};

// --- Actions ---
const handleApprove = (id) => {
  const idx = pendingServices.value.findIndex(s => s.id === id);
  if (idx > -1) {
    const service = pendingServices.value[idx];
    pendingServices.value.splice(idx, 1);
    activeServices.value.push({ ...service, sales: 0, rating: 0 });
    showToast(`服务 "${service.name}" 已审核通过`, 'success');
  }
};

const handleReject = (id) => {
  const idx = pendingServices.value.findIndex(s => s.id === id);
  if (idx > -1) {
    pendingServices.value.splice(idx, 1);
    showToast('服务申请已驳回', 'info');
  }
};

const getStatusColor = (status) => {
  const map = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    shipped: 'bg-purple-100 text-purple-700'
  };
  return map[status] || 'bg-gray-100 text-gray-700';
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Top Bar -->
    <header class="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-20">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">NS</div>
        <h1 class="font-bold text-gray-800 text-lg">运营管理后台</h1>
      </div>
      <div class="flex items-center gap-4">
        <div class="text-sm text-gray-500">Admin: <span class="text-gray-900 font-medium">Tony Stark</span></div>
        <button @click="router.push('/')" class="text-sm text-indigo-600 hover:text-indigo-800 font-medium">返回前台</button>
      </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <aside class="w-64 bg-white border-r border-gray-200 flex flex-col">
        <nav class="p-4 space-y-1">
          <button 
            v-for="tab in ['overview', 'services', 'orders', 'users', 'system']" 
            :key="tab"
            @click="currentTab = tab"
            class="w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-3"
            :class="currentTab === tab ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'"
          >
            <span class="text-lg">
              {{ 
                tab === 'overview' ? '📊' : 
                tab === 'services' ? '🛠️' : 
                tab === 'orders' ? '📦' : 
                tab === 'users' ? '👥' : '⚙️' 
              }}
            </span>
            {{ 
              tab === 'overview' ? '数据概览' : 
              tab === 'services' ? '服务管理 (B端)' : 
              tab === 'orders' ? '订单中心' : 
              tab === 'users' ? '用户管理' : '系统监控' 
            }}
          </button>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto p-8">
        
        <!-- Overview Tab -->
        <div v-if="currentTab === 'overview'" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div class="text-sm text-gray-500 mb-1">总交易额 (GMV)</div>
              <div class="text-2xl font-bold text-gray-900">{{ stats.gmv }}</div>
              <div class="text-xs text-green-500 mt-2">↑ 12.5%</div>
            </div>
            <div class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div class="text-sm text-gray-500 mb-1">总订单数</div>
              <div class="text-2xl font-bold text-gray-900">{{ stats.orders }}</div>
              <div class="text-xs text-green-500 mt-2">↑ 8.2%</div>
            </div>
            <div class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div class="text-sm text-gray-500 mb-1">注册用户</div>
              <div class="text-2xl font-bold text-gray-900">{{ stats.users }}</div>
              <div class="text-xs text-green-500 mt-2">↑ 24.0%</div>
            </div>
            <div class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div class="text-sm text-gray-500 mb-1">入驻服务商</div>
              <div class="text-2xl font-bold text-gray-900">{{ stats.activeProviders }}</div>
              <div class="text-xs text-gray-400 mt-2">稳定增长</div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-96">
            <h3 class="font-bold text-gray-800 mb-4">营收趋势</h3>
            <v-chart class="w-full h-full" :option="revenueOption" autoresize />
          </div>
        </div>

        <!-- Services Tab (B2B Management) -->
        <div v-if="currentTab === 'services'" class="space-y-6">
          <!-- Pending Approvals -->
          <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-yellow-50/50">
              <h3 class="font-bold text-gray-800">待审核服务申请 ({{ pendingServices.length }})</h3>
              <span class="text-xs text-gray-500">B端机构提交</span>
            </div>
            <div v-if="pendingServices.length === 0" class="p-8 text-center text-gray-500">暂无待审核申请</div>
            <table v-else class="w-full text-sm text-left">
              <thead class="bg-gray-50 text-gray-500">
                <tr>
                  <th class="px-6 py-3">服务名称</th>
                  <th class="px-6 py-3">服务商</th>
                  <th class="px-6 py-3">价格</th>
                  <th class="px-6 py-3">提交日期</th>
                  <th class="px-6 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="service in pendingServices" :key="service.id">
                  <td class="px-6 py-4 font-medium">{{ service.name }}</td>
                  <td class="px-6 py-4">{{ service.provider }}</td>
                  <td class="px-6 py-4">¥{{ service.price }}</td>
                  <td class="px-6 py-4 text-gray-500">{{ service.date }}</td>
                  <td class="px-6 py-4 text-right space-x-2">
                    <button @click="handleReject(service.id)" class="text-red-600 hover:text-red-800">驳回</button>
                    <button @click="handleApprove(service.id)" class="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700">通过</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Active Services -->
          <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="font-bold text-gray-800">已上架服务列表</h3>
            </div>
            <table class="w-full text-sm text-left">
              <thead class="bg-gray-50 text-gray-500">
                <tr>
                  <th class="px-6 py-3">ID</th>
                  <th class="px-6 py-3">服务名称</th>
                  <th class="px-6 py-3">服务商</th>
                  <th class="px-6 py-3">销量</th>
                  <th class="px-6 py-3">评分</th>
                  <th class="px-6 py-3 text-right">状态</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="service in activeServices" :key="service.id">
                  <td class="px-6 py-4 text-gray-500">#{{ service.id }}</td>
                  <td class="px-6 py-4 font-medium">{{ service.name }}</td>
                  <td class="px-6 py-4">{{ service.provider }}</td>
                  <td class="px-6 py-4">{{ service.sales }}</td>
                  <td class="px-6 py-4 text-orange-500">★ {{ service.rating }}</td>
                  <td class="px-6 py-4 text-right"><span class="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">上架中</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Orders Tab -->
        <div v-if="currentTab === 'orders'" class="space-y-6">
          <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table class="w-full text-sm text-left">
              <thead class="bg-gray-50 text-gray-500">
                <tr>
                  <th class="px-6 py-3">订单号</th>
                  <th class="px-6 py-3">用户</th>
                  <th class="px-6 py-3">商品/服务</th>
                  <th class="px-6 py-3">金额</th>
                  <th class="px-6 py-3">时间</th>
                  <th class="px-6 py-3 text-right">状态</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="order in orders" :key="order.id">
                  <td class="px-6 py-4 font-mono text-gray-500">{{ order.id }}</td>
                  <td class="px-6 py-4">{{ order.user }}</td>
                  <td class="px-6 py-4">{{ order.item }}</td>
                  <td class="px-6 py-4 font-medium">¥{{ order.amount }}</td>
                  <td class="px-6 py-4 text-gray-500">{{ order.date }}</td>
                  <td class="px-6 py-4 text-right">
                    <span :class="getStatusColor(order.status)" class="px-2 py-1 rounded-full text-xs font-medium uppercase">{{ order.status }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- System Tab (Maintenance) -->
        <div v-if="currentTab === 'system'" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white p-6 rounded-xl border border-gray-200">
              <h3 class="font-bold text-gray-800 mb-4">服务器状态</h3>
              <div class="space-y-4">
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-600">CPU Usage</span>
                    <span class="font-bold text-gray-900">{{ systemStatus.cpu }}%</span>
                  </div>
                  <div class="w-full bg-gray-100 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full" :style="{ width: systemStatus.cpu + '%' }"></div>
                  </div>
                </div>
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-600">Memory Usage</span>
                    <span class="font-bold text-gray-900">{{ systemStatus.memory }}%</span>
                  </div>
                  <div class="w-full bg-gray-100 rounded-full h-2">
                    <div class="bg-purple-600 h-2 rounded-full" :style="{ width: systemStatus.memory + '%' }"></div>
                  </div>
                </div>
                <div class="flex justify-between text-sm pt-2 border-t border-gray-100">
                  <span class="text-gray-500">Database Connections</span>
                  <span class="font-mono text-gray-900">{{ systemStatus.dbConnections }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">Last Backup</span>
                  <span class="font-mono text-gray-900">{{ systemStatus.lastBackup }}</span>
                </div>
              </div>
            </div>

            <div class="bg-black text-green-400 p-6 rounded-xl font-mono text-xs overflow-hidden flex flex-col h-64">
              <div class="border-b border-gray-800 pb-2 mb-2 text-gray-500">System Logs</div>
              <div class="flex-1 overflow-y-auto space-y-1">
                <div v-for="(log, i) in systemLogs" :key="i">
                  <span class="text-gray-500">[{{ log.time }}]</span>
                  <span :class="log.level === 'WARN' ? 'text-yellow-500' : 'text-green-500'">{{ log.level }}</span>:
                  {{ log.msg }}
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  </div>
</template>