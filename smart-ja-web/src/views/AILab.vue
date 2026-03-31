<script setup>
import { ref, nextTick, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import gsap from 'gsap';
import { useToast } from '../composables/useToast';
import { callDeepseekAPIStream, publishAIToMarket, generateImage } from '../services/aiService';
import { MarketService, UserService } from '../services/api';
import { useUserProfile } from '../store/userProfile';
import { useAILabStore } from '../store/aiLab';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart, BarChart, LineChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent, GridComponent, TitleComponent } from 'echarts/components';
import VChart from 'vue-echarts';

use([
  CanvasRenderer,
  PieChart,
  BarChart,
  LineChart,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  TitleComponent
]);

const { show: showToast } = useToast();
const { t } = useI18n();
const store = useAILabStore();
const { state, agents, currentAgent } = store;
const { userProfile } = useUserProfile();
const router = useRouter();

const userInput = ref('');
const showHistory = ref(false);
const chatContainer = ref(null);
const showNextStageButton = ref(false);
const releaseOverlayActive = ref(false);
const releaseOverlay = ref(null);
const releaseTunnel = ref(null);
const releaseCopy = ref(null);
const releaseTargetId = ref('');
const isReleasing = ref(false);
const freeQuota = ref(null);
const quotaLoading = ref(false);
const showQuotaConfirm = ref(false);
const pendingChargeMessage = ref('');
const FREE_QUOTA_LOCAL_KEY = 'ns_ai_free_quota_remaining';
const PROPOSAL_CARD_HINT = '已生成产品孵化提案，见下方 Proposal Card。';

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

watch(() => state.messages.length, scrollToBottom);
watch(() => state.messages[state.messages.length - 1]?.content, scrollToBottom, { deep: true });

const persistLocalQuota = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return;
  }
  localStorage.setItem(FREE_QUOTA_LOCAL_KEY, String(Math.max(0, Math.floor(value))));
};

const restoreLocalQuota = () => {
  const raw = localStorage.getItem(FREE_QUOTA_LOCAL_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
};

const resolveQuotaFromProfile = (profile) => {
  if (!profile || typeof profile !== 'object') {
    return null;
  }

  const directCandidates = [
    profile.aiFreeRemaining,
    profile.freeAiRemaining,
    profile.freeAiQuotaRemaining,
    profile.freeQuotaRemaining
  ];

  for (const item of directCandidates) {
    const parsed = Number(item);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }

  const usage = profile.aiUsage || {};
  const quota = Number(usage.freeQuota || usage.dailyFreeQuota || usage.totalFreeQuota);
  const used = Number(usage.freeUsedToday || usage.usedToday || usage.freeUsed || 0);
  if (Number.isFinite(quota)) {
    return Math.max(0, Math.floor(quota - (Number.isFinite(used) ? used : 0)));
  }

  return null;
};

const loadAiQuota = async () => {
  quotaLoading.value = true;
  try {
    const quotaRes = await UserService.getAiQuota();
    const direct = Number(
      quotaRes?.remaining ??
      quotaRes?.freeRemaining ??
      quotaRes?.freeQuotaRemaining ??
      quotaRes?.data?.remaining ??
      quotaRes?.data?.freeRemaining
    );
    if (Number.isFinite(direct)) {
      freeQuota.value = Math.max(0, Math.floor(direct));
      persistLocalQuota(freeQuota.value);
      return;
    }

    const fromProfile = resolveQuotaFromProfile(quotaRes?.profile || quotaRes?.data?.profile);
    if (fromProfile !== null) {
      freeQuota.value = fromProfile;
      persistLocalQuota(freeQuota.value);
      return;
    }

    throw new Error('No quota payload');
  } catch (error) {
    try {
      const profile = await UserService.getProfile();
      const fromProfile = resolveQuotaFromProfile(profile);
      if (fromProfile !== null) {
        freeQuota.value = fromProfile;
        persistLocalQuota(freeQuota.value);
        return;
      }
    } catch {
      // ignored, fallback below
    }

    const localQuota = restoreLocalQuota();
    freeQuota.value = localQuota !== null ? localQuota : 5;
    persistLocalQuota(freeQuota.value);
  } finally {
    quotaLoading.value = false;
  }
};

const toCleanString = (value) => {
  if (value == null) {
    return '';
  }

  return String(value).trim();
};

const toNumberPrice = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const normalized = String(value ?? '')
    .replace(/[,，]/g, '')
    .replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const pickField = (obj, keys) => {
  if (!obj || typeof obj !== 'object') {
    return null;
  }

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }

  return null;
};

const normalizeTags = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => toCleanString(item)).filter(Boolean).slice(0, 8);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\s，、|/]+/)
      .map((item) => toCleanString(item).replace(/^#/, ''))
      .filter(Boolean)
      .slice(0, 8);
  }

  return [];
};

const normalizeSellingPoints = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => toCleanString(item)).filter(Boolean).slice(0, 5);
  }

  if (typeof value === 'string') {
    return value
      .split(/\n|[;；。]/)
      .map((item) => toCleanString(item).replace(/^[-*•\d.、\s]+/, ''))
      .filter(Boolean)
      .slice(0, 5);
  }

  return [];
};

const extractImageUrlFromMarkdown = (text = '') => {
  const matches = [...String(text).matchAll(/!\[[^\]]*?\]\((https?:\/\/[^)\s]+)\)/gi)];
  if (!matches.length) {
    return '';
  }

  return matches[matches.length - 1][1] || '';
};

const extractJsonPayloads = (text = '') => {
  const payloads = [];
  
  // 1. Try to find fenced JSON blocks (closed or unclosed)
  const fencedRegex = /```(?:json)?\s*([\s\S]*?)(?:```|$)/gi;
  let match = fencedRegex.exec(text);

  while (match) {
    try {
      let jsonStr = match[1].trim();
      // If incomplete, try to cut it at the last closing brace
      if (!jsonStr.endsWith('}') && jsonStr.includes('}')) {
         jsonStr = jsonStr.substring(0, jsonStr.lastIndexOf('}') + 1);
      }
      payloads.push(JSON.parse(jsonStr));
    } catch (error) {
      // Ignore parse errors, likely still streaming
    }
    match = fencedRegex.exec(text);
  }

  if (payloads.length) {
    return payloads;
  }

  // 2. Fallback: Try to find the outermost { } brackets in the whole text
  const cleaned = String(text)
    .replace(/<think>[\s\S]*?(<\/think>|$)/gi, '')
    .replace('[CONFIRM]', '')
    .trim();

  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    try {
      payloads.push(JSON.parse(cleaned.substring(startIdx, endIdx + 1)));
    } catch {
      // no-op
    }
  }

  return payloads;
};

const normalizeProposalData = (payload, fallbackImage = '') => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidateRoots = [
    payload,
    payload.serviceData,
    payload.proposal,
    payload.product,
    payload.result,
    payload.result?.serviceData,
    payload.data,
    payload.data?.serviceData
  ].filter((item) => item && typeof item === 'object');

  for (const root of candidateRoots) {
    const title = toCleanString(
      pickField(root, ['title', 'name', 'productName', 'serviceTitle', 'projectTitle', '标题', '名称'])
    );
    const description = toCleanString(
      pickField(root, ['description', 'desc', 'summary', 'overview', 'pitch', '描述', '简介'])
    );
    const price = toNumberPrice(
      pickField(root, ['price', 'pricing', 'currentPrice', 'salePrice', 'finalPrice', '定价', '价格'])
    );
    const imageUrl = toCleanString(
      pickField(root, [
        'image',
        'imageUrl',
        'imageURL',
        'image_url',
        'cover',
        'coverUrl',
        'thumbnail',
        '图片',
        '图片URL',
        '图片链接'
      ])
    ) || fallbackImage;
    const tags = normalizeTags(
      pickField(root, ['tags', 'tagList', 'categories', 'labels', 'keywords', '标签'])
    );
    const type = toCleanString(
      pickField(root, ['type', 'category', 'productType', 'serviceType', '类型', '品类'])
    );
    const sellingPoints = normalizeSellingPoints(
      pickField(root, ['sellingPoints', 'highlights', 'usp', 'keyPoints', 'bulletPoints', '卖点', '核心卖点'])
    );

    if (!title || !description || price === null) {
      continue;
    }

    return {
      title,
      description,
      price,
      type: type || '硬件设备',
      coverUrl: imageUrl,
      imageUrl,
      tags,
      sellingPoints
    };
  }

  return null;
};

const formatProposalPrice = (value) => `¥${Number(value || 0).toFixed(2)}`;

const buildPublishPayload = (proposal) => {
  const highlights = proposal.sellingPoints?.length
    ? `\n\n核心卖点：\n${proposal.sellingPoints.map((point, idx) => `${idx + 1}. ${point}`).join('\n')}`
    : '';

  const coverUrl = proposal.coverUrl || proposal.imageUrl || '';

  return {
    title: proposal.title,
    description: `${proposal.description}${highlights}`,
    price: Number(proposal.price || 0),
    type: proposal.type || '硬件设备',
    tags: Array.isArray(proposal.tags) ? proposal.tags : [],
    coverUrl
  };
};

const publishServiceData = (serviceData) => {
  if (typeof MarketService.publishAIProject === 'function') {
    return MarketService.publishAIProject(serviceData);
  }

  return publishAIToMarket(serviceData);
};

const getPublishButtonLabel = (message) => {
  if (message.isPublishingProposal) {
    return '部署中...';
  }

  if (message.publishState === 'published') {
    return '已部署到创客中心';
  }

  return '🚀 一键部署到创客中心 (Publish to Maker)';
};

const publishProposalToMaker = async (message) => {
  if (!message?.proposalData || message.isPublishingProposal) {
    return;
  }

  message.isPublishingProposal = true;
  message.publishState = null;

  try {
    const payload = buildPublishPayload(message.proposalData);
    const response = await publishServiceData(payload);
    const serviceId = response?.service?.id ? String(response.service.id) : '';

    message.publishState = 'published';
    message.publishedServiceId = serviceId;
    message.chartData = {
      ...(message.chartData && typeof message.chartData === 'object' ? message.chartData : {}),
      publish: true,
      serviceData: payload,
      serviceId: serviceId || message?.chartData?.serviceId,
      result: {
        ...((message.chartData && typeof message.chartData?.result === 'object') ? message.chartData.result : {}),
        serviceId
      }
    };
    store.saveCurrentState();
    showToast('提案已部署到创客中心', 'success');

    if (serviceId) {
      void runReleaseSequence(serviceId);
    }
  } catch (error) {
    message.publishState = 'failed';
    showToast(`发布失败：${error?.message || '请稍后重试'}`, 'error');
  } finally {
    message.isPublishingProposal = false;
  }
};

const openPublishedService = (message) => {
  if (!message?.publishedServiceId) {
    return;
  }

  router.push({ name: 'ProductDetail', params: { id: message.publishedServiceId } });
};

const openMakerServices = () => {
  router.push('/maker/services');
};

const sendMessage = async (forcePaid = false, presetText = null) => {
  const text = (presetText ?? userInput.value).trim();
  if (!text || state.isProcessing) {
    return;
  }

  let deductedFreeQuota = false;
  if (!forcePaid && freeQuota.value !== null && freeQuota.value <= 0) {
    pendingChargeMessage.value = text;
    showQuotaConfirm.value = true;
    return;
  }

  if (!forcePaid && typeof freeQuota.value === 'number' && freeQuota.value > 0) {
    freeQuota.value = Math.max(0, freeQuota.value - 1);
    persistLocalQuota(freeQuota.value);
    deductedFreeQuota = true;
  }

  store.addMessage({
    id: Date.now().toString(),
    role: 'user',
    content: text,
    agentIndex: state.currentStage
  });

  userInput.value = '';
  store.setProcessing(true);
  scrollToBottom();
  const msgId = `ai-${Date.now()}`;

  try {
    const prompt = getAgentPrompt(currentAgent.value, state.currentStage);
    const apiMessages = [
      { role: 'system', content: prompt },
      ...state.messages
        .filter((message) => message.role !== 'system' && message.agentIndex === state.currentStage)
        .map((message) => ({
          role: message.role === 'agent' ? 'assistant' : 'user',
          content: message.content
        }))
        .slice(-10)
    ];

    store.addMessage({
      id: msgId,
      role: 'agent',
      content: '...',
      name: currentAgent.value.name,
      agentIndex: state.currentStage,
      chartData: null,
      proposalData: null,
      publishState: null,
      publishedServiceId: ''
    });

    let rawData = '';

    await callDeepseekAPIStream(
      apiMessages,
      currentAgent.value.id,
      (chunk, buffer) => {
        const message = state.messages.find((item) => item.id === msgId);
        if (!message) {
          return;
        }

        rawData = buffer;

        const thinkMatch = buffer.match(/<think>([\s\S]*?)(<\/think>|$)/i);
        if (thinkMatch) {
          message.thinkStatus = thinkMatch[1].trim() || t('aiLab.thinking');
        } else {
          message.thinkStatus = null;
        }

        let cleanResponse = buffer.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '');
        cleanResponse = cleanResponse.replace('[CONFIRM]', '');
        cleanResponse = cleanResponse.replace(/```json[\s\S]*?```/gi, '');

        message.content = cleanResponse.trim() === '' ? '...' : cleanResponse;
      },
      0.7,
      4000,
      { confirmPaid: forcePaid }
    );

    const message = state.messages.find((item) => item.id === msgId);
    if (message) {
      const payloads = extractJsonPayloads(rawData);
      if (payloads.length) {
        message.chartData = payloads[payloads.length - 1];
        const proposal = normalizeProposalData(
          message.chartData,
          extractImageUrlFromMarkdown(message.content)
        );
        if (proposal) {
          message.proposalData = proposal;
          if (message.content.trim() === '' || message.content.trim() === '...') {
            message.content = PROPOSAL_CARD_HINT;
          }
        }
      }

      if (message.content.includes('[DRAW:')) {
        const drawMatch = message.content.match(/\[DRAW:\s*([^\]]+)\]/i);
        if (drawMatch) {
          const drawPrompt = drawMatch[1];
          message.content = message.content.replace(drawMatch[0], '\n\n*(🚀 正在调用 SiliconFlow 渲染产品效果图，请稍候...)*\n\n');
          try {
             const imgUrl = await generateImage(drawPrompt);
             message.content = message.content.replace('\n\n*(🚀 正在调用 SiliconFlow 渲染产品效果图，请稍候...)*\n\n', `\n\n![Design Image](${imgUrl})\n\n`);
          } catch (e) {
             message.content = message.content.replace('\n\n*(🚀 正在调用 SiliconFlow 渲染产品效果图，请稍候...)*\n\n', '\n\n*(图纸渲染失败，请重试)*\n\n');
          }
        }
      }

      if (message.proposalData && !message.proposalData.imageUrl) {
        const imageFromContent = extractImageUrlFromMarkdown(message.content);
        if (imageFromContent) {
          message.proposalData.imageUrl = imageFromContent;
        }
      }

      store.saveCurrentState();

      if (message.chartData && message.chartData.handoff) {
        setTimeout(() => {
          store.jumpToAgent(message.chartData.handoff);
          const newAgent = agents.find((agent) => agent.id === message.chartData.handoff);
          if (newAgent) {
            store.addMessage({
              id: `ai-init-${Date.now()}`,
              role: 'agent',
              content: t('aiLab.handoffReady', { name: newAgent.name }),
              name: newAgent.name,
              agentIndex: state.currentStage
            });
          }
          scrollToBottom();
        }, 1500);
      }

      if (rawData.includes('[CONFIRM]')) {
        showNextStageButton.value = true;
        scrollToBottom();
      }
    }
  } catch (error) {
    const status = Number(error?.status || error?.response?.status || 0);
    const paymentRequired = status === 402 || String(error?.message || '').includes('402');

    if (deductedFreeQuota && paymentRequired) {
      freeQuota.value = (freeQuota.value ?? 0) + 1;
      persistLocalQuota(freeQuota.value);
    }

    if (paymentRequired) {
      const index = state.messages.findIndex((item) => item.id === msgId);
      if (index !== -1) {
        state.messages.splice(index, 1);
      }
      pendingChargeMessage.value = text;
      showQuotaConfirm.value = true;
      return;
    }

    console.error('Chat error:', error);
    store.addMessage({
      id: `error-${Date.now()}`,
      role: 'agent',
      content: t('aiLab.errorMessage', { message: error.message || t('aiLab.connectionFailed') }),
      name: t('aiLab.system'),
      agentIndex: state.currentStage
    });
  } finally {
    store.setProcessing(false);
  }
};

const handleQuotaConfirm = async () => {
  const cached = pendingChargeMessage.value.trim();
  if (!cached) {
    showQuotaConfirm.value = false;
    return;
  }

  showQuotaConfirm.value = false;
  pendingChargeMessage.value = '';
  await sendMessage(true, cached);
};

const handleGoRecharge = () => {
  showQuotaConfirm.value = false;
  router.push('/wallet');
};

const getAgentPrompt = (agent, stage) => {
  return `${t('aiLab.prompt.youAreNow')} ${agent.name} (${agent.role}).
${t('aiLab.prompt.task')}: ${agent.desc}
${t('aiLab.prompt.currentStage')}: ${stage + 1}/${agents.length}.
${t('aiLab.prompt.instructions')}`;
};

const extractProductIdFromMessages = () => {
  for (let index = state.messages.length - 1; index >= 0; index -= 1) {
    const message = state.messages[index];
    const chart = message?.chartData;
    const candidates = [
      chart?.productId,
      chart?.serviceId,
      chart?.generatedServiceId,
      chart?.result?.productId,
      chart?.result?.serviceId
    ].filter(Boolean);

    if (candidates.length) {
      return String(candidates[0]);
    }

    const content = String(message?.content || '');
    const svcMatch = content.match(/\bsvc-[A-Za-z0-9_-]+\b/);
    if (svcMatch) {
      return svcMatch[0];
    }

    const routeMatch = content.match(/\/product\/([A-Za-z0-9_-]+)/i);
    if (routeMatch) {
      return routeMatch[1];
    }

    const explicitIdMatch = content.match(/\b(?:service|product)[-_ ]?id[:# ]+([A-Za-z0-9_-]+)/i);
    if (explicitIdMatch) {
      return explicitIdMatch[1];
    }
  }

  return '';
};

const resolveReleaseTargetId = async () => {
  // Auto publish sequence: check if sales agent left the final generated payload
  try {
    for (let index = state.messages.length - 1; index >= 0; index -= 1) {
      const message = state.messages[index];
      const chart = message?.chartData || {};
      const existingId = chart?.serviceId || chart?.result?.serviceId || chart?.productId || chart?.result?.productId;
      if (existingId) {
        return String(existingId);
      }

      if (chart.publish && chart.serviceData) {
        const response = await publishServiceData(chart.serviceData);
        if (response && response.service && response.service.id) {
          return String(response.service.id);
        }
      }
    }
  } catch (error) {
    console.error('Failed to auto-publish project during release sequence:', error);
  }

  const parsedId = extractProductIdFromMessages();
  if (parsedId) {
    return parsedId;
  }

  try {
    const featured = await MarketService.getFeaturedServices();
    if (Array.isArray(featured) && featured[0]?.id != null) {
      return String(featured[0].id);
    }
  } catch (error) {
    console.error('Unable to resolve featured service for release target', error);
  }

  return '';
};

const runReleaseSequence = async (preferredTargetId = '') => {
  if (isReleasing.value) {
    return;
  }

  isReleasing.value = true;
  releaseTargetId.value = preferredTargetId || await resolveReleaseTargetId();
  releaseOverlayActive.value = true;
  await nextTick();

  await new Promise((resolve) => {
    gsap.set(releaseOverlay.value, { opacity: 0, backgroundColor: '#000000' });
    gsap.set(releaseTunnel.value, { opacity: 0, scale: 0.72, filter: 'brightness(0.45)' });
    gsap.set(releaseCopy.value, { opacity: 0, y: 22 });

    gsap
      .timeline({
        defaults: { ease: 'power3.out' },
        onComplete: resolve
      })
      .to(releaseOverlay.value, { opacity: 1, duration: 0.25 })
      .to(releaseTunnel.value, { opacity: 1, scale: 1, duration: 0.7 }, 0)
      .to(releaseCopy.value, { opacity: 1, y: 0, duration: 0.45 }, 0.12)
      .to(releaseTunnel.value, { scale: 1.85, duration: 0.9, ease: 'power4.in' }, '>-0.08')
      .to(releaseOverlay.value, { backgroundColor: '#f8fafc', duration: 0.35 }, '>-0.16');
  });

  const targetRoute = releaseTargetId.value
    ? { name: 'ProductDetail', params: { id: releaseTargetId.value } }
    : { name: 'Market' };

  await router.push(targetRoute);
  releaseOverlayActive.value = false;
  isReleasing.value = false;
};

const handleNextStage = () => {
  showNextStageButton.value = false;
  const current = currentAgent.value || agents[0];

  if (store.nextStage()) {
    store.addMessage({
      id: `sys-handoff-${Date.now()}`,
      role: 'system',
      content: t('aiLab.switching', { role: current.role }),
      agentIndex: state.currentStage
    });

    setTimeout(() => {
      const newAgent = currentAgent.value || agents[state.currentStage];
      store.addMessage({
        id: `ai-init-${Date.now()}`,
        role: 'agent',
        content: t('aiLab.nextReady', { name: newAgent.name }),
        name: newAgent.name,
        agentIndex: state.currentStage
      });
    }, 1000);
  } else {
    showToast(t('aiLab.released'), 'success');
    void runReleaseSequence();
  }
};

const handleLoadSession = (session) => {
  store.loadSession(session);
  showHistory.value = false;
  setTimeout(scrollToBottom, 100);
};

const handleStartNewChat = () => {
  store.startNewChat();
  showHistory.value = false;
};

const handleExport = () => {
  const content = state.messages
    .map((message) => `${message.role === 'user' ? t('aiLab.user') : message.name}: ${message.content}`)
    .join('\n\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `NS_Incubation_Report_${Date.now()}.txt`;
  link.click();
  URL.revokeObjectURL(url);
  showToast(t('aiLab.exported'), 'success');
};

onMounted(() => {
  store.initStore();
  void loadAiQuota();
  setTimeout(scrollToBottom, 100);
});

const parseMarkdown = (text) => {
  if (!text) {
    return '';
  }

  return text
    .replace(/\!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="width: 100%; max-width: 500px; margin-top: 1rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-black/30 p-3 rounded-2xl my-3 overflow-x-auto border border-white/6"><code class="text-xs">$1</code></pre>'
    )
    .replace(/\n/g, '<br>');
};

const getChartOption = (data) => {
  return {
    tooltip: { trigger: 'item' },
    legend: { top: '5%', left: 'center', textStyle: { color: '#fff' } },
    series: [
      {
        name: t('aiLab.chart.analysis'),
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#0a0a0a',
          borderWidth: 2
        },
        label: { show: false, position: 'center' },
        emphasis: {
          label: { show: true, fontSize: 20, fontWeight: 'bold', color: '#fff' }
        },
        labelLine: { show: false },
        data: data.chartData
      }
    ]
  };
};
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-black pt-16 text-white">
    <header class="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/5 bg-black/50 px-4 backdrop-blur">
      <div class="flex items-center gap-3">
        <span class="text-xl text-white/80">+</span>
        <div>
          <h1 class="hidden text-sm font-semibold uppercase tracking-[0.22em] text-white sm:block">{{ $t('aiLab.title') }}</h1>
          <h1 class="text-sm font-semibold uppercase tracking-[0.22em] text-white sm:hidden">{{ $t('aiLab.shortTitle') }}</h1>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          class="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06]"
          @click="handleExport"
        >
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
          <span class="hidden sm:inline">{{ $t('aiLab.actions.export') }}</span>
        </button>
        <button
          class="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06]"
          @click="showHistory = !showHistory"
        >
          {{ $t('aiLab.actions.history') }}
        </button>
        <button
          class="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-slate-100"
          @click="handleStartNewChat"
        >
          {{ $t('aiLab.actions.newProject') }}
        </button>
      </div>
    </header>

    <div class="relative flex flex-1 overflow-hidden">
      <aside class="custom-scrollbar hidden w-72 flex-col overflow-y-auto border-r border-white/5 bg-black md:flex">
        <div class="p-4">
          <p class="mb-4 text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">{{ $t('aiLab.agentChain') }}</p>
          <div class="space-y-2">
            <div
              v-for="(agent, idx) in agents"
              :key="agent.id"
              class="relative flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 transition-all"
              :class="state.currentStage === idx ? 'border-l-2 border-white/80 bg-white/[0.04] opacity-100' : 'opacity-40 hover:opacity-70'"
            >
              <div class="text-xl">{{ agent.avatar }}</div>
              <div>
                <div class="text-sm font-semibold text-white">{{ agent.name }}</div>
                <div class="text-[11px] uppercase tracking-[0.18em] text-slate-500">{{ agent.role }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-auto border-t border-white/5 p-4 text-center text-[11px] uppercase tracking-[0.18em] text-slate-600">
          {{ $t('aiLab.poweredBy') }}
        </div>
      </aside>

      <transition name="slide">
        <div v-if="showHistory" class="absolute inset-0 z-50 flex bg-black/80" @click.self="showHistory = false">
          <div class="custom-scrollbar h-full w-80 overflow-y-auto border-r border-white/5 bg-black/95 p-4 shadow-2xl backdrop-blur-xl">
            <div class="mb-6 flex items-center justify-between">
              <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-white">{{ $t('aiLab.actions.history') }}</h2>
              <button class="text-slate-500 transition hover:text-white" @click="showHistory = false">&times;</button>
            </div>

            <div v-if="state.historySessions.length === 0" class="py-10 text-center text-sm text-slate-600">
              {{ $t('aiLab.noHistory') }}
            </div>

            <div
              v-for="session in state.historySessions"
              :key="session.id"
              class="group mb-3 cursor-pointer rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]"
              @click="handleLoadSession(session)"
            >
              <div class="mb-2 text-sm font-semibold text-white">{{ session.title }}</div>
              <div class="flex justify-between text-[11px] uppercase tracking-[0.12em] text-slate-500">
                <span>{{ session.date }}</span>
                <span>{{ $t('aiLab.stageLabel') }} {{ session.currentStage + 1 }}</span>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <main class="relative flex w-full flex-1 flex-col overflow-hidden bg-black">
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,_rgba(255,255,255,0.06),_transparent_20%),radial-gradient(circle_at_78%_20%,_rgba(255,255,255,0.04),_transparent_18%),radial-gradient(circle_at_50%_72%,_rgba(255,255,255,0.03),_transparent_24%)]"></div>

        <div ref="chatContainer" class="custom-scrollbar relative z-10 flex-1 overflow-y-auto px-4 pb-28 pt-6">
          <div class="mx-auto w-full max-w-4xl space-y-8">
            <div v-for="msg in state.messages" :key="msg.id" class="w-full">
              <div v-if="msg.role === 'system'" class="flex justify-center py-2">
                <div v-if="!msg.isAction" class="rounded-full border border-white/5 bg-white/[0.02] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {{ msg.content }}
                </div>
              </div>

              <div v-else-if="msg.role === 'agent'" class="animate-fade-in flex gap-4">
                <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-sm text-white/85">
                  {{ agents[msg.agentIndex]?.avatar || '+' }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="mb-3 flex items-center gap-2">
                    <span class="text-xs font-semibold uppercase tracking-[0.18em] text-white/85">{{ msg.name }}</span>
                    <span class="text-[10px] uppercase tracking-[0.14em] text-slate-500">{{ agents[msg.agentIndex]?.role }}</span>
                  </div>

                  <div class="border-l border-white/10 pl-6">
                    <div v-if="msg.thinkStatus" class="terminal-breathe mb-4 font-mono text-xs leading-6 text-white/40">
                      {{ msg.thinkStatus }}
                    </div>

                    <div class="prose-shell text-sm leading-8 text-slate-200" v-html="parseMarkdown(msg.content)"></div>

                    <div
                      v-if="msg.proposalData"
                      class="proposal-card relative mt-5 overflow-hidden rounded-[1.6rem] border border-cyan-200/20 p-4 shadow-[0_24px_80px_rgba(3,105,161,0.28)]"
                    >
                      <div class="proposal-orb pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-cyan-300/30 blur-3xl"></div>
                      <div class="proposal-orb pointer-events-none absolute -bottom-20 -right-10 h-48 w-48 rounded-full bg-blue-500/30 blur-3xl"></div>

                      <div class="relative z-10 grid gap-4 md:grid-cols-[1.05fr_1fr]">
                        <div class="relative overflow-hidden rounded-2xl border border-white/20 bg-black/30">
                          <img
                            v-if="msg.proposalData.imageUrl"
                            :src="msg.proposalData.imageUrl"
                            :alt="msg.proposalData.title"
                            class="h-full min-h-[220px] w-full object-cover"
                          />
                          <div v-else class="flex min-h-[220px] items-center justify-center text-sm uppercase tracking-[0.2em] text-cyan-100/70">
                            AI Visual Pending
                          </div>
                          <div class="absolute left-3 top-3 rounded-full border border-white/25 bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                            Proposal Card
                          </div>
                        </div>

                        <div class="flex flex-col gap-4">
                          <div>
                            <p class="text-[11px] uppercase tracking-[0.26em] text-cyan-100/70">Product Incubation Proposal</p>
                            <h3 class="mt-2 text-xl font-semibold tracking-tight text-white">{{ msg.proposalData.title }}</h3>
                            <p class="mt-2 text-sm leading-7 text-slate-200/90">{{ msg.proposalData.description }}</p>
                          </div>

                          <div class="rounded-2xl border border-white/15 bg-white/[0.08] p-3">
                            <p class="text-[10px] uppercase tracking-[0.22em] text-cyan-100/70">Pricing</p>
                            <p class="mt-2 text-2xl font-semibold text-cyan-100">{{ formatProposalPrice(msg.proposalData.price) }}</p>
                          </div>

                          <div v-if="msg.proposalData.sellingPoints?.length" class="space-y-2">
                            <p class="text-[10px] uppercase tracking-[0.22em] text-cyan-100/70">Selling Points</p>
                            <div class="space-y-2">
                              <div
                                v-for="(point, idx) in msg.proposalData.sellingPoints"
                                :key="`${msg.id}-point-${idx}`"
                                class="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs leading-6 text-slate-100"
                              >
                                {{ point }}
                              </div>
                            </div>
                          </div>

                          <div v-if="msg.proposalData.tags?.length" class="flex flex-wrap gap-2">
                            <span
                              v-for="tag in msg.proposalData.tags"
                              :key="`${msg.id}-tag-${tag}`"
                              class="rounded-full border border-cyan-100/30 bg-cyan-300/15 px-2.5 py-1 text-[11px] font-medium text-cyan-100"
                            >
                              #{{ tag }}
                            </span>
                          </div>

                          <div class="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              class="rounded-xl bg-cyan-200 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                              :disabled="msg.isPublishingProposal || msg.publishState === 'published'"
                              @click="publishProposalToMaker(msg)"
                            >
                              {{ getPublishButtonLabel(msg) }}
                            </button>
                            <button
                              v-if="msg.publishedServiceId"
                              type="button"
                              class="rounded-xl border border-white/20 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.12]"
                              @click="openPublishedService(msg)"
                            >
                              查看已发布商品
                            </button>
                            <button
                              v-if="msg.publishState === 'published'"
                              type="button"
                              class="rounded-xl border border-white/20 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.12]"
                              @click="openMakerServices"
                            >
                              前往创客中心
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div v-if="msg.chartData && msg.chartData.chartData" class="mt-5 h-64 w-full rounded-2xl border border-white/5 bg-white/[0.02] p-2">
                      <v-chart class="h-full w-full" :option="getChartOption(msg.chartData)" autoresize />
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="animate-fade-in flex flex-row-reverse gap-4">
                <div class="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border border-white/8 bg-white/[0.03]">
                  <img :src="userProfile.userInfo.avatar" class="h-full w-full object-cover">
                </div>
                <div class="max-w-[82%] text-right">
                  <div class="inline-block border-r border-white/20 pr-6 text-sm leading-8 text-white">
                    {{ msg.content }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="relative z-10 px-4 pb-5">
          <div class="mx-auto max-w-4xl">
            <div class="mb-3 flex justify-start">
              <div class="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                <span>⚡</span>
                <span>剩余免费次数：{{ quotaLoading ? '...' : (freeQuota > 9000 ? '不限' : (freeQuota ?? '--') + '次') }}</span>
              </div>
            </div>
            <div class="relative">
              <input
                v-model="userInput"
                :disabled="state.isProcessing"
                type="text"
                class="w-full rounded-full border border-white/10 bg-white/5 py-4 pl-6 pr-16 text-white backdrop-blur-xl outline-none transition-all placeholder:text-white/30 focus:bg-white/10 focus:ring-1 focus:ring-white/20"
                :placeholder="state.isProcessing ? $t('aiLab.inputThinking') : $t('aiLab.inputPlaceholder')"
                @keydown.enter="sendMessage"
              >
              <button
                class="absolute right-2 top-2 flex aspect-square h-[calc(100%-1rem)] items-center justify-center rounded-full bg-white text-black transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="state.isProcessing || !userInput.trim()"
                @click="sendMessage"
              >
                <svg v-if="!state.isProcessing" class="h-5 w-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
                <svg v-else class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </button>
            </div>
            <div class="mt-2 text-center text-[10px] uppercase tracking-[0.12em] text-slate-600">
              {{ $t('aiLab.disclaimer') }}
            </div>
          </div>
        </div>

        <transition name="pop">
          <button
            v-if="showNextStageButton"
            class="absolute bottom-24 right-6 z-20 rounded-full border border-white/10 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-black shadow-[0_18px_40px_rgba(0,0,0,0.4)] transition hover:bg-slate-100"
            :disabled="isReleasing"
            @click="handleNextStage"
          >
            {{ $t('aiLab.actions.nextStage') }}
          </button>
        </transition>
      </main>
    </div>

    <div v-if="showQuotaConfirm" class="fixed inset-0 z-[130] flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="showQuotaConfirm = false"></div>
      <div class="quota-modal relative w-full max-w-md rounded-[1.6rem] border border-white/10 bg-[#0a0a0c]/95 p-6 shadow-[0_40px_110px_rgba(0,0,0,0.65)]">
        <h3 class="text-xl font-semibold tracking-tight text-white">免费额度已耗尽</h3>
        <p class="mt-3 text-sm leading-7 text-slate-300">继续探索灵感需要扣费（0.1元/次）噢~ 是否继续？</p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/[0.08]"
            @click="handleGoRecharge"
          >
            去充值
          </button>
          <button
            type="button"
            class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-slate-100"
            @click="handleQuotaConfirm"
          >
            确认扣费
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="releaseOverlayActive"
      ref="releaseOverlay"
      class="pointer-events-none fixed inset-0 z-[140] overflow-hidden bg-black"
    >
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08),_transparent_32%)]"></div>
      <div
        ref="releaseTunnel"
        class="absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 shadow-[0_0_80px_rgba(255,255,255,0.18)]"
      >
        <div class="absolute inset-[-16%] rounded-full border border-white/12"></div>
        <div class="absolute inset-[-34%] rounded-full border border-white/8"></div>
        <div class="absolute inset-[18%] rounded-full border border-white/16"></div>
      </div>
      <div ref="releaseCopy" class="absolute inset-x-0 top-1/2 mt-40 text-center">
        <p class="text-[11px] font-semibold uppercase tracking-[0.42em] text-white/60">{{ $t('aiLab.releaseTitle') }}</p>
        <p class="mt-4 text-sm uppercase tracking-[0.18em] text-white/75">{{ $t('aiLab.releaseSubtitle') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.quota-modal > h3:first-of-type {
  display: none;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}

.terminal-breathe {
  animation: terminalBreathe 2.6s ease-in-out infinite;
}

.prose-shell :deep(pre) {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.proposal-card {
  background:
    linear-gradient(140deg, rgba(12, 74, 110, 0.44), rgba(30, 41, 59, 0.56)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0));
  backdrop-filter: blur(20px);
}

.proposal-orb {
  animation: proposalOrbPulse 6s ease-in-out infinite;
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

@keyframes terminalBreathe {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes proposalOrbPulse {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(8px, -10px, 0) scale(1.08);
  }
}

.pop-enter-active,
.pop-leave-active {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: scale(0.5) translateY(20px);
}
</style>
