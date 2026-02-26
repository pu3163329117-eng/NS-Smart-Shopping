<script setup>
import { ref, nextTick, watch, onMounted, computed, defineComponent } from 'vue';
import { useToast } from '../composables/useToast';
import { callDeepseekAPI, callDeepseekAPIStream } from '../services/aiService';
import { useUserProfile } from '../store/userProfile';
import { useAILabStore } from '../store/aiLab';
import confetti from 'canvas-confetti';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart, BarChart, LineChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent, GridComponent, TitleComponent } from 'echarts/components';
import VChart, { THEME_KEY } from 'vue-echarts';

// Register ECharts
use([
  CanvasRenderer,
  PieChart, BarChart, LineChart,
  TooltipComponent, LegendComponent, GridComponent, TitleComponent
]);

// --- Setup Stores ---
const { show: showToast } = useToast();
const store = useAILabStore();
const { state, agents, currentAgent } = store;
const { userProfile } = useUserProfile();

// --- Local UI State ---
const userInput = ref('');
const showHistory = ref(false);
const chatContainer = ref(null);
const showNextStageButton = ref(false);

// --- Core Logic ---

// 2. Scroll to Bottom
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

// Watch for message changes (from store)
watch(() => state.messages.length, scrollToBottom);
// Watch for content updates (typing effect)
watch(() => state.messages[state.messages.length - 1]?.content, scrollToBottom, { deep: true });

// 3. Send Message
const sendMessage = async () => {
  const text = userInput.value.trim();
  if (!text || state.isProcessing) return;

  // Add User Message
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
    // Prepare Prompt
    const prompt = getAgentPrompt(currentAgent.value, state.currentStage);
    const apiMessages = [
      { role: 'system', content: prompt },
      ...state.messages
        .filter(m => m.role !== 'system' && m.agentIndex === state.currentStage) // Only context from current agent
        .map(m => ({ role: m.role === 'agent' ? 'assistant' : 'user', content: m.content }))
        .slice(-10) // Limit context
    ];

    // Add Agent Message (Placeholder) first before receiving the stream
    const msgId = 'ai-' + Date.now();
    store.addMessage({
      id: msgId,
      role: 'agent',
      content: '...', // Start placeholder
      name: currentAgent.value.name,
      agentIndex: state.currentStage,
      chartData: null // Attach chart data if found later
    });

    let rawData = '';

    // Call API Stream
    await callDeepseekAPIStream(apiMessages, currentAgent.value.id, (chunk, buffer) => {
       const msg = state.messages.find(m => m.id === msgId);
       if (msg) {
          rawData = buffer; // keep raw data including <think> and json
          
          // 1. Status Visibility (extract <think>)
          const thinkMatch = buffer.match(/<think>([\s\S]*?)(<\/think>|$)/i);
          if (thinkMatch) {
             msg.thinkStatus = thinkMatch[1].trim() || '正在思考...';
          } else {
             msg.thinkStatus = null; // Clear when done
          }

          let cleanResponse = buffer.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '');
          cleanResponse = cleanResponse.replace('[CONFIRM]', '');
          
          // Don't show json blocks in the streamed text
          const jsonMatch = cleanResponse.match(/```json([\s\S]*?)```/);
          if (jsonMatch) {
             cleanResponse = cleanResponse.replace(jsonMatch[0], '');
          }

          msg.content = cleanResponse.trim() === '' ? '...' : cleanResponse;
       }
    });

    // After stream completes, parse any JSON and show CONFIRM if needed
    const msg = state.messages.find(m => m.id === msgId);
    if (msg) {
      const jsonMatch = rawData.match(/```json([\s\S]*?)```/);
      if (jsonMatch) {
         try {
           const parsed = JSON.parse(jsonMatch[1]);
           if (parsed.chartData) {
             msg.chartData = parsed;
           }
         } catch (e) {
           console.error('JSON Parse Error', e);
         }
      }

      store.saveCurrentState();
      
      // Auto-Handoff detection via ZeroClaw/JSON
      if (msg.chartData && msg.chartData.handoff) {
        // e.g., {"handoff": "planner"}
        setTimeout(() => {
          store.jumpToAgent(msg.chartData.handoff);
          // Trigger a silent welcome ping
          const newAgent = agents.find(a => a.id === msg.chartData.handoff);
          if (newAgent) {
             store.addMessage({
               id: 'ai-init-' + Date.now(),
               role: 'agent',
               content: `我是 ${newAgent.name}。孵化总管已向我同步了您的资料。请问还有什么特别要求？`,
               name: newAgent.name,
               agentIndex: state.currentStage
             });
          }
          scrollToBottom();
        }, 1500);
      }
      
      // Check for stage transition availability
      if (rawData.includes('[CONFIRM]')) {
        showNextStageButton.value = true; // Show floating button
        scrollToBottom();
      }
    }

  } catch (error) {
    console.error('Chat Error:', error);
    store.addMessage({
      id: 'error-' + Date.now(),
      role: 'agent',
      content: `错误: ${error.message || '连接失败'}`,
      name: 'System',
      agentIndex: state.currentStage
    });
  } finally {
    store.setProcessing(false);
  }
};

// 4. Prompt Generator
const getAgentPrompt = (agent, stage) => {
  return `你现在是 ${agent.name} (${agent.role})。
  
  **你的任务**: ${agent.desc}
  **当前阶段**: ${stage + 1}/${agents.length}。

  请基于你的专业身份，给用户提供有深度的建议。
  重要：如果用户确认了当前方案，或者你认为任务已完成，请在回复末尾加上 "[CONFIRM]"。`;
};

// 5. Stage Transition
const handleNextStage = () => {
  showNextStageButton.value = false; // Hide button
  const current = currentAgent.value || agents[0];
  if (store.nextStage()) {
    store.addMessage({
      id: 'sys-handoff-' + Date.now(),
      role: 'system',
      content: `正在切换至 ${current.role}...`,
      agentIndex: state.currentStage
    });
    
    // Auto-trigger greeting from new agent
    setTimeout(() => {
      const newAgent = currentAgent.value || agents[state.currentStage];
      store.addMessage({
        id: 'ai-init-' + Date.now(),
        role: 'agent',
        content: `我是 ${newAgent.name}。已接收上一阶段数据，请问有什么特别要求？`,
        name: newAgent.name,
        agentIndex: state.currentStage
      });
    }, 1000);
  } else {
    showToast('全链路孵化完成！', 'success');
    try {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } catch (e) {
      console.error('Confetti error:', e);
    }
  }
};

const handlePrevStage = () => {
  if (store.prevStage()) {
     // Auto-trigger greeting from previous agent
     setTimeout(() => {
       const current = currentAgent.value || agents[state.currentStage];
       store.addMessage({
         id: 'ai-reinit-' + Date.now(),
         role: 'agent',
         content: `我是 ${current.name}。我们重新调整一下方案吧。请告诉我哪里需要修改？`,
         name: current.name,
         agentIndex: state.currentStage
       });
     }, 500);
  }
};

// 6. Session Management Wrappers
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
  const content = state.messages.map(m => `${m.role === 'user' ? 'User' : m.name}: ${m.content}`).join('\n\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `NS_Incubation_Report_${Date.now()}.txt`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('报告已导出', 'success');
};

// --- Lifecycle ---
onMounted(() => {
  store.initStore();
  setTimeout(scrollToBottom, 100);
});

const parseMarkdown = (text) => {
  if (!text) return '';
  // Basic Markdown Parsing
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold
    .replace(/\*(.*?)\*/g, '<i>$1</i>') // Italic
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-black/30 p-2 rounded my-2 overflow-x-auto"><code class="text-xs">$1</code></pre>') // Code blocks
    .replace(/\n/g, '<br>'); // Line breaks
  return html;
};

// Chart Option Generator
const getChartOption = (data) => {
  return {
    tooltip: { trigger: 'item' },
    legend: { top: '5%', left: 'center', textStyle: { color: '#fff' } },
    series: [
      {
        name: '财务分析',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#1f2937',
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
  <div class="h-screen flex flex-col bg-black text-white overflow-hidden pt-16">
    <!-- Header -->
    <header class="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900/50 backdrop-blur flex-shrink-0">
      <div class="flex items-center gap-2">
        <span class="text-xl">🚀</span>
        <h1 class="font-bold hidden sm:block">NS-AI 孵化中心</h1>
        <h1 class="font-bold sm:hidden">NS-AI</h1>
      </div>
      <div class="flex gap-2">
        <button @click="handleExport" class="px-3 py-1 text-xs bg-gray-800 rounded hover:bg-gray-700 flex items-center gap-1">
           <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
           <span class="hidden sm:inline">导出</span>
        </button>
        <button @click="showHistory = !showHistory" class="px-3 py-1 text-xs bg-gray-800 rounded hover:bg-gray-700">历史</button>
        <button @click="handleStartNewChat" class="px-3 py-1 text-xs bg-blue-600 rounded hover:bg-blue-500">新项目</button>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden relative">
      <!-- Sidebar (Agents) - Hidden on mobile unless toggled (simplified for now as hidden on mobile) -->
      <aside class="w-64 bg-gray-900 border-r border-gray-800 hidden md:flex flex-col overflow-y-auto custom-scrollbar">
        <div class="p-4 space-y-4">
          <div v-for="(agent, idx) in agents" :key="agent.id" 
               class="p-3 rounded-lg border transition-all flex items-center gap-3 relative overflow-hidden"
               :class="state.currentStage === idx ? 'bg-gray-800 border-blue-500' : 'border-transparent opacity-50 hover:opacity-80'">
            
            <!-- Progress indicator background for current stage -->
            <div v-if="state.currentStage === idx" class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>

            <div class="text-2xl z-10">{{ agent.avatar }}</div>
            <div class="z-10">
              <div class="font-bold text-sm" :class="agent.color">{{ agent.name }}</div>
              <div class="text-xs text-gray-500">{{ agent.role }}</div>
            </div>
          </div>
        </div>
        
        <div class="mt-auto p-4 border-t border-gray-800 text-xs text-gray-500 text-center">
          Powered by NS-Matrix v2.0
        </div>
      </aside>

      <!-- History Sidebar -->
      <transition name="slide">
        <div v-if="showHistory" class="absolute inset-0 z-50 bg-black/80 flex" @click.self="showHistory = false">
          <div class="w-80 bg-gray-900 h-full p-4 overflow-y-auto shadow-2xl border-r border-gray-700">
            <div class="flex justify-between items-center mb-6">
               <h2 class="text-lg font-bold">历史记录</h2>
               <button @click="showHistory = false" class="text-gray-400 hover:text-white">&times;</button>
            </div>
            
            <div v-if="state.historySessions.length === 0" class="text-gray-500 text-center py-10">
              暂无历史记录
            </div>

            <div v-for="session in state.historySessions" :key="session.id" 
                 @click="handleLoadSession(session)"
                 class="p-3 mb-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 border border-transparent hover:border-gray-600 transition-all group">
              <div class="font-bold text-sm text-gray-200 group-hover:text-blue-400 mb-1">{{ session.title }}</div>
              <div class="flex justify-between text-xs text-gray-500">
                <span>{{ session.date }}</span>
                <span>Stage: {{ session.currentStage + 1 }}</span>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- Chat Area -->
      <main class="flex-1 flex flex-col relative bg-gradient-to-b from-black to-gray-900 w-full">
        <div class="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-20" ref="chatContainer">
          <div v-for="msg in state.messages" :key="msg.id" class="max-w-3xl mx-auto w-full">
            
            <!-- System Message -->
            <div v-if="msg.role === 'system'" class="flex justify-center my-4">
              <div v-if="!msg.isAction" class="bg-gray-800/80 backdrop-blur px-4 py-2 rounded-full text-xs text-gray-400 border border-gray-700">
                {{ msg.content }}
              </div>
            </div>

            <!-- Agent Message -->
            <div v-else-if="msg.role === 'agent'" class="flex gap-4 animate-fade-in">
              <div class="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700 flex-shrink-0 shadow-lg">
                {{ agents[msg.agentIndex]?.avatar || '🤖' }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs font-bold text-gray-300">{{ msg.name }}</span>
                  <span class="text-[10px] px-1.5 py-0.5 bg-gray-800 rounded text-gray-500">{{ agents[msg.agentIndex]?.role }}</span>
                </div>
                <div class="bg-gray-800/80 p-4 rounded-2xl rounded-tl-none text-sm leading-relaxed text-gray-200 shadow-sm border border-gray-700/50">
                   <!-- Status Visibility (Reasoning/Thinking) -->
                   <div v-if="msg.thinkStatus" class="mb-3 p-3 bg-black/40 rounded-lg text-xs text-gray-400 border-l-2 border-blue-500 animate-pulse font-mono flex items-start gap-2">
                     <svg class="w-4 h-4 text-blue-500 mt-0.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     <div class="flex-1 whitespace-pre-wrap">{{ msg.thinkStatus }}</div>
                   </div>

                   <div v-html="parseMarkdown(msg.content)"></div>
                   
                   <!-- Render Chart if Data Exists -->
                   <div v-if="msg.chartData" class="mt-4 h-64 w-full bg-gray-900/50 rounded-xl p-2 border border-gray-700">
                     <v-chart class="w-full h-full" :option="getChartOption(msg.chartData)" autoresize />
                   </div>
                </div>
              </div>
            </div>

            <!-- User Message -->
            <div v-else class="flex gap-4 flex-row-reverse animate-fade-in">
              <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center border border-gray-600 flex-shrink-0 shadow-lg overflow-hidden">
                <img :src="userProfile.userInfo.avatar" class="w-full h-full object-cover">
              </div>
              <div class="max-w-[80%]">
                <div class="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-2xl rounded-tr-none text-sm text-white shadow-md">
                  {{ msg.content }}
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Input Area -->
        <div class="p-4 border-t border-gray-800 bg-gray-900/80 backdrop-blur">
          <div class="max-w-3xl mx-auto relative">
            <input 
              v-model="userInput" 
              @keydown.enter="sendMessage"
              :disabled="state.isProcessing"
              type="text" 
              class="w-full bg-gray-800 border border-gray-700 rounded-2xl pl-5 pr-12 py-4 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all shadow-inner placeholder-gray-500"
              :placeholder="state.isProcessing ? 'AI 正在思考...' : '输入你的想法...'"
            >
            <button 
              @click="sendMessage"
              :disabled="state.isProcessing || !userInput.trim()"
              class="absolute right-2 top-2 bottom-2 aspect-square bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg"
            >
              <svg v-if="!state.isProcessing" class="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </button>
          </div>
          <div class="text-center mt-2 text-[10px] text-gray-600">
             AI 内容由深度学习模型生成，仅供参考
          </div>
        </div>
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
  background: #374151;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #4b5563;
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
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-pulse-slow {
  animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
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

.animate-bounce-slow {
  animation: bounce 2s infinite;
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
</style>