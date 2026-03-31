<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { AuthService } from '../services/api';
import { useToast } from '../composables/useToast';
import gsap from 'gsap';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { RadarChart } from 'echarts/charts';
import { GridComponent, LegendComponent, PolarComponent, TooltipComponent } from 'echarts/components';
import VChart from 'vue-echarts';

use([CanvasRenderer, RadarChart, GridComponent, LegendComponent, PolarComponent, TooltipComponent]);

const { t } = useI18n();
const router = useRouter();
const { show: showToast } = useToast();

const dashboardRoot = ref(null);
const isLoading = ref(true);
const accessDenied = ref(false);

const metrics = reactive({
  financing: 0,
  projects: 0,
  coaches: 0,
  growth: 0
});

const metricTargets = {
  financing: 92340000,
  projects: 432,
  coaches: 1260,
  growth: 38.6
};

const sectorSignals = computed(() => [
  { key: 'embodiedAi', name: t('investor.sectors.embodiedAi'), value: 94 },
  { key: 'petTech', name: t('investor.sectors.petTech'), value: 88 },
  { key: 'eduRobotics', name: t('investor.sectors.eduRobotics'), value: 91 },
  { key: 'custom3d', name: t('investor.sectors.custom3d'), value: 86 },
  { key: 'coachSaas', name: t('investor.sectors.coachSaas'), value: 82 },
  { key: 'creatorCommerce', name: t('investor.sectors.creatorCommerce'), value: 89 }
]);

const makerRanking = computed(() => [
  { key: 'nova', name: t('investor.makers.nova'), lane: t('investor.sectors.custom3d'), amount: 1284000, orders: 312, glow: 'from-indigo-500/30 to-fuchsia-500/10' },
  { key: 'astra', name: t('investor.makers.astra'), lane: t('investor.sectors.coachSaas'), amount: 1108000, orders: 274, glow: 'from-cyan-400/25 to-indigo-500/10' },
  { key: 'petOrbit', name: t('investor.makers.petOrbit'), lane: t('investor.sectors.petTech'), amount: 964000, orders: 251, glow: 'from-fuchsia-500/25 to-pink-500/10' },
  { key: 'signal', name: t('investor.makers.signal'), lane: t('investor.sectors.eduRobotics'), amount: 902000, orders: 238, glow: 'from-amber-300/20 to-indigo-500/10' },
  { key: 'deepHarbor', name: t('investor.makers.deepHarbor'), lane: t('investor.sectors.embodiedAi'), amount: 848000, orders: 219, glow: 'from-indigo-500/20 to-cyan-400/10' },
  { key: 'northStar', name: t('investor.makers.northStar'), lane: t('investor.sectors.creatorCommerce'), amount: 796000, orders: 205, glow: 'from-violet-500/25 to-indigo-500/10' }
]);

const duplicatedRanking = computed(() => [...makerRanking.value, ...makerRanking.value]);

const radarOption = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(10, 10, 12, 0.92)',
    borderColor: 'rgba(255,255,255,0.08)',
    textStyle: { color: '#ffffff' }
  },
  radar: {
    radius: '68%',
    splitNumber: 5,
    axisName: {
      color: 'rgba(226,232,240,0.9)',
      fontSize: 12,
      fontWeight: 600
    },
    splitArea: {
      areaStyle: {
        color: ['rgba(255,255,255,0.015)', 'rgba(255,255,255,0.025)']
      }
    },
    splitLine: {
      lineStyle: {
        color: 'rgba(255,255,255,0.08)'
      }
    },
    axisLine: {
      lineStyle: {
        color: 'rgba(255,255,255,0.08)'
      }
    },
    indicator: sectorSignals.value.map((item) => ({ name: item.name, max: 100 }))
  },
  series: [
    {
      type: 'radar',
      symbol: 'circle',
      symbolSize: 7,
      lineStyle: {
        width: 2.5,
        color: '#8b5cf6'
      },
      itemStyle: {
        color: '#ffffff',
        borderColor: '#a855f7',
        borderWidth: 2
      },
      areaStyle: {
        color: 'rgba(99,102,241,0.26)'
      },
      data: [
        {
          value: sectorSignals.value.map((item) => item.value),
          name: t('investor.radar.series')
        }
      ]
    }
  ]
}));

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `\u00A5 ${amount.toLocaleString('en-US')}`;
};

const formatCompactCurrency = (value) => {
  const amount = Number(value || 0);
  if (amount >= 1000000) {
    return `\u00A5${(amount / 1000000).toFixed(2)}M`;
  }
  if (amount >= 1000) {
    return `\u00A5${(amount / 1000).toFixed(0)}K`;
  }
  return `\u00A5${amount}`;
};

const growthLabel = computed(() => `+${metrics.growth.toFixed(1)}%`);

let animationContext = null;

const initAnimations = () => {
  if (!dashboardRoot.value) {
    return;
  }

  animationContext = gsap.context(() => {
    gsap.fromTo(
      '.dashboard-panel',
      { opacity: 0, y: 42, filter: 'blur(10px)' },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 1,
        ease: 'power3.out',
        stagger: 0.08
      }
    );

    gsap.to(metrics, { financing: metricTargets.financing, duration: 2.4, ease: 'power2.out', roundProps: 'financing' });
    gsap.to(metrics, { projects: metricTargets.projects, duration: 1.9, ease: 'power2.out', roundProps: 'projects' });
    gsap.to(metrics, { coaches: metricTargets.coaches, duration: 2.1, ease: 'power2.out', roundProps: 'coaches' });
    gsap.to(metrics, { growth: metricTargets.growth, duration: 2.2, ease: 'power2.out' });

    gsap.to('.orbital-core', {
      y: -10,
      duration: 3.4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }, dashboardRoot.value);
};

onMounted(async () => {
  try {
    await AuthService.getInvestorStats();
  } catch (error) {
    const msg = error?.message || '';
    if (msg.includes('权限被拒绝') || error?.status === 403 || error?.response?.status === 403 || error?.response?.status === 404) {
      accessDenied.value = true;
      showToast('访问被拒绝：需要管理权限', 'error');
      return;
    }
  } finally {
    isLoading.value = false;
  }

  await nextTick();
  if (!accessDenied.value) {
    initAnimations();
  }
});

onBeforeUnmount(() => {
  if (animationContext) {
    animationContext.revert();
    animationContext = null;
  }
});
</script>

<template>
  <div
    ref="dashboardRoot"
    class="min-h-screen overflow-hidden bg-[#06070a] px-4 pb-14 pt-24 text-white sm:px-6 lg:px-8"
  >
    <div class="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,_rgba(99,102,241,0.16),_transparent_18%),radial-gradient(circle_at_82%_16%,_rgba(217,70,239,0.12),_transparent_14%),radial-gradient(circle_at_52%_52%,_rgba(245,158,11,0.05),_transparent_26%),linear-gradient(180deg,#040507_0%,#07080d_52%,#05060a_100%)]"></div>
    <div class="pointer-events-none fixed inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

    <div v-if="isLoading" class="flex min-h-[50vh] items-center justify-center">
      <p class="animate-pulse text-white/50">安全握手与权限校验中...</p>
    </div>

    <div v-else-if="accessDenied" class="mx-auto max-w-2xl mt-20 rounded-[2rem] border border-rose-500/20 bg-rose-500/10 p-12 text-center backdrop-blur-2xl">
      <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/20">
        <svg class="h-10 w-10 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      </div>
      <h2 class="text-3xl font-bold tracking-tight text-white mb-3">无权访问 (403 Forbidden)</h2>
      <p class="text-rose-200/60 mb-8 leading-relaxed">您的账号未被授予管理员或投资人权限身份。<br>由于当前看板涉及核心商业敏感数据，系统已熔断渲染。</p>
      <button @click="router.push('/')" class="rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition hover:bg-white/90">
        返回安全主页
      </button>
    </div>

    <div v-else class="mx-auto max-w-[1600px] space-y-8">
      <section class="dashboard-panel relative overflow-hidden rounded-[2.5rem] border border-white/8 bg-white/[0.025] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,_rgba(255,255,255,0.05),_transparent_18%),linear-gradient(135deg,rgba(99,102,241,0.08),transparent_32%,transparent_68%,rgba(217,70,239,0.06))]"></div>
        <div class="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="text-[11px] font-semibold uppercase tracking-[0.38em] text-slate-500">{{ $t('investor.hero.eyebrow') }}</p>
            <h1 class="mt-4 text-5xl font-black tracking-[-0.07em] text-transparent sm:text-6xl lg:text-7xl">
              <span class="bg-gradient-to-br from-white via-white to-white/45 bg-clip-text">{{ $t('investor.hero.title') }}</span>
            </h1>
            <p class="mt-5 max-w-2xl text-sm leading-8 text-slate-300 sm:text-base">
              {{ $t('investor.hero.description') }}
            </p>
          </div>

          <div class="orbital-core relative mx-auto h-48 w-48 shrink-0 sm:h-56 sm:w-56 xl:mx-0">
            <div class="absolute inset-0 rounded-full border border-white/10"></div>
            <div class="absolute inset-3 rounded-full border border-indigo-400/20"></div>
            <div class="absolute inset-6 rounded-full border border-fuchsia-400/15"></div>
            <div class="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_35%,_rgba(255,255,255,0.16),_transparent_26%),radial-gradient(circle_at_70%_70%,_rgba(99,102,241,0.18),_transparent_32%)] blur-md"></div>
            <div class="absolute inset-[28%] rounded-full bg-gradient-to-br from-white via-slate-200 to-indigo-300 opacity-90"></div>
            <div class="absolute inset-[18%] rounded-full border border-white/10 animate-pulse"></div>
          </div>
        </div>

        <div class="relative z-10 mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-[2rem] border border-white/8 bg-black/25 p-5">
            <p class="text-[11px] uppercase tracking-[0.3em] text-slate-500">{{ $t('investor.metrics.financing') }}</p>
            <p class="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">{{ formatCurrency(metrics.financing) }}</p>
          </div>
          <div class="rounded-[2rem] border border-white/8 bg-black/25 p-5">
            <p class="text-[11px] uppercase tracking-[0.3em] text-slate-500">{{ $t('investor.metrics.projects') }}</p>
            <p class="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">{{ metrics.projects }}</p>
          </div>
          <div class="rounded-[2rem] border border-white/8 bg-black/25 p-5">
            <p class="text-[11px] uppercase tracking-[0.3em] text-slate-500">{{ $t('investor.metrics.coaches') }}</p>
            <p class="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">{{ metrics.coaches }}</p>
          </div>
          <div class="rounded-[2rem] border border-white/8 bg-black/25 p-5">
            <p class="text-[11px] uppercase tracking-[0.3em] text-slate-500">{{ $t('investor.metrics.growth') }}</p>
            <p class="mt-4 text-3xl font-semibold tracking-[-0.04em] text-transparent sm:text-4xl">
              <span class="bg-gradient-to-r from-amber-200 via-white to-indigo-200 bg-clip-text">{{ growthLabel }}</span>
            </p>
          </div>
        </div>
      </section>

      <section class="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div class="dashboard-panel rounded-[2.5rem] border border-white/8 bg-white/[0.025] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur-2xl sm:p-7">
          <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">{{ $t('investor.radar.eyebrow') }}</p>
              <h2 class="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">{{ $t('investor.radar.title') }}</h2>
            </div>
            <div class="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              {{ $t('investor.radar.badge') }}
            </div>
          </div>

          <div class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div class="h-[26rem] rounded-[2rem] border border-white/8 bg-black/25 p-3">
              <VChart :option="radarOption" autoresize class="h-full w-full" />
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div
                v-for="signal in sectorSignals"
                :key="signal.key"
                class="rounded-[1.6rem] border border-white/8 bg-black/25 p-4"
              >
                <p class="text-[11px] uppercase tracking-[0.24em] text-slate-500">{{ signal.name }}</p>
                <div class="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
                    :style="{ width: `${signal.value}%` }"
                  ></div>
                </div>
                <p class="mt-4 text-2xl font-semibold text-white">{{ signal.value }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="dashboard-panel rounded-[2.5rem] border border-white/8 bg-white/[0.025] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur-2xl sm:p-7">
          <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">{{ $t('investor.leaderboard.eyebrow') }}</p>
              <h2 class="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">{{ $t('investor.leaderboard.title') }}</h2>
            </div>
            <div class="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              {{ $t('investor.leaderboard.badge') }}
            </div>
          </div>

          <div class="relative h-[26rem] overflow-hidden rounded-[2rem] border border-white/8 bg-black/30">
            <div class="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-[#07080c] to-transparent"></div>
            <div class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-[#07080c] to-transparent"></div>
            <div class="leaderboard-scroll space-y-3 px-4 py-4">
              <div
                v-for="(maker, index) in duplicatedRanking"
                :key="`${maker.key}-${index}`"
                class="rounded-[1.4rem] border border-white/8 bg-gradient-to-r p-4 shadow-[0_12px_38px_rgba(0,0,0,0.24)]"
                :class="maker.glow"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p class="text-sm font-semibold text-white">{{ maker.name }}</p>
                    <p class="mt-1 text-xs uppercase tracking-[0.22em] text-slate-300">{{ maker.lane }}</p>
                  </div>
                  <div class="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                    {{ $t('investor.leaderboard.rank') }} {{ (index % makerRanking.length) + 1 }}
                  </div>
                </div>
                <div class="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p class="text-[11px] uppercase tracking-[0.22em] text-slate-400">{{ $t('investor.leaderboard.gmv') }}</p>
                    <p class="mt-2 text-2xl font-semibold text-white">{{ formatCompactCurrency(maker.amount) }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-[11px] uppercase tracking-[0.22em] text-slate-400">{{ $t('investor.leaderboard.orders') }}</p>
                    <p class="mt-2 text-xl font-semibold text-white">{{ maker.orders }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <div class="dashboard-panel rounded-[2.5rem] border border-white/8 bg-white/[0.025] p-6 backdrop-blur-2xl sm:p-7">
          <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">{{ $t('investor.routes.eyebrow') }}</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">{{ $t('investor.routes.title') }}</h2>
          <div class="mt-6 space-y-4">
            <div class="rounded-[1.8rem] border border-white/8 bg-black/25 p-5">
              <div class="flex items-center justify-between gap-4">
                <span class="text-sm font-semibold text-white">{{ $t('investor.routes.apac') }}</span>
                <span class="text-xs uppercase tracking-[0.2em] text-slate-400">{{ $t('investor.routes.apacShare') }}</span>
              </div>
              <div class="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                <div class="h-full w-[41%] rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"></div>
              </div>
            </div>
            <div class="rounded-[1.8rem] border border-white/8 bg-black/25 p-5">
              <div class="flex items-center justify-between gap-4">
                <span class="text-sm font-semibold text-white">{{ $t('investor.routes.na') }}</span>
                <span class="text-xs uppercase tracking-[0.2em] text-slate-400">{{ $t('investor.routes.naShare') }}</span>
              </div>
              <div class="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                <div class="h-full w-[33%] rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500"></div>
              </div>
            </div>
            <div class="rounded-[1.8rem] border border-white/8 bg-black/25 p-5">
              <div class="flex items-center justify-between gap-4">
                <span class="text-sm font-semibold text-white">{{ $t('investor.routes.eu') }}</span>
                <span class="text-xs uppercase tracking-[0.2em] text-slate-400">{{ $t('investor.routes.euShare') }}</span>
              </div>
              <div class="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                <div class="h-full w-[26%] rounded-full bg-gradient-to-r from-amber-300 to-fuchsia-500"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="dashboard-panel relative overflow-hidden rounded-[2.5rem] border border-white/8 bg-white/[0.025] p-6 backdrop-blur-2xl sm:p-7">
          <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(99,102,241,0.06),transparent_32%,transparent_70%,rgba(217,70,239,0.05))]"></div>
          <div class="relative z-10">
            <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">{{ $t('investor.narrative.eyebrow') }}</p>
            <h2 class="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">{{ $t('investor.narrative.title') }}</h2>
            <p class="mt-5 max-w-3xl text-sm leading-8 text-slate-300 sm:text-base">
              {{ $t('investor.narrative.body') }}
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.leaderboard-scroll {
  animation: leaderboardDrift 24s linear infinite;
}

@keyframes leaderboardDrift {
  0% {
    transform: translateY(0);
  }

  100% {
    transform: translateY(-50%);
  }
}
</style>
