<script setup>
import { computed, onMounted, ref } from 'vue';
import { useOrderStore } from '../../store/order';
import { useUserProfile } from '../../store/userProfile';
import { useToast } from '../../composables/useToast';
import { MakerService } from '../../services/api';
import ServiceWizard from './ServiceWizard.vue';

const orderStore = useOrderStore();
const { userProfile } = useUserProfile();
const { show: showToast } = useToast();

const showServiceWizard = ref(false);
const dashboardStats = ref({
  earnings: 0,
  views: 0,
  orders: 0
});

const activeTasks = ref([
  { id: 1, title: '完善作品封面与核心卖点', reward: '50 EXP', status: 'completed' },
  { id: 2, title: '补齐发货说明与售后规则', reward: '100 EXP', status: 'pending' },
  { id: 3, title: '完成 5 次买家互动回复', reward: '曝光加权', status: 'pending' }
]);

const opportunities = ref([
  {
    id: 'opp-1',
    title: '校园礼物定制需求，偏向 3D 打印与个性化包装',
    matchScore: 98,
    tags: ['3D 打印', '定制礼物'],
    budget: '¥3,000',
    deadline: '7 天内'
  },
  {
    id: 'opp-2',
    title: '宠物用品小批量验证，需要快速出样与材料建议',
    matchScore: 92,
    tags: ['打样', 'ABS 材质'],
    budget: '¥800',
    deadline: '3 天内'
  }
]);

const handleQrScan = () => {
  const code = window.prompt('输入线下核销码', 'VERIFY-123');

  if (code === 'VERIFY-123') {
    showToast('核销成功。', 'success');
  } else if (code) {
    showToast('核销码无效。', 'error');
  }
};

const handleAiGenerate = () => {
  const confirmed = window.confirm('使用 AI 帮你生成一份新的服务草案吗？');
  if (!confirmed) {
    return;
  }

  showToast('AI 正在整理方案...', 'info');
  setTimeout(() => {
    showServiceWizard.value = true;
  }, 900);
};

const formatAmount = (value) => `¥${Number(value || 0).toFixed(2)}`;

const formatStatus = (value) => {
  switch (value) {
    case 'pending':
      return '待确认';
    case 'paid':
      return '待发货';
    case 'shipped':
      return '已发货';
    case 'completed':
      return '已完成';
    default:
      return value || '未知';
  }
};

const recentOrders = computed(() =>
  orderStore.orders
    .map((order) => ({
      id: order.id,
      item:
        order.items?.[0]?.title ||
        order.items?.[0]?.name ||
        order.items?.[0]?.serviceTitle ||
        (order.serviceId ? `服务 ${order.serviceId}` : '未命名服务'),
      buyer: order.buyer?.username || '匿名买家',
      amount: Number(order.amount || 0),
      status: order.status,
      time: order.createdAt
        ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '刚刚'
    }))
    .slice(0, 5)
);

onMounted(async () => {
  void orderStore.fetchMakerOrders();

  try {
    const stats = await MakerService.getDashboardStats();
    dashboardStats.value = {
      earnings: Number(stats?.earnings || 0),
      views: Number(stats?.views || 0),
      orders: Number(stats?.orders || 0)
    };
  } catch (error) {
    console.error('Failed to fetch dashboard stats', error);
  }
});
</script>

<template>
  <div class="space-y-8 text-slate-900 transition-colors duration-500 dark:text-white">
    <section class="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.02] dark:shadow-[0_24px_70px_rgba(0,0,0,0.35)] dark:backdrop-blur-xl">
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(15,23,42,0.08),_transparent_28%),linear-gradient(135deg,rgba(148,163,184,0.12),transparent_38%,transparent_72%,rgba(15,23,42,0.06))] dark:bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,transparent_72%,rgba(255,255,255,0.02))]"></div>
      <div class="relative z-10">
        <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-400 dark:text-slate-500">Maker Control</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">
          欢迎回来，{{ userProfile.userInfo.name }}
        </h1>
        <p class="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
          在同一套自适应主题里管理收益、接单和服务发布，亮色与暗色模式都会保持稳定层次。
        </p>

        <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.03] dark:shadow-none">
            <p class="text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">累计收入</p>
            <p class="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{{ formatAmount(dashboardStats.earnings) }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.03] dark:shadow-none">
            <p class="text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">累计浏览</p>
            <p class="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{{ dashboardStats.views }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.03] dark:shadow-none">
            <p class="text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">订单总数</p>
            <p class="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{{ dashboardStats.orders }}</p>
          </div>
        </div>
      </div>
    </section>

    <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div class="space-y-8 lg:col-span-2">
        <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors duration-500 dark:border-white/5 dark:bg-white/[0.02] dark:backdrop-blur-xl">
          <div class="mb-6 flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold text-slate-900 dark:text-white">AI 机会池</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">系统根据你的作品类型给出更匹配的订单方向。</p>
            </div>
            <button class="text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              查看全部
            </button>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div
              v-for="opportunity in opportunities"
              :key="opportunity.id"
              class="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-slate-300 dark:border-white/5 dark:bg-white/[0.03] dark:hover:border-white/10"
            >
              <div class="mb-3 flex items-start justify-between gap-3">
                <span class="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white dark:bg-white dark:text-black">
                  {{ opportunity.matchScore }}% match
                </span>
                <span class="text-xs text-slate-400 dark:text-slate-500">{{ opportunity.deadline }}</span>
              </div>
              <h3 class="text-base font-semibold text-slate-900 dark:text-white">{{ opportunity.title }}</h3>
              <div class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="tag in opportunity.tags"
                  :key="tag"
                  class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-400"
                >
                  {{ tag }}
                </span>
              </div>
              <div class="mt-4 flex items-end justify-between border-t border-slate-200 pt-3 dark:border-white/5">
                <span class="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">预算</span>
                <span class="text-lg font-semibold text-slate-900 dark:text-white">{{ opportunity.budget }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors duration-500 dark:border-white/5 dark:bg-white/[0.02] dark:backdrop-blur-xl">
          <div class="mb-6 flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold text-slate-900 dark:text-white">任务推进</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">完成高优任务会提高曝光和转化。</p>
            </div>
            <span class="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white dark:bg-white dark:text-black">
              In Progress
            </span>
          </div>

          <div class="space-y-3">
            <div
              v-for="task in activeTasks"
              :key="task.id"
              class="flex items-center justify-between rounded-2xl border p-4 transition-colors"
              :class="
                task.status === 'completed'
                  ? 'border-slate-200 bg-slate-50 opacity-75 dark:border-white/5 dark:bg-white/[0.02]'
                  : 'border-slate-200 bg-white dark:border-white/5 dark:bg-white/[0.03]'
              "
            >
              <div class="flex items-center gap-3">
                <div
                  class="flex h-6 w-6 items-center justify-center rounded-full text-[11px]"
                  :class="
                    task.status === 'completed'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                      : 'border border-slate-300 text-transparent dark:border-white/20'
                  "
                >
                  ✓
                </div>
                <span class="font-medium text-slate-700 dark:text-slate-300" :class="{ 'line-through': task.status === 'completed' }">
                  {{ task.title }}
                </span>
              </div>
              <span class="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-300">
                {{ task.reward }}
              </span>
            </div>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors duration-500 dark:border-white/5 dark:bg-white/[0.02] dark:backdrop-blur-xl">
          <div class="mb-6 flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold text-slate-900 dark:text-white">最近订单</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">最新订单会同步到这个概览区。</p>
            </div>
            <button class="text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              查看全部
            </button>
          </div>

          <div class="space-y-4">
            <div
              v-for="order in recentOrders"
              :key="order.id"
              class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between dark:border-white/5 dark:bg-white/[0.03]"
            >
              <div class="flex items-center gap-4">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white dark:bg-white dark:text-black">
                  {{ order.item.slice(0, 1) }}
                </div>
                <div>
                  <div class="font-semibold text-slate-900 dark:text-white">{{ order.item }}</div>
                  <div class="text-xs text-slate-500 dark:text-slate-400">买家：{{ order.buyer }} · {{ order.time }}</div>
                </div>
              </div>
              <div class="text-right">
                <div class="font-semibold text-slate-900 dark:text-white">+{{ formatAmount(order.amount) }}</div>
                <div class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  {{ formatStatus(order.status) }}
                </div>
              </div>
            </div>

            <div
              v-if="recentOrders.length === 0"
              class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400"
            >
              暂无订单记录
            </div>
          </div>
        </section>
      </div>

      <div class="space-y-8">
        <div class="grid grid-cols-2 gap-4">
          <button
            type="button"
            class="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:shadow-md dark:border-white/5 dark:bg-white/[0.02] dark:backdrop-blur-xl"
            @click="showServiceWizard = true"
          >
            <div class="mb-2 text-3xl">+</div>
            <div class="font-semibold text-slate-900 dark:text-white">发布服务</div>
            <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">用 AI 或手动创建新的商品页</div>
          </button>

          <button
            type="button"
            class="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:shadow-md dark:border-white/5 dark:bg-white/[0.02] dark:backdrop-blur-xl"
            @click="handleQrScan"
          >
            <div class="mb-2 text-3xl">#</div>
            <div class="font-semibold text-slate-900 dark:text-white">扫码核销</div>
            <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">用于线下交付或到店验证</div>
          </button>
        </div>

        <section class="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.02] dark:shadow-[0_24px_70px_rgba(0,0,0,0.35)] dark:backdrop-blur-xl">
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.04),transparent_38%)] dark:bg-[radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.06),_transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_38%)]"></div>
          <div class="relative">
            <h3 class="mb-2 text-lg font-semibold text-slate-900 dark:text-white">AI 助手建议</h3>
            <p class="mb-4 text-sm leading-7 text-slate-500 dark:text-slate-400">
              你的最近订单偏向礼物定制。建议优先补齐发货周期、材质说明和可选包装，以提高转化率。
            </p>
            <button
              type="button"
              class="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100"
              @click="handleAiGenerate"
            >
              生成新服务草案
            </button>
          </div>
        </section>
      </div>
    </div>

    <ServiceWizard
      v-if="showServiceWizard"
      @close="showServiceWizard = false"
      @success="orderStore.fetchMakerOrders()"
    />
  </div>
</template>
