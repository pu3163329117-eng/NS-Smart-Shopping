<script setup>
import { computed, onMounted, ref } from 'vue';
import { useAILabStore } from '../../store/aiLab';
import { useRouter } from 'vue-router';
import { callDeepseekAPIStream } from '../../services/aiService';
import ServiceWizard from './ServiceWizard.vue';

const store = useAILabStore();
const router = useRouter();

const projects = ref([]);
const activeProject = ref(null);
const showChat = ref(false);
const chatInput = ref('');
const chatMessages = ref([]);
const isMentoring = ref(false);
const chatContainer = ref(null);
const isListExpanded = ref(false);
const showWizard = ref(false);
const wizardSeed = ref(null);

onMounted(() => {
  store.initStore();
  projects.value = store.state.historySessions || [];
});

const openProject = (project) => {
  store.loadSession(project);
  router.push('/ai-lab');
};

const publishToMarket = (project) => {
  const fullContent = (project.messages && project.messages.length > 0) 
    ? project.messages[project.messages.length - 1].content 
    : project.preview;
    
  wizardSeed.value = {
    title: project.title || '我的 AI 孵化项目',
    description: fullContent ? fullContent.slice(0, 150) + '...' : '',
    details: fullContent || '',
    type: '3d_print',
    productionMode: 'factory',
    price: 99,
    tags: ['AI Incubated', '创客']
  };
  showWizard.value = true;
};

const handlePublishSuccess = () => {
  showWizard.value = false;
  // Use timeout to let the success toast from ServiceWizard show first
  setTimeout(() => {
    router.push('/market');
  }, 1000);
};

const openMentorChat = (project) => {
  activeProject.value = project;
  showChat.value = true;
  chatMessages.value = [
    {
      role: 'agent',
      content: `我已经载入项目“${project.title}”的上下文。你可以继续追问方案、供应链、定价或下一步迭代。`
    }
  ];

  // Load previous mentor session context if it exists
  if (project.messages && project.messages.length > 0) {
    const mentorNotes = project.messages.filter(m => m.content && m.content.startsWith('[AI 导师复盘]'));
    mentorNotes.forEach(note => {
      // Parse out the original user text and mentor text
      const match = note.content.match(/\[AI 导师复盘\]\s*用户：([\s\S]*?)\n导师：([\s\S]*)/);
      if (match) {
        chatMessages.value.push({ role: 'user', content: match[1].trim() });
        chatMessages.value.push({ role: 'agent', content: match[2].trim() });
      } else {
        chatMessages.value.push({ role: 'agent', content: note.content });
      }
    });
  }
};

const scrollToBottom = () => {
  setTimeout(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  }, 50);
};

const sendMentorMessage = async () => {
  const userText = chatInput.value.trim();
  if (!userText || isMentoring.value) {
    return;
  }

  isMentoring.value = true;
  chatMessages.value.push({ role: 'user', content: userText });
  chatInput.value = '';
  scrollToBottom();

  const projectIndex = store.state.historySessions.findIndex((item) => item.id === activeProject.value.id);
  const currentStage = activeProject.value?.currentStage || 0;
  let historyNotes = [];
  
  if (projectIndex !== -1) {
    historyNotes = store.state.historySessions[projectIndex]?.messages || [];
  }

  const systemPrompt = `你现在是 NS-AI 孵化器的 AI 创客导师 (AI Mentor)。
用户之前在 AI Lab 进行了孵化，现在的阶段是 ${currentStage + 1}。
目前用户在创客中心，针对这个名为“${activeProject.value?.title || '未命名'}”的项目，向你请教后续复盘、建议或优化方向。
请根据用户的描述，提供专业、有启发且切合实际的商业及技术建议，保持鼓励和建设性的态度。尽量不要太啰嗦。`;

  const aiMessages = [{ role: 'system', content: systemPrompt }];
  
  const contextText = historyNotes
    .filter(m => m.role !== 'system')
    .slice(-8)
    .map(m => `${m.role === 'agent' ? 'AI' : 'User'}: ${m.content}`)
    .join('\n');
    
  if (contextText) {
    aiMessages.push({ role: 'system', content: `以下是之前的孵化核心记录，供你参考:\n${contextText}` });
  }

  aiMessages.push({ role: 'user', content: userText });

  const msgIndex = chatMessages.value.push({ role: 'agent', content: '...' }) - 1;
  scrollToBottom();

  try {
    let rawData = '';
    await callDeepseekAPIStream(
      aiMessages,
      'planner',
      (chunk, buffer) => {
        rawData = buffer;
        const cleanResponse = buffer.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '');
        chatMessages.value[msgIndex].content = cleanResponse.trim() === '' ? '...' : cleanResponse;
        scrollToBottom();
      },
      0.7,
      2000
    );

    if (projectIndex !== -1) {
      const note = {
        id: `mentor-note-${Date.now()}`,
        role: 'system',
        content: `[AI 导师复盘] 用户：${userText}\n导师：${chatMessages.value[msgIndex].content}`,
        agentIndex: currentStage
      };

      store.state.historySessions[projectIndex].messages.push(note);

      if (store.state.currentSessionId === activeProject.value.id) {
        store.state.messages.push(note);
        store.saveCurrentState();
      } else {
        localStorage.setItem('ns_ailab_sessions_v2', JSON.stringify(store.state.historySessions));
      }
    }
  } catch (error) {
    console.error('Mentor chat error:', error);
    if (chatMessages.value[msgIndex]) {
      chatMessages.value[msgIndex].content = `(AI 服务暂时不可用：${error.message})`;
    }
  } finally {
    isMentoring.value = false;
    scrollToBottom();
  }
};

const formatDate = (value) => value || '刚刚';
</script>

<template>
  <div class="space-y-6 text-slate-900 transition-colors duration-500 dark:text-white">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-600 dark:text-slate-400">AI Incubation</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">AI 孵化记录</h1>
        <p class="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-300">
          查看历史项目，并在创客中心内继续调用 AI 导师补充想法。
        </p>
      </div>

      <button
        type="button"
        class="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-slate-100"
        @click="router.push('/ai-lab')"
      >
        新建孵化项目
      </button>
    </div>

    <div
      v-if="projects.length === 0"
      class="rounded-[2rem] border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm transition-colors dark:border-white/10 dark:bg-white/[0.02] dark:backdrop-blur-xl"
    >
      <div class="text-5xl text-slate-300 dark:text-white/30">+</div>
      <h2 class="mt-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">暂无孵化记录</h2>
      <p class="mt-3 text-sm text-slate-700 dark:text-slate-300">去 AI Lab 开启你的第一个从 0 到 1 项目。</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-4">
      <article
        v-for="project in (isListExpanded ? projects : projects.slice(0, 2))"
        :key="project.id"
        class="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-white/5 dark:bg-white/[0.02] dark:shadow-[0_20px_60px_rgba(0,0,0,0.28)] dark:backdrop-blur-xl dark:hover:border-white/10"
      >
        <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span>{{ formatDate(project.date) }}</span>
              <span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                Stage {{ (project.currentStage || 0) + 1 }}
              </span>
            </div>
            <h2 class="mt-3 text-xl font-semibold text-slate-900 dark:text-white">{{ project.title }}</h2>
            
            <div class="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-400 transition-all">
              <div class="whitespace-pre-wrap break-all">
                {{ project.isExpanded 
                   ? (project.messages && project.messages.length > 0 ? project.messages[project.messages.length - 1].content : (project.preview || '这是一条尚未生成摘要的项目记录。')) 
                   : ((project.messages && project.messages.length > 0 ? project.messages[project.messages.length - 1].content : project.preview) && (project.messages && project.messages.length > 0 ? project.messages[project.messages.length - 1].content : project.preview).length > 45 
                      ? (project.messages && project.messages.length > 0 ? project.messages[project.messages.length - 1].content : project.preview).slice(0, 45) + '...' 
                      : (project.messages && project.messages.length > 0 ? project.messages[project.messages.length - 1].content : project.preview) || '这是一条尚未生成摘要的项目记录。') 
                }}
              </div>
              <button 
                v-if="(project.messages && project.messages.length > 0 ? project.messages[project.messages.length - 1].content : project.preview) && (project.messages && project.messages.length > 0 ? project.messages[project.messages.length - 1].content : project.preview).length > 45"
                @click="project.isExpanded = !project.isExpanded" 
                class="mt-2 text-[11px] font-semibold tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                {{ project.isExpanded ? '收起 (Collapse)' : '展开摘要 (Expand)' }}
              </button>
            </div>
          </div>

          <div class="flex w-full flex-col gap-2 sm:w-auto">
            <button
              type="button"
              class="rounded-2xl border border-transparent bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:from-indigo-600 hover:to-blue-700"
              @click="publishToMarket(project)"
            >
              一键发布至多元市场
            </button>
            <button
              type="button"
              class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:bg-white/[0.06]"
              @click="openProject(project)"
            >
              继续孵化
            </button>
            <button
              type="button"
              class="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-slate-100"
              @click="openMentorChat(project)"
            >
              AI 导师复盘
            </button>
          </div>
        </div>
      </article>

      <button
        v-if="projects.length > 2"
        @click="isListExpanded = !isListExpanded"
        class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-400 dark:hover:bg-white/[0.04]"
      >
        {{ isListExpanded ? '收起历史孵化记录' : `展示全部孵化记录 (${projects.length})` }}
      </button>
    </div>

    <div v-if="showChat" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="showChat = false"></div>
      <div class="relative flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-[0_20px_80px_rgba(0,0,0,0.15)] dark:bg-slate-900">
        <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
          <div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">AI 导师复盘</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">基于 {{ activeProject?.title }} 的脱机指导</p>
          </div>
          <button @click="showChat = false" class="rounded-full p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white">✕</button>
        </div>

        <div ref="chatContainer" class="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div
            v-for="(message, index) in chatMessages"
            :key="`${message.role}-${index}`"
            class="flex w-full"
            :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[85%] rounded-3xl px-5 py-4 text-sm leading-7"
              :class="
                message.role === 'user'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-300'
              "
            >
              <template v-if="message.role === 'agent' && message.content && message.content.length > 200">
                <div :class="!message.isExpanded ? 'line-clamp-4 overflow-hidden' : 'whitespace-pre-wrap'" style="display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4;">{{ message.content }}</div>
                <button @click="message.isExpanded = !message.isExpanded" class="mt-3 font-semibold text-slate-900 underline decoration-slate-300 decoration-2 underline-offset-4 hover:decoration-slate-500 dark:text-white dark:decoration-white/30 dark:hover:decoration-white">
                  {{ message.isExpanded ? '收起 (Collapse)' : '展开复盘 (Read More)' }}
                </button>
              </template>
              <template v-else>
                <div class="whitespace-pre-wrap break-all">{{ message.content }}</div>
              </template>
            </div>
          </div>
        </div>

        <div class="border-t border-slate-100 bg-white p-4 dark:border-white/5 dark:bg-slate-900">
          <div class="flex gap-3">
            <input
              v-model="chatInput"
              type="text"
              placeholder="向导师询问细节或建议..."
              class="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none dark:border-white/10 dark:bg-white/[0.02] dark:text-white"
              @keyup.enter="sendMentorMessage"
            >
            <button
              :disabled="!chatInput.trim() || isMentoring"
              class="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-slate-200"
              @click="sendMentorMessage"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- One-click publish: AI incubation → Market -->
    <ServiceWizard
      v-if="showWizard"
      :initial-data="wizardSeed"
      :is-incubation-seed="true"
      @close="showWizard = false"
      @success="handlePublishSuccess"
    />
  </div>
</template>
