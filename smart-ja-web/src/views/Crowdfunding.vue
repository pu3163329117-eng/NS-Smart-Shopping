<script setup>
import { onMounted, ref, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import gsap from 'gsap';
import { useToast } from '../composables/useToast';
import { evaluateProject, analyzeProjectNeeds } from '../services/aiService';
import { MarketService, CrowdfundingService } from '../services/api';

const { show } = useToast();
const selectedOrg = ref(null);
const activeTab = ref('story');
const customAmount = ref('');
const isAnalyzing = ref(false);
const isMatching = ref(false);
const projectNeeds = ref({ needs: [], keywords: [] });
const recommendedMakers = ref([]);

const organizations = ref([]);

const fetchProjects = async () => {
  try {
    const response = await CrowdfundingService.getProjects();
    const projects = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : [];

    organizations.value = projects.map((p) => ({
      ...p,
      name: p.title,
      subtitle: p.type === 'crowdfunding' ? t('crowdfunding.subtitle') : '',
      goalAmount: p.fundingGoal || 10000,
      raisedAmount: p.pledgedAmount || 0,
      backerCount: p.backersCount || 0,
      daysLeft: Number.isFinite(Number(p.daysLeft)) ? Number(p.daysLeft) : 12, // fallback for demo
      verified: true,
      exclusive: true,
      coverImage: p.image || 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      tiers: [
        { id: 1, amount: 99, title: 'Support', desc: 'Digital thank-you note and weekly updates.' },
        { id: 2, amount: 299, title: 'Angel', desc: 'Printed certificate and priority access to roadshow replay.' },
        { id: 3, amount: 999, title: 'Partner', desc: 'Limited partner gift and annual recognition.' }
      ],
      aiAnalysis: { innovation: 92, socialImpact: 98, feasibility: 88, comment: p.description }
    }));
  } catch (err) {
    console.error('Failed to fetch crowdfunding projects', err);
  }
};

const selectOrg = async (org) => {
  selectedOrg.value = org;
  activeTab.value = 'story';
  recommendedMakers.value = [];
  projectNeeds.value = { needs: [], keywords: [] };

  isAnalyzing.value = true;
  isMatching.value = true;

  try {
    const evaluatePromise = evaluateProject(org);
    const matchPromise = (async () => {
      const needsResult = await analyzeProjectNeeds(org.description);
      projectNeeds.value = needsResult;

      const allServicesResponse = await MarketService.getAllServices();
      const allServices = Array.isArray(allServicesResponse?.data)
        ? allServicesResponse.data
        : Array.isArray(allServicesResponse)
          ? allServicesResponse
          : [];
      const matched = allServices
        .filter((service) => {
          if (needsResult.needs.includes(service.type)) {
            return true;
          }

          if (Array.isArray(service.tags) && service.tags.some((tag) => needsResult.keywords.includes(tag))) {
            return true;
          }

          return false;
        })
        .slice(0, 3);

      recommendedMakers.value = matched;
    })();

    const [aiResult] = await Promise.all([evaluatePromise, matchPromise]);

    if (aiResult) {
      Object.assign(selectedOrg.value.aiAnalysis, aiResult);
    }
  } catch (error) {
    console.error('AI analysis or matching failed', error);
  } finally {
    isAnalyzing.value = false;
    isMatching.value = false;
  }

  nextTick(() => {
    const detailEl = document.querySelector('.detail-view');
    if (detailEl) {
      gsap.from(detailEl, { opacity: 0, y: 30, duration: 0.5, ease: 'power2.out' });
    }
  });
};

const backToList = () => {
  const detailEl = document.querySelector('.detail-view');
  if (detailEl) {
    gsap.to(detailEl, {
      opacity: 0,
      y: -20,
      duration: 0.3,
      onComplete: () => {
        selectedOrg.value = null;
        nextTick(() => initListAnimation());
      }
    });
  } else {
    selectedOrg.value = null;
    nextTick(() => initListAnimation());
  }
};

const bookRoadshow = async () => {
  try {
    await CrowdfundingService.apply({
      roadshow: true,
      projectId: selectedOrg.value?.id,
      title: `Roadshow Booking: ${selectedOrg.value?.name}`
    });
    show(t('crowdfunding.toast.roadshowSuccess'), 'success');
  } catch (err) {
    show(t('crowdfunding.toast.genericError'), 'error');
  }
};

const handleApplyProject = async () => {
  try {
    await CrowdfundingService.apply({
      roadshow: false,
      title: 'New Crowdfunding Project Application'
    });
    show(t('crowdfunding.toast.applySuccess'), 'success');
  } catch (err) {
    show(t('crowdfunding.toast.genericError'), 'error');
  }
};

const supportOrg = async (tier) => {
  try {
    await CrowdfundingService.supportProject(selectedOrg.value.id, {
      amount: tier.amount,
      tierId: tier.id 
    });
    show(t('crowdfunding.toast.supportSuccess', { amount: tier.amount }), 'success');
    // Refresh project data
    const updated = organizations.value.find(o => o.id === selectedOrg.value.id);
    if (updated) {
      updated.raisedAmount += tier.amount;
      updated.backerCount += 1;
    }
  } catch (err) {
    if (err.response?.status === 402) {
      show(t('walletModal.feedback.insufficientBalance'), 'error');
    } else {
      show(t('crowdfunding.toast.paymentFailed'), 'error');
    }
  }
};

const handleCustomSupport = async () => {
  if (!customAmount.value || Number(customAmount.value) <= 0) {
    show('Please enter a valid support amount.', 'warning');
    return;
  }

  try {
    const amount = Number(customAmount.value);
    await CrowdfundingService.supportProject(selectedOrg.value.id, { amount });
    show(t('crowdfunding.toast.supportSuccess', { amount }), 'success');
    
    const updated = organizations.value.find(o => o.id === selectedOrg.value.id);
    if (updated) {
      updated.raisedAmount += amount;
      updated.backerCount += 1;
    }
    customAmount.value = '';
  } catch (err) {
    show(t('crowdfunding.toast.paymentFailed'), 'error');
  }
};

const handleCardMouseMove = (event, index) => {
  const card = document.getElementById(`org-card-${index}`);
  if (!card) {
    return;
  }

  const rect = card.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  const rotateX = ((y - centerY) / centerY) * -5;
  const rotateY = ((x - centerX) / centerX) * 5;

  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
};

const handleCardMouseLeave = (index) => {
  const card = document.getElementById(`org-card-${index}`);
  if (!card) {
    return;
  }

  card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};

const initListAnimation = () => {
  const cards = document.querySelectorAll('.org-card-item');
  if (cards.length > 0) {
    gsap.set(cards, { opacity: 0, y: 50 });
    gsap.to(cards, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.15 });
  }
};

onMounted(() => {
  fetchProjects();
  nextTick(() => initListAnimation());
});

const calculateProgress = (raised, goal) => {
  const progress = Math.min((raised / goal) * 100, 100);
  return progress.toFixed(1);
};
</script>

<template>
  <div class="min-h-screen bg-[#050505] pb-20 pt-24 text-white">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="pointer-events-none absolute inset-x-0 top-24 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

      <div v-if="!selectedOrg" class="hero-section mb-14 text-center">
        <p class="mb-4 text-[11px] font-semibold uppercase tracking-[0.42em] text-slate-400">{{ $t('crowdfunding.eyebrow') }}</p>
        <h1 class="mb-4 bg-gradient-to-br from-white to-white/40 bg-clip-text text-5xl font-medium tracking-tighter text-transparent md:text-7xl">
          {{ $t('crowdfunding.title') }}
        </h1>
        <p class="mx-auto mb-6 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
          {{ $t('crowdfunding.subtitle') }}
        </p>
      </div>

      <div v-if="!selectedOrg" class="list-view mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="(org, index) in organizations"
          :key="org.id"
          :id="`org-card-${index}`"
          class="org-card-item group flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md transition-all duration-300 ease-out hover:border-white/10 hover:bg-white/[0.04] will-change-transform"
          @click="selectOrg(org)"
          @mousemove="(event) => handleCardMouseMove(event, index)"
          @mouseleave="() => handleCardMouseLeave(index)"
        >
          <div class="relative h-52 overflow-hidden">
            <img :src="org.coverImage" :alt="org.name" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105">
            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent"></div>
            <div class="absolute right-4 top-4 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-md">
              {{ org.daysLeft > 0 ? $t('crowdfunding.daysLeft', { days: org.daysLeft }) : $t('crowdfunding.closed') }}
            </div>
          </div>

          <div class="flex flex-1 flex-col p-6">
            <div class="mb-3 flex items-start justify-between gap-3">
              <h3 class="line-clamp-1 text-xl font-semibold text-white">{{ org.name }}</h3>
              <div class="flex gap-2">
                <span
                  v-if="org.exclusive"
                  class="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white"
                >
                  {{ $t('crowdfunding.exclusive') }}
                </span>
                <span v-if="org.verified" class="text-white/80">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </span>
              </div>
            </div>

            <p class="mb-5 line-clamp-3 min-h-[64px] text-sm leading-7 text-slate-400">{{ org.description }}</p>

            <div class="mb-6 flex flex-wrap gap-2">
              <span
                v-for="tag in org.tags"
                :key="tag"
                class="rounded-full border border-white/5 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300"
              >
                {{ tag }}
              </span>
            </div>

            <div class="mt-auto">
              <div class="mb-2 flex justify-between text-sm font-medium">
                <span class="text-white">¥{{ org.raisedAmount.toLocaleString() }}</span>
                <span class="text-slate-500">{{ calculateProgress(org.raisedAmount, org.goalAmount) }}%</span>
              </div>
              <div class="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  class="h-2.5 rounded-full bg-white/80 transition-all duration-1000 ease-out"
                  :style="{ width: calculateProgress(org.raisedAmount, org.goalAmount) + '%' }"
                ></div>
              </div>
              <div class="mt-3 flex justify-between text-xs text-slate-500">
                <span>{{ $t('crowdfunding.goal') }} ¥{{ org.goalAmount.toLocaleString() }}</span>
                <span>{{ org.backerCount }} {{ $t('crowdfunding.backers') }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="org-card-item relative flex min-h-[320px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-white/10 bg-black/70 p-8 text-center transition-all duration-300 hover:bg-white/[0.03]">
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.06),_transparent_42%)] opacity-70"></div>
          <div class="relative z-10">
            <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-2xl text-white">
              +
            </div>
            <h3 class="mb-3 text-xl font-semibold text-white">{{ $t('crowdfunding.apply.title') }}</h3>
            <p class="mx-auto mb-5 max-w-xs text-sm leading-7 text-slate-400">
              {{ $t('crowdfunding.apply.desc') }}
            </p>
            <button 
              class="rounded-full border border-white/10 bg-white px-6 py-2.5 text-sm font-semibold text-black transition-all hover:bg-slate-100"
              @click="handleApplyProject"
            >
              {{ $t('crowdfunding.apply.action') }}
            </button>
          </div>
        </div>
      </div>

      <div v-else class="detail-view mx-auto max-w-6xl">
        <button
          class="group mb-6 flex items-center text-sm font-semibold text-slate-400 transition-colors hover:text-white"
          @click="backToList"
        >
          <div class="mr-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] transition-all group-hover:bg-white/[0.05]">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </div>
          {{ $t('crowdfunding.details.back') }}
        </button>

        <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div class="space-y-6 lg:col-span-2">
            <div class="rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-md md:p-8">
              <div class="flex flex-col items-start gap-6 md:flex-row">
                <img :src="selectedOrg.coverImage" class="h-32 w-full rounded-2xl object-cover md:w-32">
                <div class="flex-1">
                  <div class="mb-3 flex flex-wrap items-center gap-3">
                    <span class="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                      {{ $t('crowdfunding.details.live') }}
                    </span>
                    <h1 class="text-2xl font-semibold tracking-tight text-white md:text-3xl">{{ selectedOrg.name }}</h1>
                  </div>
                  <p class="mb-5 text-sm leading-7 text-slate-400">{{ selectedOrg.subtitle }}</p>
                  <div class="flex flex-wrap gap-4 text-sm text-slate-300">
                    <div class="flex items-center gap-2">
                      <svg class="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"></path>
                      </svg>
                      <span class="font-semibold text-white">{{ selectedOrg.backerCount }}</span> {{ $t('crowdfunding.backers') }}
                    </div>
                    <div class="flex items-center gap-2">
                      <svg class="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span class="font-semibold text-white">{{ selectedOrg.daysLeft }}</span> {{ $t('crowdfunding.daysLeft', { days: selectedOrg.daysLeft }) }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-8">
                <div class="mb-2 flex items-end justify-between">
                  <div>
                    <span class="text-3xl font-semibold text-white">¥{{ selectedOrg.raisedAmount.toLocaleString() }}</span>
                    <span class="ml-2 text-sm text-slate-500">{{ $t('crowdfunding.raised') }}</span>
                  </div>
                  <span class="text-sm font-semibold text-slate-300">{{ calculateProgress(selectedOrg.raisedAmount, selectedOrg.goalAmount) }}%</span>
                </div>
                <div class="h-3 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    class="relative h-3 rounded-full bg-white/80 transition-all duration-1000 ease-out"
                    :style="{ width: calculateProgress(selectedOrg.raisedAmount, selectedOrg.goalAmount) + '%' }"
                  >
                    <div class="absolute right-0 top-0 h-full w-6 bg-gradient-to-r from-transparent to-white/50"></div>
                  </div>
                </div>
                <div class="mt-3 text-right text-xs text-slate-500">{{ $t('crowdfunding.goal') }} ¥{{ selectedOrg.goalAmount.toLocaleString() }}</div>
              </div>
            </div>

            <div class="breathe-frame relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-md md:p-8">
              <div v-if="isAnalyzing" class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm">
                <div class="mb-3 h-10 w-10 rounded-full border-4 border-white/30 border-t-white animate-spin"></div>
                <p class="font-mono text-sm text-white/50">NS-AI Analysis In Progress...</p>
              </div>

              <div class="mb-6 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                  <svg class="h-5 w-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="text-xl font-semibold text-white">{{ $t('crowdfunding.ai.assessment') }}</h3>
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ $t('crowdfunding.ai.signal') }}</p>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div class="space-y-5">
                  <div
                    v-for="(score, label) in { Innovation: selectedOrg.aiAnalysis.innovation, Impact: selectedOrg.aiAnalysis.socialImpact, Feasibility: selectedOrg.aiAnalysis.feasibility }"
                    :key="label"
                  >
                    <div class="mb-2 flex justify-between text-sm">
                      <span class="text-slate-400">{{ label }}</span>
                      <span class="font-semibold text-white">{{ score }}</span>
                    </div>
                    <div class="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div class="h-2 rounded-full bg-white/75" :style="{ width: score + '%' }"></div>
                    </div>
                  </div>
                </div>

                <div class="rounded-2xl border border-white/5 bg-black/40 p-5">
                  <div class="flex items-start gap-3">
                    <span class="text-xl text-white/60">+</span>
                    <div>
                      <p class="text-sm leading-7 text-slate-300">{{ selectedOrg.aiAnalysis.comment }}</p>
                      <div class="mt-5 border-t border-white/5 pt-4 text-right">
                        <span class="font-mono text-[11px] uppercase tracking-[0.18em] text-white/35">Generated by NS-AI v3.0</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="projectNeeds.needs.length > 0 || isMatching"
              class="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-md"
            >
              <div v-if="isMatching" class="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <span class="flex items-center gap-2 text-sm font-semibold text-white/60">
                  <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white/80"></span>
                  Matching maker supply...
                </span>
              </div>

              <div class="mb-4 flex items-center gap-3">
                <span class="text-2xl text-white/70">+</span>
                <div>
                  <h3 class="font-semibold text-white">{{ $t('crowdfunding.ai.matching') }}</h3>
                  <p class="text-xs text-slate-500">{{ $t('crowdfunding.ai.matchingDesc') }}</p>
                </div>
              </div>

              <div class="mb-6 flex flex-wrap gap-2">
                <span
                  v-for="keyword in projectNeeds.keywords"
                  :key="keyword"
                  class="rounded-full border border-white/5 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300"
                >
                  {{ keyword }}
                </span>
              </div>

              <div v-if="recommendedMakers.length > 0">
                <h4 class="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Recommended maker services</h4>
                <div class="space-y-3">
                  <div
                    v-for="maker in recommendedMakers"
                    :key="maker.id"
                    class="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/5 bg-black/35 p-3 transition-all hover:border-white/10 hover:bg-white/[0.03]"
                  >
                    <img :src="maker.image" class="h-12 w-12 rounded-xl bg-black/30 object-cover">
                    <div class="min-w-0 flex-1">
                      <div class="truncate text-sm font-semibold text-white">{{ maker.title }}</div>
                      <div class="truncate text-xs text-slate-500">{{ maker.provider?.username || 'Verified maker' }} • rating 4.9</div>
                    </div>
                    <button class="rounded-full border border-white/10 bg-white px-3 py-1 text-[11px] font-semibold text-black transition hover:bg-slate-100">
                      Contact
                    </button>
                  </div>
                </div>
              </div>
              <div v-else class="py-4 text-center text-xs text-slate-500">
                No perfect match yet. Invite more makers to join the supply network.
              </div>
            </div>

            <div class="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md">
              <div class="flex border-b border-white/5">
                <button
                  v-for="tab in ['story', 'updates', 'comments']"
                  :key="tab"
                  class="relative flex-1 py-4 text-sm font-semibold transition-colors"
                  :class="activeTab === tab ? 'text-white' : 'text-slate-500 hover:text-slate-300'"
                  @click="activeTab = tab"
                >
                  {{ tab === 'story' ? 'Project story' : tab === 'updates' ? 'Updates' : 'Support log' }}
                  <div v-if="activeTab === tab" class="absolute bottom-0 left-1/2 h-px w-10 -translate-x-1/2 bg-white/70"></div>
                </button>
              </div>

              <div class="min-h-[400px] p-8">
                <div v-if="activeTab === 'story'" class="animate-fade-in space-y-6">
                  <p class="text-base leading-8 text-slate-300">{{ selectedOrg.description }}</p>
                  <div>
                    <h3 class="mb-3 text-lg font-semibold text-white">About the initiative</h3>
                    <p class="text-sm leading-8 text-slate-400">
                      The campaign is designed as a transparent funding lane for youth innovation. Backers support direct execution, and the project team publishes a clear progress trail as the work advances.
                    </p>
                  </div>
                  <img :src="selectedOrg.coverImage" class="w-full rounded-2xl border border-white/5 object-cover">
                  <div>
                    <h3 class="mb-3 text-lg font-semibold text-white">{{ $t('crowdfunding.details.why') }}</h3>
                    <p class="text-sm leading-8 text-slate-400">
                      Funds go toward teaching tools, event operations, and real-world maker program delivery. The point is not just to fund an idea, but to help it become visible, measurable, and executable.
                    </p>
                  </div>
                </div>

                <div v-else-if="activeTab === 'updates'" class="animate-fade-in space-y-8">
                  <div class="relative border-l border-white/10 pl-8">
                    <div class="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-white/80"></div>
                    <div class="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">2026-01-05</div>
                    <h4 class="mb-2 text-lg font-semibold text-white">Campaign goes live</h4>
                    <p class="text-sm leading-7 text-slate-400">
                      The first funding wave is in motion, and the project team has completed the initial production and outreach preparation.
                    </p>
                  </div>
                  <div class="relative border-l border-white/10 pl-8">
                    <div class="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-white/30"></div>
                    <div class="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">2025-12-28</div>
                    <h4 class="mb-2 text-lg font-semibold text-white">Pre-launch setup</h4>
                    <p class="text-sm leading-7 text-slate-400">
                      The team is capturing roadshow materials, tightening the fundraising narrative, and preparing the first public demonstration.
                    </p>
                  </div>
                </div>

                <div v-else-if="activeTab === 'comments'" class="animate-fade-in space-y-6">
                  <div class="flex gap-4">
                    <div class="h-10 w-10 flex-shrink-0 rounded-full bg-white/10"></div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-white">Community backer</span>
                        <span class="text-xs text-slate-500">2 hours ago</span>
                      </div>
                      <p class="mt-1 text-sm leading-7 text-slate-400">Strong mission. This is exactly the kind of youth program that should be visible.</p>
                    </div>
                  </div>
                  <div class="flex gap-4">
                    <div class="h-10 w-10 flex-shrink-0 rounded-full bg-white/5"></div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-white">Education coach</span>
                        <span class="text-xs text-slate-500">5 hours ago</span>
                      </div>
                      <p class="mt-1 text-sm leading-7 text-slate-400">High-quality idea. I have already shared it with several families and program leads.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-6 lg:col-span-1">
            <div class="sticky top-24 rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-md">
              <h3 class="mb-4 flex items-center gap-2 font-semibold text-white">
                <svg class="h-5 w-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                </svg>
                {{ $t('crowdfunding.support.title') }}
              </h3>

              <div class="space-y-4">
                <div
                  v-for="tier in selectedOrg.tiers"
                  :key="tier.id"
                  class="group cursor-pointer rounded-2xl border border-white/5 bg-black/35 p-4 transition-all hover:border-white/10 hover:bg-white/[0.03]"
                  @click="supportOrg(tier)"
                >
                  <div class="mb-3 flex items-center justify-between gap-3">
                    <span class="text-lg font-semibold text-white">¥{{ tier.amount }}</span>
                    <span class="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                      {{ tier.title }}
                    </span>
                  </div>
                  <p class="mb-4 text-sm leading-7 text-slate-400">{{ tier.desc }}</p>
                  <button class="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-black transition hover:bg-slate-100">
                    {{ $t('crowdfunding.support.action', { amount: tier.amount }) }}
                  </button>
                </div>

                <div class="rounded-2xl border border-dashed border-white/10 bg-black/30 p-4">
                  <div class="mb-3 text-center text-sm font-semibold text-slate-400">{{ $t('crowdfunding.support.custom') }}</div>
                  <div class="flex gap-2">
                    <div class="relative flex-1">
                      <span class="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-500">¥</span>
                      <input
                        v-model="customAmount"
                        type="number"
                        min="1"
                        :placeholder="$t('crowdfunding.support.placeholder')"
                        class="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-7 pr-3 text-sm font-semibold text-white outline-none transition focus:border-white/20 focus:bg-white/[0.05]"
                      >
                    </div>
                    <button
                      class="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="!customAmount || customAmount <= 0"
                      @click="handleCustomSupport"
                    >
                      {{ $t('crowdfunding.support.button') }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="mt-8 border-t border-white/5 pt-6">
                <h4 class="mb-3 font-semibold text-white">{{ $t('crowdfunding.roadshow.title') }}</h4>
                <div class="mb-3 rounded-2xl border border-white/5 bg-black/35 p-4">
                  <div class="mb-1 flex items-center text-sm text-slate-300">
                    <svg class="mr-2 h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {{ $t('crowdfunding.roadshow.schedule') }}
                  </div>
                  <div class="text-xs text-slate-500">{{ $t('crowdfunding.roadshow.location') }}</div>
                </div>
                <button class="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 font-semibold text-white transition hover:bg-white/[0.06]" @click="bookRoadshow">
                  {{ $t('crowdfunding.roadshow.action') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

.breathe-frame {
  animation: breatheFrame 3.6s ease-in-out infinite;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes breatheFrame {
  0%,
  100% {
    box-shadow: 0 0 0 rgba(255, 255, 255, 0);
    border-color: rgba(255, 255, 255, 0.05);
  }
  50% {
    box-shadow: 0 0 24px rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.12);
  }
}
</style>
