<script setup>
import { onMounted, ref } from 'vue';
import { useAILabStore } from '../../store/aiLab';
import { useRouter } from 'vue-router';

const store = useAILabStore();
const router = useRouter();

const projects = ref([]);
const activeProject = ref(null);
const showChat = ref(false);
const chatInput = ref('');
const chatMessages = ref([]);

onMounted(() => {
  store.initStore();
  projects.value = store.state.historySessions || [];
});

const openProject = (project) => {
  store.loadSession(project);
  router.push('/ai-lab');
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
};

const sendMentorMessage = () => {
  const userText = chatInput.value.trim();
  if (!userText) {
    return;
  }

  chatMessages.value.push({ role: 'user', content: userText });
  chatInput.value = '';

  setTimeout(() => {
    const projectIndex = store.state.historySessions.findIndex((item) => item.id === activeProject.value.id);

    if (projectIndex !== -1) {
      const note = {
        id: `mentor-note-${Date.now()}`,
        role: 'system',
        content: `[AI 导师补充] 用户在创客中心追加了新的思路：${userText}`,
        agentIndex: store.state.historySessions[projectIndex].currentStage
      };

      store.state.historySessions[projectIndex].messages.push(note);

      if (store.state.currentSessionId === activeProject.value.id) {
        store.state.messages.push(note);
        store.saveCurrentState();
      } else {
        localStorage.setItem('ns_ailab_sessions_v2', JSON.stringify(store.state.historySessions));
      }
    }

    chatMessages.value.push({
      role: 'agent',
      content: '这个方向值得继续深挖。我建议下一步优先验证目标用户、成本结构和最小可交付版本。'
    });
  }, 900);
};

const formatDate = (value) => value || '刚刚';
</script>

<template>
  <div class="space-y-6 text-slate-900 transition-colors duration-500 dark:text-white">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-400 dark:text-slate-500">AI Incubation</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">AI 孵化记录</h1>
        <p class="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
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
      <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">去 AI Lab 开启你的第一个从 0 到 1 项目。</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-4">
      <article
        v-for="project in projects"
        :key="project.id"
        class="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-white/5 dark:bg-white/[0.02] dark:shadow-[0_20px_60px_rgba(0,0,0,0.28)] dark:backdrop-blur-xl dark:hover:border-white/10"
      >
        <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <span>{{ formatDate(project.date) }}</span>
              <span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                Stage {{ (project.currentStage || 0) + 1 }}
              </span>
            </div>
            <h2 class="mt-3 text-xl font-semibold text-slate-900 dark:text-white">{{ project.title }}</h2>
            <p class="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-400">
              {{ project.preview || '这是一条尚未生成摘要的项目记录。' }}
            </p>
          </div>

          <div class="flex w-full flex-col gap-2 sm:w-auto">
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
    </div>

    <div v-if="showChat" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showChat = false"></div>

      <div class="relative z-10 flex h-[min(80vh,640px)] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl transition-colors dark:border-white/10 dark:bg-[#050505]">
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-white/5">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">AI Mentor</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{{ activeProject?.title }}</h3>
          </div>
          <button
            type="button"
            class="text-2xl leading-none text-slate-400 transition hover:text-slate-700 dark:text-slate-500 dark:hover:text-white"
            @click="showChat = false"
          >
            ×
          </button>
        </div>

        <div class="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div
            v-for="(message, index) in chatMessages"
            :key="`${message.role}-${index}`"
            class="flex"
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
              {{ message.content }}
            </div>
          </div>
        </div>

        <div class="border-t border-slate-200 px-6 py-5 dark:border-white/5">
          <div class="flex gap-3">
            <input
              v-model="chatInput"
              type="text"
              placeholder="输入新的想法，AI 导师会同步记录到当前项目..."
              class="flex-1 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/30 dark:focus:border-white/20"
              @keyup.enter="sendMentorMessage"
            />
            <button
              type="button"
              class="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-slate-100"
              @click="sendMentorMessage"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
