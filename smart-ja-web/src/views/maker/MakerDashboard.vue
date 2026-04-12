<script setup>
import { computed, onMounted, ref } from 'vue';
import { useOrderStore } from '../../store/order';
import { useUserProfile } from '../../store/userProfile';
import { useToast } from '../../composables/useToast';
import { MakerService, MarketService } from '../../services/api';
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

const activeTasks = computed(() => {
  const tasks = [];
  const pendingOrders = orderStore.orders.filter(o => o.status === 'paid').length;
  if (pendingOrders > 0) {
    tasks.push({ id: 1, title: `处理 ${pendingOrders} 笔待发货订单`, reward: '提升履约率', status: 'pending' });
  } else {
    tasks.push({ id: 1, title: '保持及时的发货表现', reward: '维持高分', status: 'completed' });
  }

  if (!userProfile.userInfo.sign) {
    tasks.push({ id: 2, title: '完善个人签名与介绍', reward: '增加关注度', status: 'pending' });
  } else {
    tasks.push({ id: 2, title: '个人资料已完善', reward: '展示加权', status: 'completed' });
  }

  if (dashboardStats.value.earnings > 0 || dashboardStats.value.orders > 0) {
     tasks.push({ id: 3, title: '稳步推进营收目标', reward: '等级经验', status: 'completed' });
  } else {
     tasks.push({ id: 3, title: '发布服务并争取首单', reward: '曝光支持', status: 'pending' });
  }
  return tasks;
});

const opportunities = ref([]);
const aiSuggestion = computed(() => {
  if (dashboardStats.value.orders > 0 && dashboardStats.value.earnings > 0) {
    return '您的服务正受到市场欢迎！建议根据近期爆款方向，通过 AI 导师孵化更多垂直维度的配套服务。';
  } else if (dashboardStats.value.views > 0) {
    return '您的服务已经产生真实浏览但转化率有待提升，建议利用 AI 重构商品详情与价格阶梯。';
  } else {
    return '全新启程！不妨立刻使用 AI 导师深入挖掘创意，通过对话一键生成符合市场真实需求的服务。';
  }
});

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

  try {
    const featured = await MarketService.getFeaturedServices();
    opportunities.value = featured.slice(0, 2).map((item, index) => ({
      id: item.id,
      title: item.title,
      matches: index === 0 ? '热卖榜一' : '优质主推',
      tags: item.tags || ['精选'],
      price: formatAmount(item.price),
      views: item.views + ' 浏览'
    }));
  } catch (error) {
    console.error('Failed to load opportunities:', error);
  }
});
</script>

<template>
  <div class="space-y-8 text-slate-900 transition-colors duration-500 dark:text-white">
    <section class="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/50 backdrop-blur-3xl p-8 shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.02] dark:shadow-[0_24px_70px_rgba(0,0,0,0.35)] dark:backdrop-blur-xl">
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(15,23,42,0.08),_transparent_28%),linear-gradient(135deg,rgba(148,163,184,0.12),transparent_38%,transparent_72%,rgba(15,23,42,0.06))] dark:bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,transparent_72%,rgba(255,255,255,0.02))]"></div>
      <div class="relative z-10">
        <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-700 dark:text-slate-400">Maker Control</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">
          欢迎回来，{{ userProfile.userInfo.name }}
        </h1>
        <p class="mt-2 text-sm leading-7 text-slate-800 dark:text-slate-300">
          在同一套自适应主题里管理收益、接单和服务发布，亮色与暗色模式都会保持稳定层次。
        </p>

        <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.03] dark:shadow-none">
            <p class="text-[11px] uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">累计收入</p>
            <p class="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{{ formatAmount(dashboardStats.earnings) }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.03] dark:shadow-none">
            <p class="text-[11px] uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">累计浏览</p>
            <p class="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{{ dashboardStats.views }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.03] dark:shadow-none">
            <p class="text-[11px] uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">订单总数</p>
            <p class="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{{ dashboardStats.orders }}</p>
          </div>
        </div>
      </div>
    </section>

    <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div class="space-y-8 lg:col-span-2">
        <section class="rounded-3xl border border-slate-200 bg-white/50 backdrop-blur-3xl p-6 shadow-sm transition-colors duration-500 dark:border-white/5 dark:bg-white/[0.02] dark:backdrop-blur-xl">
          <div class="mb-6 flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold text-slate-900 dark:text-white">市场风向标</h2>
              <p class="mt-1 text-sm text-slate-700 dark:text-slate-300">系统根据全平台真实数据提炼的优质服务趋势。</p>
            </div>
            <button class="text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" @click="$router.push('/market')">
              前往市场
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
                  {{ opportunity.matches }}
                </span>
                <span class="text-xs text-slate-600 dark:text-slate-400">{{ opportunity.views }}</span>
              </div>
              <h3 class="text-base font-semibold text-slate-900 dark:text-white line-clamp-2" :title="opportunity.title">{{ opportunity.title }}</h3>
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
                <span class="text-xs uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400">行情价</span>
                <span class="text-lg font-semibold text-slate-900 dark:text-white">{{ opportunity.price }}</span>
              </div>
            </div>
            <div v-if="opportunities.length === 0" class="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
              数据汇聚中...
            </div>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white/50 backdrop-blur-3xl p-6 shadow-sm transition-colors duration-500 dark:border-white/5 dark:bg-white/[0.02] dark:backdrop-blur-xl">
          <div class="mb-6 flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold text-slate-900 dark:text-white">任务推进</h2>
              <p class="mt-1 text-sm text-slate-700 dark:text-slate-300">完成高优任务会提高曝光和转化。</p>
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
              <p class="mt-1 text-sm text-slate-700 dark:text-slate-300">最新订单会同步到这个概览区。</p>
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
                  <div class="text-xs text-slate-700 dark:text-slate-300">买家：{{ order.buyer }} · {{ order.time }}</div>
                </div>
              </div>
              <div class="text-right">
                <div class="font-semibold text-slate-900 dark:text-white">+{{ formatAmount(order.amount) }}</div>
                <div class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">
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
            <div class="mt-1 text-xs text-slate-700 dark:text-slate-300">用 AI 或手动创建新的商品页</div>
          </button>

          <button
            type="button"
            class="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:shadow-md dark:border-white/5 dark:bg-white/[0.02] dark:backdrop-blur-xl"
            @click="handleQrScan"
          >
            <div class="mb-2 text-3xl">#</div>
            <div class="font-semibold text-slate-900 dark:text-white">扫码核销</div>
            <div class="mt-1 text-xs text-slate-700 dark:text-slate-300">用于线下交付或到店验证</div>
          </button>
        </div>

        <section class="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.02] dark:shadow-[0_24px_70px_rgba(0,0,0,0.35)] dark:backdrop-blur-xl">
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.04),transparent_38%)] dark:bg-[radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.06),_transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_38%)]"></div>
          <div class="relative">
            <h3 class="mb-2 text-lg font-semibold text-slate-900 dark:text-white">AI 助手建议</h3>
            <p class="mb-4 text-sm leading-7 text-slate-700 dark:text-slate-300">
              {{ aiSuggestion }}
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
