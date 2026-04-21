<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '../composables/useToast';
import { CrowdfundingService } from '../services/api';
import { useAuth } from '../store/auth';

const { t, locale } = useI18n();
const { show } = useToast();
const { auth } = useAuth();

const isZh = computed(() => String(locale.value || '').toLowerCase().startsWith('zh'));
const isAuthed = computed(() => Boolean(auth?.isAuthenticated));

const projects = ref([]);
const loadingProjects = ref(false);
const selectedProject = ref(null);
const activeTab = ref('story');
const customAmount = ref('');

const projectMilestones = ref([]);
const projectUpdates = ref([]);
const projectSupporters = ref([]);
const projectClosureReport = ref(null);
const loadingOverview = ref(false);

const ngoDetailsOpen = ref(false);
const ngoOverviewLoading = ref(false);
const ngoOverview = ref({ milestones: [], updates: [], supporters: [] });

const ngoPartner = computed(() => ({
  id: 'aiuni',
  name: 'AIUNI',
  logo: '/images/ngo/aiuni-logo.jpg',
  focus: 'Public-good education',
  status: 'Onboarded',
  description: t('crowdfunding.ngo.desc')
}));

const ensureArray = (value) => (Array.isArray(value) ? value : []);
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const unwrap = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.data && typeof payload.data === 'object') return payload.data;
  }
  return payload;
};

const parseDetails = (details) => {
  if (!details) return {};
  if (typeof details === 'object') return details;
  try {
    return JSON.parse(details);
  } catch (_) {
    return {};
  }
};

const isMockLike = (project) => {
  const text = `${project?.title || project?.name || ''} ${project?.description || ''}`.toLowerCase();
  return text.includes('mvp smoke') || text.includes('smoke-test') || text.includes('placeholder');
};

const normalizeProject = (project) => ({
  ...project,
  id: String(project.id || ''),
  name: project.title || project.name || '',
  description: project.description || '',
  goalAmount: toNumber(project.fundingGoal || project.goalAmount, 0),
  raisedAmount: toNumber(project.pledgedAmount || project.raisedAmount, 0),
  backerCount: toNumber(project.backersCount || project.backerCount, 0),
  stage: project.stage || 'funding',
  details: parseDetails(project.details),
  tags: ensureArray(project.tags),
  image: project.image || project.coverImage || '',
  daysLeft: Number.isFinite(Number(project.daysLeft)) ? Number(project.daysLeft) : null
});

const isTrustedCrowdfundingProject = (project) => {
  if (!project?.id || !project?.name) return false;
  return !isMockLike(project);
};

const formatMoney = (value) => `CNY ${toNumber(value, 0).toLocaleString()}`;
const formatDate = (value) => {
  if (!value) return '--';
  return new Date(value).toLocaleString(isZh.value ? 'zh-CN' : 'en-US', { hour12: false });
};

const progress = (raised, goal) => {
  const normalizedGoal = toNumber(goal, 0);
  if (!normalizedGoal) return 0;
  return Math.min((toNumber(raised, 0) / normalizedGoal) * 100, 100);
};

const stageLabel = (stage) => t(`crowdfunding.stages.${stage || 'draft'}`);
const milestoneStatusLabel = (status) => t(`crowdfunding.milestoneStatus.${status || 'pending'}`);

const activeNgoCampaign = computed(() => {
  const normalized = projects.value.find((item) => {
    const detailsOrg = String(item.details?.organizationName || '').toLowerCase();
    const provider = String(item.provider || '').toLowerCase();
    const title = String(item.name || '').toLowerCase();
    return detailsOrg === 'aiuni' || provider === 'aiuni' || title.includes('aiuni');
  });
  return normalized || null;
});

const ngoProfile = computed(() => {
  const details = activeNgoCampaign.value?.details || {};
  return {
    organizationName: details.organizationName || ngoPartner.value.name,
    mission: details.mission || '',
    region: details.region || '',
    contact: details.contact || '',
    website: details.website || ''
  };
});

const ngoLoop = computed(() => {
  const campaign = activeNgoCampaign.value;
  const milestones = ensureArray(ngoOverview.value?.milestones);
  const updates = ensureArray(ngoOverview.value?.updates);
  return [
    { key: 'onboarded', done: true },
    { key: 'campaignCreated', done: Boolean(campaign?.id) },
    { key: 'fundraisingLive', done: Boolean(campaign && ['funding', 'successful', 'delivering', 'completed'].includes(campaign.stage)) },
    { key: 'progressDisclosed', done: Boolean(milestones.length + updates.length) },
    { key: 'closedLoop', done: campaign?.stage === 'completed' }
  ];
});

const ngoBudget = computed(() =>
  ensureArray(ngoOverview.value?.milestones)
    .map((item) => ({
      id: item.id,
      title: item.title,
      amount: toNumber(item.targetAmount, 0)
    }))
    .filter((item) => item.title && item.amount > 0)
);

const ngoLatestUpdates = computed(() => ensureArray(ngoOverview.value?.updates).slice(0, 4));

const loadProjects = async () => {
  loadingProjects.value = true;
  try {
    const data = unwrap(await CrowdfundingService.getProjects());
    projects.value = ensureArray(data)
      .map(normalizeProject)
      .filter(isTrustedCrowdfundingProject);
  } catch (error) {
    show(error?.message || t('crowdfunding.toast.genericError'), 'error');
  } finally {
    loadingProjects.value = false;
  }
};

const loadOverview = async (projectId) => {
  if (!projectId) return;
  loadingOverview.value = true;
  try {
    const data = unwrap(await CrowdfundingService.getProjectOverview(projectId, { limit: 30 })) || {};
    projectMilestones.value = ensureArray(data.milestones);
    projectUpdates.value = ensureArray(data.updates);
    projectSupporters.value = ensureArray(data.supporters);
    projectClosureReport.value = data.closureReport || data.project?.closureReport || null;
  } catch (error) {
    show(error?.message || t('crowdfunding.toast.genericError'), 'error');
  } finally {
    loadingOverview.value = false;
  }
};

const loadNgoOverview = async () => {
  if (!activeNgoCampaign.value?.id) {
    ngoOverview.value = { milestones: [], updates: [], supporters: [] };
    return;
  }
  ngoOverviewLoading.value = true;
  try {
    const data = unwrap(await CrowdfundingService.getProjectOverview(activeNgoCampaign.value.id, { limit: 20 })) || {};
    ngoOverview.value = {
      milestones: ensureArray(data.milestones),
      updates: ensureArray(data.updates),
      supporters: ensureArray(data.supporters)
    };
  } catch (error) {
    show(error?.message || t('crowdfunding.toast.genericError'), 'error');
    ngoOverview.value = { milestones: [], updates: [], supporters: [] };
  } finally {
    ngoOverviewLoading.value = false;
  }
};

const selectProject = async (project) => {
  selectedProject.value = project;
  activeTab.value = 'story';
  customAmount.value = '';
  projectClosureReport.value = project?.closureReport || null;
  await loadOverview(project.id);
};

const supportCustom = async () => {
  const amount = Number(customAmount.value);
  if (!isAuthed.value) {
    show(t('auth.login'), 'info');
    return;
  }
  if (!selectedProject.value?.id || !Number.isFinite(amount) || amount <= 0) {
    show(t('crowdfunding.validation.invalidAmount'), 'warning');
    return;
  }

  try {
    await CrowdfundingService.supportProject(selectedProject.value.id, { amount });
    await Promise.all([loadProjects(), loadOverview(selectedProject.value.id)]);
    customAmount.value = '';
    show(t('crowdfunding.toast.supportSuccess', { amount }), 'success');
  } catch (error) {
    show(error?.message || t('crowdfunding.toast.paymentFailed'), 'error');
  }
};

const bookRoadshow = async () => {
  if (!isAuthed.value) {
    show(t('auth.login'), 'info');
    return;
  }
  if (!selectedProject.value?.id) return;

  try {
    await CrowdfundingService.apply({
      roadshow: true,
      projectId: selectedProject.value.id,
      title: selectedProject.value.name
    });
    show(t('crowdfunding.toast.roadshowSuccess'), 'success');
  } catch (error) {
    show(error?.message || t('crowdfunding.toast.genericError'), 'error');
  }
};

const openNgoCampaign = async () => {
  ngoDetailsOpen.value = false;
  if (!activeNgoCampaign.value) return;
  await selectProject(activeNgoCampaign.value);
};

onMounted(loadProjects);
watch(() => activeNgoCampaign.value?.id, loadNgoOverview);
</script>

<template>
  <div class="min-h-screen bg-[#050505] pb-16 pt-24 text-white">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mb-8 text-center">
        <h1 class="text-4xl font-semibold md:text-6xl">{{ $t('crowdfunding.title') }}</h1>
        <p class="mx-auto mt-3 max-w-3xl text-slate-300">{{ $t('crowdfunding.subtitle') }}</p>
      </div>

      <div v-if="!selectedProject" class="mb-8 rounded-3xl border border-emerald-300/30 bg-emerald-500/5 p-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <img :src="ngoPartner.logo" :alt="ngoPartner.name" class="h-12 w-12 rounded-lg border border-white/10 bg-white object-cover p-1">
            <div>
              <p class="text-lg font-semibold">{{ ngoPartner.name }}</p>
              <p class="text-xs text-emerald-100/80">{{ ngoPartner.status }} | {{ ngoPartner.focus }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="rounded-lg border border-emerald-200/35 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/10" @click="ngoDetailsOpen = true">
              {{ $t('crowdfunding.ngo.viewDetails') }}
            </button>
            <button
              v-if="activeNgoCampaign"
              class="rounded-lg border border-cyan-200/35 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/10"
              @click="openNgoCampaign"
            >
              {{ $t('crowdfunding.ngo.openCampaign') }}
            </button>
          </div>
        </div>
        <p class="mt-3 text-sm text-slate-300">{{ ngoPartner.description }}</p>
      </div>

      <div v-if="ngoDetailsOpen" class="fixed inset-0 z-50 flex items-start justify-center bg-black/75 px-4 py-8 pt-20">
        <div class="max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0b0f14] p-6">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-xl font-semibold">{{ ngoPartner.name }} {{ $t('crowdfunding.ngo.orgProfileTitle') }}</h3>
            <button class="rounded-lg border border-white/15 px-3 py-1 text-sm" @click="ngoDetailsOpen = false">{{ $t('crowdfunding.ngo.close') }}</button>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <div class="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-slate-300">
              <p>{{ $t('crowdfunding.ngo.orgName') }}: {{ ngoProfile.organizationName }}</p>
              <p class="mt-2">{{ $t('crowdfunding.ngo.mission') }}: {{ ngoProfile.mission || $t('crowdfunding.ngo.profilePending') }}</p>
              <p class="mt-2">{{ $t('crowdfunding.ngo.region') }}: {{ ngoProfile.region || $t('crowdfunding.ngo.profilePending') }}</p>
              <p class="mt-2">{{ $t('crowdfunding.ngo.contact') }}: {{ ngoProfile.contact || $t('crowdfunding.ngo.profilePending') }}</p>
              <p class="mt-2">{{ $t('crowdfunding.ngo.website') }}: {{ ngoProfile.website || $t('crowdfunding.ngo.profilePending') }}</p>
            </div>

            <div class="rounded-2xl border border-cyan-300/20 bg-cyan-500/5 p-4 text-sm">
              <p class="font-semibold">{{ $t('crowdfunding.ngo.loopTitle') }}</p>
              <div class="mt-3 space-y-2">
                <div v-for="step in ngoLoop" :key="step.key" class="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs">
                  <span>{{ $t(`crowdfunding.ngo.loop.${step.key}`) }}</span>
                  <span :class="step.done ? 'text-emerald-300' : 'text-slate-500'">{{ step.done ? $t('crowdfunding.ngo.done') : $t('crowdfunding.ngo.pending') }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4 grid gap-4 lg:grid-cols-2">
            <div class="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p class="text-sm font-semibold">{{ $t('crowdfunding.ngo.budgetTitle') }}</p>
              <div v-if="ngoOverviewLoading" class="mt-2 text-xs text-slate-400">{{ $t('crowdfunding.common.loading') }}</div>
              <div v-else-if="!ngoBudget.length" class="mt-2 text-xs text-slate-400">{{ $t('crowdfunding.ngo.noCampaign') }}</div>
              <div v-else class="mt-2 space-y-2">
                <div v-for="item in ngoBudget" :key="item.id" class="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs flex justify-between">
                  <span>{{ item.title }}</span>
                  <span>{{ formatMoney(item.amount) }}</span>
                </div>
              </div>
            </div>

            <div class="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p class="text-sm font-semibold">{{ $t('crowdfunding.ngo.latestUpdatesTitle') }}</p>
              <div v-if="ngoOverviewLoading" class="mt-2 text-xs text-slate-400">{{ $t('crowdfunding.common.loading') }}</div>
              <div v-else-if="!ngoLatestUpdates.length" class="mt-2 text-xs text-slate-400">{{ $t('crowdfunding.updates.empty') }}</div>
              <div v-else class="mt-2 space-y-2">
                <div v-for="item in ngoLatestUpdates" :key="item.id" class="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <p class="text-xs text-slate-500">{{ formatDate(item.createdAt) }}</p>
                  <p class="mt-1 text-xs font-semibold">{{ item.title }}</p>
                  <p class="mt-1 text-xs text-slate-300">{{ item.content }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loadingProjects" class="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center text-slate-400">{{ $t('crowdfunding.common.loading') }}</div>
      <div v-else-if="!projects.length" class="rounded-3xl border border-dashed border-white/15 bg-black/40 p-10 text-center">
        <h3 class="text-lg font-semibold">{{ $t('crowdfunding.empty.title') }}</h3>
        <p class="mt-2 text-sm text-slate-400">{{ $t('crowdfunding.empty.desc') }}</p>
      </div>

      <div v-else-if="!selectedProject" class="grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        <div v-for="project in projects" :key="project.id" class="cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] transition hover:border-white/20" @click="selectProject(project)">
          <img v-if="project.image" :src="project.image" :alt="project.name" class="h-52 w-full object-cover">
          <div v-else class="h-52 w-full bg-gradient-to-br from-slate-800 to-slate-900"></div>
          <div class="p-6">
            <div class="mb-2 flex items-center justify-between">
              <h3 class="line-clamp-1 text-lg font-semibold">{{ project.name }}</h3>
              <span class="rounded-full border border-white/15 bg-white/[0.03] px-2 py-0.5 text-[10px]">{{ stageLabel(project.stage) }}</span>
            </div>
            <p class="line-clamp-3 min-h-[56px] text-sm leading-7 text-slate-400">{{ project.description || $t('crowdfunding.common.noDescription') }}</p>
            <div class="mt-4">
              <div class="mb-2 flex justify-between text-sm">
                <span>{{ formatMoney(project.raisedAmount) }}</span>
                <span>{{ progress(project.raisedAmount, project.goalAmount).toFixed(1) }}%</span>
              </div>
              <div class="h-2 w-full rounded-full bg-white/10">
                <div class="h-2 rounded-full bg-white/80" :style="{ width: `${progress(project.raisedAmount, project.goalAmount)}%` }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="mx-auto max-w-6xl">
        <button class="mb-5 text-sm text-slate-400 hover:text-white" @click="selectedProject = null">{{ $t('crowdfunding.details.back') }}</button>

        <div class="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
          <h2 class="text-2xl font-semibold">{{ selectedProject.name }}</h2>
          <p class="mt-2 text-sm text-slate-300">{{ selectedProject.description || $t('crowdfunding.common.noDescription') }}</p>
          <div class="mt-4 mb-2 flex justify-between text-sm">
            <span>{{ formatMoney(selectedProject.raisedAmount) }}</span>
            <span>{{ progress(selectedProject.raisedAmount, selectedProject.goalAmount).toFixed(1) }}%</span>
          </div>
          <div class="h-2 w-full rounded-full bg-white/10">
            <div class="h-2 rounded-full bg-cyan-300" :style="{ width: `${progress(selectedProject.raisedAmount, selectedProject.goalAmount)}%` }"></div>
          </div>
          <p class="mt-2 text-xs text-slate-400">{{ $t('crowdfunding.goal') }} {{ formatMoney(selectedProject.goalAmount) }}</p>
        </div>

        <div class="mt-6 grid gap-6 lg:grid-cols-3">
          <div class="lg:col-span-2 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
            <div class="mb-4 flex border-b border-white/10">
              <button
                v-for="tab in ['story', 'updates', 'comments']"
                :key="tab"
                class="flex-1 py-3 text-sm"
                :class="activeTab === tab ? 'text-white' : 'text-slate-500'"
                @click="activeTab = tab"
              >
                {{ tab === 'story' ? $t('crowdfunding.details.tabs.story') : tab === 'updates' ? $t('crowdfunding.details.tabs.updates') : $t('crowdfunding.details.tabs.comments') }}
              </button>
            </div>

            <div v-if="loadingOverview" class="text-sm text-slate-400">{{ $t('crowdfunding.common.loading') }}</div>

            <div v-else-if="activeTab === 'story'" class="space-y-3">
              <div v-if="projectClosureReport" class="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="text-sm font-semibold text-emerald-200">{{ $t('crowdfunding.closureReport.title') }}</p>
                  <p class="text-xs text-emerald-100/80">{{ formatDate(projectClosureReport.publishedAt) }}</p>
                </div>
                <p class="mt-2 text-sm text-slate-100">{{ projectClosureReport.summary }}</p>
                <div class="mt-3 grid gap-2 sm:grid-cols-2">
                  <div class="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs text-slate-200">
                    {{ $t('crowdfunding.closureReport.metrics.raised') }}: {{ formatMoney(projectClosureReport.metrics?.raisedAmount) }}
                  </div>
                  <div class="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs text-slate-200">
                    {{ $t('crowdfunding.closureReport.metrics.backers') }}: {{ projectClosureReport.metrics?.backersCount || 0 }}
                  </div>
                  <div class="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs text-slate-200">
                    {{ $t('crowdfunding.closureReport.metrics.milestones') }}:
                    {{ projectClosureReport.metrics?.milestoneCompleted || 0 }}/{{ projectClosureReport.metrics?.milestoneTotal || 0 }}
                  </div>
                  <div class="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs text-slate-200">
                    {{ $t('crowdfunding.closureReport.metrics.updates') }}: {{ projectClosureReport.metrics?.updateCount || 0 }}
                  </div>
                </div>
                <div v-if="projectClosureReport.fundUsage?.length" class="mt-3 space-y-2">
                  <p class="text-xs font-semibold text-emerald-100">{{ $t('crowdfunding.closureReport.fundUsage') }}</p>
                  <div
                    v-for="item in projectClosureReport.fundUsage"
                    :key="item.id"
                    class="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-200"
                  >
                    <span>{{ item.title }}</span>
                    <span>{{ formatMoney(item.amount) }}</span>
                  </div>
                </div>
              </div>
              <div v-if="!projectMilestones.length" class="text-sm text-slate-400">{{ $t('crowdfunding.milestones.empty') }}</div>
              <div v-for="milestone in projectMilestones" :key="milestone.id" class="rounded-xl border border-white/10 bg-black/30 p-3">
                <div class="flex justify-between text-sm">
                  <span>{{ milestone.title }}</span>
                  <span>{{ milestoneStatusLabel(milestone.status) }}</span>
                </div>
                <p class="mt-1 text-xs text-slate-400">{{ milestone.description || $t('crowdfunding.common.noDescription') }}</p>
              </div>
            </div>

            <div v-else-if="activeTab === 'updates'" class="space-y-3">
              <div v-if="!projectUpdates.length" class="text-sm text-slate-400">{{ $t('crowdfunding.updates.empty') }}</div>
              <div v-for="item in projectUpdates" :key="item.id" class="rounded-xl border border-white/10 bg-black/30 p-3">
                <p class="text-xs text-slate-500">{{ formatDate(item.createdAt) }}</p>
                <p class="mt-1 text-sm font-semibold">{{ item.title }}</p>
                <p class="mt-1 text-xs text-slate-300">{{ item.content }}</p>
              </div>
            </div>

            <div v-else class="space-y-3">
              <div v-if="!projectSupporters.length" class="text-sm text-slate-400">{{ $t('crowdfunding.supporters.empty') }}</div>
              <div v-for="item in projectSupporters" :key="item.id" class="rounded-xl border border-white/10 bg-black/30 p-3 flex items-center justify-between">
                <span class="text-sm">{{ item.username || $t('crowdfunding.supporters.anonymous') }}</span>
                <span class="text-xs text-slate-300">{{ formatMoney(item.amount) }}</span>
              </div>
            </div>
          </div>

          <div class="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
            <p class="mb-2 text-sm">{{ $t('crowdfunding.support.custom') }}</p>
            <div class="flex gap-2">
              <input v-model="customAmount" type="number" min="1" class="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm" :placeholder="$t('crowdfunding.support.placeholder')">
              <button class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black" @click="supportCustom">{{ $t('crowdfunding.support.button') }}</button>
            </div>

            <button class="mt-4 w-full rounded-xl border border-white/20 bg-white/[0.03] py-2 text-sm" @click="bookRoadshow">
              {{ $t('crowdfunding.roadshow.action') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
