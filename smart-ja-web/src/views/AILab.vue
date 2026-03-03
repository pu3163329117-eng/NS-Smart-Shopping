<script setup>
import { ref, nextTick, watch, onMounted } from 'vue';
import { useToast } from '../composables/useToast';
import { callDeepseekAPIStream } from '../services/aiService';
import { useUserProfile } from '../store/userProfile';
import { useAILabStore } from '../store/aiLab';
import confetti from 'canvas-confetti';
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
const store = useAILabStore();
const { state, agents, currentAgent } = store;
const { userProfile } = useUserProfile();

const userInput = ref('');
const showHistory = ref(false);
const chatContainer = ref(null);
const showNextStageButton = ref(false);

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

watch(() => state.messages.length, scrollToBottom);
watch(() => state.messages[state.messages.length - 1]?.content, scrollToBottom, { deep: true });

const sendMessage = async () => {
  const text = userInput.value.trim();
  if (!text || state.isProcessing) {
    return;
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

    const msgId = `ai-${Date.now()}`;
    store.addMessage({
      id: msgId,
      role: 'agent',
      content: '...',
      name: currentAgent.value.name,
      agentIndex: state.currentStage,
      chartData: null
    });

    let rawData = '';

    await callDeepseekAPIStream(apiMessages, currentAgent.value.id, (chunk, buffer) => {
      const message = state.messages.find((item) => item.id === msgId);
      if (!message) {
        return;
      }

      rawData = buffer;

      const thinkMatch = buffer.match(/<think>([\s\S]*?)(<\/think>|$)/i);
      if (thinkMatch) {
        message.thinkStatus = thinkMatch[1].trim() || 'Thinking...';
      } else {
        message.thinkStatus = null;
      }

      let cleanResponse = buffer.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '');
      cleanResponse = cleanResponse.replace('[CONFIRM]', '');

      const jsonMatch = cleanResponse.match(/```json([\s\S]*?)```/);
      if (jsonMatch) {
        cleanResponse = cleanResponse.replace(jsonMatch[0], '');
      }

      message.content = cleanResponse.trim() === '' ? '...' : cleanResponse;
    });

    const message = state.messages.find((item) => item.id === msgId);
    if (message) {
      const jsonMatch = rawData.match(/```json([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.chartData) {
            message.chartData = parsed;
          }
        } catch (error) {
          console.error('JSON parse error', error);
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
              content: `I am ${newAgent.name}. The previous stage has already synchronized the project context for me. Tell me what should be refined next.`,
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
    console.error('Chat error:', error);
    store.addMessage({
      id: `error-${Date.now()}`,
      role: 'agent',
      content: `Error: ${error.message || 'Connection failed'}`,
      name: 'System',
      agentIndex: state.currentStage
    });
  } finally {
    store.setProcessing(false);
  }
};

const getAgentPrompt = (agent, stage) => {
  return `You are now ${agent.name} (${agent.role}).
Task: ${agent.desc}
Current stage: ${stage + 1}/${agents.length}.
Respond with professional, high-signal guidance. If the user confirms the current direction, append [CONFIRM] at the end.`;
};

const handleNextStage = () => {
  showNextStageButton.value = false;
  const current = currentAgent.value || agents[0];

  if (store.nextStage()) {
    store.addMessage({
      id: `sys-handoff-${Date.now()}`,
      role: 'system',
      content: `Switching from ${current.role} to the next specialist...`,
      agentIndex: state.currentStage
    });

    setTimeout(() => {
      const newAgent = currentAgent.value || agents[state.currentStage];
      store.addMessage({
        id: `ai-init-${Date.now()}`,
        role: 'agent',
        content: `I am ${newAgent.name}. I have received the previous context and I am ready to continue.`,
        name: newAgent.name,
        agentIndex: state.currentStage
      });
    }, 1000);
  } else {
    showToast('The incubation chain is complete.', 'success');
    try {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } catch (error) {
      console.error('Confetti error:', error);
    }
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
    .map((message) => `${message.role === 'user' ? 'User' : message.name}: ${message.content}`)
    .join('\n\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `NS_Incubation_Report_${Date.now()}.txt`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Report exported.', 'success');
};

onMounted(() => {
  store.initStore();
  setTimeout(scrollToBottom, 100);
});

const parseMarkdown = (text) => {
  if (!text) {
    return '';
  }

  return text
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
        name: 'Analysis',
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
          <h1 class="hidden text-sm font-semibold uppercase tracking-[0.22em] text-white sm:block">NS-AI Incubation Center</h1>
          <h1 class="text-sm font-semibold uppercase tracking-[0.22em] text-white sm:hidden">NS-AI</h1>
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
          <span class="hidden sm:inline">Export</span>
        </button>
        <button
          class="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06]"
          @click="showHistory = !showHistory"
        >
          History
        </button>
        <button
          class="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-slate-100"
          @click="handleStartNewChat"
        >
          New project
        </button>
      </div>
    </header>

    <div class="relative flex flex-1 overflow-hidden">
      <aside class="custom-scrollbar hidden w-72 flex-col overflow-y-auto border-r border-white/5 bg-black md:flex">
        <div class="p-4">
          <p class="mb-4 text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">Agent Chain</p>
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
          Powered by NS-Matrix
        </div>
      </aside>

      <transition name="slide">
        <div v-if="showHistory" class="absolute inset-0 z-50 flex bg-black/80" @click.self="showHistory = false">
          <div class="custom-scrollbar h-full w-80 overflow-y-auto border-r border-white/5 bg-black/95 p-4 shadow-2xl backdrop-blur-xl">
            <div class="mb-6 flex items-center justify-between">
              <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-white">History</h2>
              <button class="text-slate-500 transition hover:text-white" @click="showHistory = false">&times;</button>
            </div>

            <div v-if="state.historySessions.length === 0" class="py-10 text-center text-sm text-slate-600">
              No history sessions yet.
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
                <span>Stage {{ session.currentStage + 1 }}</span>
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

                    <div v-if="msg.chartData" class="mt-5 h-64 w-full rounded-2xl border border-white/5 bg-white/[0.02] p-2">
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
            <div class="relative">
              <input
                v-model="userInput"
                :disabled="state.isProcessing"
                type="text"
                class="w-full rounded-full border border-white/10 bg-white/5 py-4 pl-6 pr-16 text-white backdrop-blur-xl outline-none transition-all placeholder:text-white/30 focus:bg-white/10 focus:ring-1 focus:ring-white/20"
                :placeholder="state.isProcessing ? 'AI is thinking...' : 'Ask the next question...'"
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
              AI-generated content is advisory and should be reviewed before execution.
            </div>
          </div>
        </div>

        <transition name="pop">
          <button
            v-if="showNextStageButton"
            class="absolute bottom-24 right-6 z-20 rounded-full border border-white/10 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-black shadow-[0_18px_40px_rgba(0,0,0,0.4)] transition hover:bg-slate-100"
            @click="handleNextStage"
          >
            Next stage
          </button>
        </transition>
      </main>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
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
