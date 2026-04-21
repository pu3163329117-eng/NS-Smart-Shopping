<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { CrowdfundingService } from '../../services/api';
import { useAuth } from '../../store/auth';
import { useToast } from '../../composables/useToast';

const { locale } = useI18n();
const router = useRouter();
const { auth } = useAuth();
const { show } = useToast();

const pendingApplications = ref([]);
const liveProjects = ref([]);
const loadingPending = ref(false);
const loadingLive = ref(false);
const actionMap = reactive({});
const rejectReasonMap = reactive({});
const stageMap = reactive({});

const isZh = computed(() => String(locale.value || '').toLowerCase().startsWith('zh'));
const text = (zh, en) => (isZh.value ? zh : en);
const isAdmin = computed(() => auth?.user?.isAdmin === true || auth?.user?.role === 'admin');

const STAGE_OPTIONS = [
  { value: 'under_review', zh: '审核中', en: 'Under review' },
  { value: 'funding', zh: '众筹中', en: 'Funding' },
  { value: 'successful', zh: '达标成功', en: 'Successful' },
  { value: 'failed', zh: '未达标', en: 'Failed' },
  { value: 'delivering', zh: '交付中', en: 'Delivering' },
  { value: 'completed', zh: '已完成', en: 'Completed' }
];
const STAGE_TRANSITION_RULES = {
  draft: ['under_review'],
  under_review: ['funding', 'failed'],
  funding: ['successful', 'failed'],
  successful: ['delivering', 'completed'],
  failed: ['under_review'],
  delivering: ['completed'],
  completed: []
};

const stageLabel = (stage) => {
  const found = STAGE_OPTIONS.find((item) => item.value === stage);
  if (!found) return stage || '-';
  return text(found.zh, found.en);
};

const allowedStageOptions = (currentStage) => {
  const allowed = STAGE_TRANSITION_RULES[currentStage] || [];
  const merged = Array.from(new Set([currentStage, ...allowed]));
  const filtered = STAGE_OPTIONS.filter((item) => merged.includes(item.value));
  return filtered.length ? filtered : STAGE_OPTIONS;
};

const formatMoney = (value) => `¥${Number(value || 0).toLocaleString()}`;
const formatDate = (value) => {
  if (!value) return '--';
  return new Date(value).toLocaleString(isZh.value ? 'zh-CN' : 'en-US', { hour12: false });
};

const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const normalizeProject = (project) => ({
  ...project,
  id: project.id,
  title: project.title || '-',
  description: project.description || '',
  stage: project.stage || 'under_review',
  fundingGoal: Number(project.fundingGoal || 0),
  pledgedAmount: Number(project.pledgedAmount || 0),
  backersCount: Number(project.backersCount || 0),
  creatorName: project.user?.username || project.provider || '-',
  createdAt: project.createdAt
});

const loadPending = async () => {
  loadingPending.value = true;
  try {
    const res = await CrowdfundingService.getAdminApplications({ status: 'pending' });
    pendingApplications.value = unwrapList(res).map(normalizeProject);
  } catch (error) {
    show(error?.message || text('加载待审批申请失败', 'Failed to load pending applications'), 'error');
  } finally {
    loadingPending.value = false;
  }
};

const loadLive = async () => {
  loadingLive.value = true;
  try {
    const res = await CrowdfundingService.getProjects();
    liveProjects.value = unwrapList(res).map(normalizeProject);
    for (const item of liveProjects.value) {
      stageMap[item.id] = item.stage || 'funding';
    }
  } catch (error) {
    show(error?.message || text('加载在线项目失败', 'Failed to load live projects'), 'error');
  } finally {
    loadingLive.value = false;
  }
};

const approve = async (item) => {
  actionMap[item.id] = true;
  try {
    await CrowdfundingService.approveApplication(item.id);
    show(text('申请已通过并上线', 'Application approved and published'), 'success');
    await Promise.all([loadPending(), loadLive()]);
  } catch (error) {
    show(error?.message || text('审批失败', 'Approval failed'), 'error');
  } finally {
    actionMap[item.id] = false;
  }
};

const reject = async (item) => {
  actionMap[item.id] = true;
  try {
    await CrowdfundingService.rejectApplication(item.id, { reason: rejectReasonMap[item.id] || '' });
    show(text('申请已拒绝', 'Application rejected'), 'success');
    await loadPending();
  } catch (error) {
    show(error?.message || text('拒绝失败', 'Reject failed'), 'error');
  } finally {
    actionMap[item.id] = false;
  }
};

const updateStage = async (item) => {
  actionMap[item.id] = true;
  try {
    await CrowdfundingService.updateProjectStage(item.id, { stage: stageMap[item.id] });
    show(text('阶段更新成功', 'Stage updated'), 'success');
    await loadLive();
  } catch (error) {
    show(error?.message || text('阶段更新失败', 'Failed to update stage'), 'error');
  } finally {
    actionMap[item.id] = false;
  }
};

onMounted(async () => {
  if (!isAdmin.value) return;
  await Promise.all([loadPending(), loadLive()]);
});
</script>

<template>
  <div class="min-h-screen bg-slate-950 px-4 pb-16 pt-32 text-white sm:px-6 lg:px-8">
    <div class="mx-auto max-w-7xl">
      <div class="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.25em] text-slate-400">{{ text('管理后台', 'Admin Console') }}</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight">{{ text('众筹审批中心', 'Crowdfunding Review Center') }}</h1>
          <p class="mt-2 text-sm text-slate-400">{{ text('审批项目、更新阶段、完成众筹运营闭环。', 'Review campaigns and manage lifecycle transitions.') }}</p>
        </div>
        <button class="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/[0.06]" @click="router.push('/admin/audit')">
          {{ text('返回审核中心', 'Back to audit center') }}
        </button>
      </div>

      <div v-if="!isAdmin" class="rounded-2xl border border-rose-300/30 bg-rose-500/10 p-8 text-center">
        <h2 class="text-xl font-semibold text-rose-100">{{ text('访问受限', 'Access denied') }}</h2>
        <p class="mt-2 text-sm text-rose-200/80">{{ text('当前账号没有管理员权限。', 'Current account has no admin permission.') }}</p>
      </div>

      <template v-else>
        <div class="mb-8 grid gap-4 md:grid-cols-3">
          <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p class="text-xs text-slate-400">{{ text('待审批申请', 'Pending applications') }}</p>
            <p class="mt-2 text-3xl font-semibold">{{ pendingApplications.length }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p class="text-xs text-slate-400">{{ text('在线众筹项目', 'Live campaigns') }}</p>
            <p class="mt-2 text-3xl font-semibold">{{ liveProjects.length }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p class="text-xs text-slate-400">{{ text('当前总支持人数', 'Total backers now') }}</p>
            <p class="mt-2 text-3xl font-semibold">{{ liveProjects.reduce((sum, item) => sum + Number(item.backersCount || 0), 0) }}</p>
          </div>
        </div>

        <div class="mb-10">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold">{{ text('待审批申请', 'Pending applications') }}</h2>
            <button class="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/[0.05]" :disabled="loadingPending" @click="loadPending">
              {{ loadingPending ? text('刷新中...', 'Refreshing...') : text('刷新', 'Refresh') }}
            </button>
          </div>

          <div v-if="loadingPending" class="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-400">
            {{ text('正在加载待审批申请...', 'Loading pending applications...') }}
          </div>
          <div v-else-if="!pendingApplications.length" class="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center text-sm text-slate-400">
            {{ text('暂无待审批申请', 'No pending applications') }}
          </div>
          <div v-else class="space-y-3">
            <div v-for="item in pendingApplications" :key="item.id" class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div class="min-w-0 flex-1">
                  <p class="line-clamp-1 text-base font-semibold">{{ item.title }}</p>
                  <p class="mt-1 line-clamp-2 text-sm text-slate-400">{{ item.description || text('暂无描述', 'No description') }}</p>
                  <p class="mt-2 text-xs text-slate-500">
                    {{ text('发起人', 'Creator') }}: {{ item.creatorName }} ·
                    {{ text('申请时间', 'Applied at') }}: {{ formatDate(item.createdAt) }} ·
                    {{ text('目标', 'Goal') }}: {{ formatMoney(item.fundingGoal) }}
                  </p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <input
                    v-model="rejectReasonMap[item.id]"
                    type="text"
                    class="w-52 rounded-lg border border-white/15 bg-black/35 px-3 py-1.5 text-xs"
                    :placeholder="text('拒绝理由（可选）', 'Reject reason (optional)')"
                  >
                  <button class="rounded-lg border border-rose-300/40 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10 disabled:opacity-60" :disabled="actionMap[item.id]" @click="reject(item)">
                    {{ text('拒绝', 'Reject') }}
                  </button>
                  <button class="rounded-lg border border-emerald-300/40 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-60" :disabled="actionMap[item.id]" @click="approve(item)">
                    {{ text('通过', 'Approve') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold">{{ text('在线项目阶段管理', 'Live project stage management') }}</h2>
            <button class="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/[0.05]" :disabled="loadingLive" @click="loadLive">
              {{ loadingLive ? text('刷新中...', 'Refreshing...') : text('刷新', 'Refresh') }}
            </button>
          </div>

          <div v-if="loadingLive" class="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-400">
            {{ text('正在加载在线项目...', 'Loading live projects...') }}
          </div>
          <div v-else-if="!liveProjects.length" class="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center text-sm text-slate-400">
            {{ text('暂无在线众筹项目', 'No live campaigns') }}
          </div>
          <div v-else class="space-y-3">
            <div v-for="item in liveProjects" :key="item.id" class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div class="min-w-0 flex-1">
                  <p class="line-clamp-1 text-base font-semibold">{{ item.title }}</p>
                  <p class="mt-2 text-xs text-slate-500">
                    {{ text('当前阶段', 'Current stage') }}: {{ stageLabel(item.stage) }} ·
                    {{ text('已筹/目标', 'Raised/Goal') }}: {{ formatMoney(item.pledgedAmount) }} / {{ formatMoney(item.fundingGoal) }} ·
                    {{ text('支持者', 'Backers') }}: {{ item.backersCount }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <select v-model="stageMap[item.id]" class="rounded-lg border border-white/15 bg-black/35 px-3 py-1.5 text-xs">
                    <option v-for="opt in allowedStageOptions(item.stage)" :key="opt.value" :value="opt.value">
                      {{ text(opt.zh, opt.en) }}
                    </option>
                  </select>
                  <button class="rounded-lg border border-cyan-300/40 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60" :disabled="actionMap[item.id]" @click="updateStage(item)">
                    {{ text('更新阶段', 'Update stage') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
