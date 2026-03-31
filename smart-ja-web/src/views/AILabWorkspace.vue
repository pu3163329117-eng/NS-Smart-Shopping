<template>
  <div class="ailab-workspace flex h-screen bg-[#0a0a0f] text-slate-100 overflow-hidden relative font-sans">
    <!-- Liquid Background Elements -->
    <div class="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/30 blur-[120px] pointer-events-none"></div>
    <div class="absolute bottom-[10%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-600/20 blur-[150px] pointer-events-none"></div>

    <!-- Left Pane: Chat Interface -->
    <div class="chat-pane w-[380px] lg:w-[450px] h-full flex flex-col z-10 border-r border-white/5 bg-white/[0.02] backdrop-blur-2xl">
      <div class="header p-6 border-b border-white/5 relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10"></div>
        <h2 class="text-2xl font-extrabold flex items-center bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300 relative z-10">
          <i class="fas fa-robot mr-3 text-indigo-400"></i>AI Mentor
        </h2>
        <p class="text-xs text-slate-400 mt-2 relative z-10 tracking-widest uppercase">Incubation / MVP Builder</p>
      </div>
      
      <div class="messages-container flex-1 overflow-y-auto p-6 space-y-6" ref="chatContainer">
        <div v-for="msg in messages" :key="msg.id" class="message flex items-start" :class="{'justify-end': msg.role === 'user'}">
          <div v-if="msg.role !== 'user'" class="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mr-3 shadow-lg border border-white/10 shrink-0 text-indigo-300">
            <i class="fas fa-user-tie text-sm"></i>
          </div>
          
          <div class="message-bubble max-w-[85%] p-4 rounded-3xl"
               :class="msg.role === 'user' ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-tr-sm shadow-[0_4px_20px_-5px_rgba(99,102,241,0.4)]' : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm backdrop-blur-md'">
            <div class="prose prose-sm prose-invert max-w-none" v-html="parseMarkdown(msg.content)"></div>
          </div>
        </div>
        
        <div v-if="isProcessing" class="message flex items-end">
           <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mr-3 shadow-lg border border-white/10">
             <i class="fas fa-circle-notch fa-spin text-indigo-400 text-sm"></i>
           </div>
           <div class="bg-white/5 border border-white/10 px-5 py-3 rounded-3xl rounded-tl-sm text-slate-400 text-sm backdrop-blur-md flex items-center">
             <span class="animate-pulse flex space-x-1">
               <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
               <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></span>
               <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
             </span>
             <span class="ml-3 tracking-wider text-xs uppercase">Mentor is thinking...</span>
           </div>
        </div>
      </div>
      
      <div class="input-area p-6 bg-transparent border-t border-white/5">
        <div class="relative flex items-center rounded-2xl bg-black/20 border border-white/10 focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all group overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
          <input type="text" v-model="userInput" @keyup.enter="sendMessage"
                 class="w-full pl-5 pr-14 py-4 bg-transparent outline-none text-sm text-white placeholder-slate-500 relative z-10"
                 placeholder="Type your startup idea..." :disabled="isProcessing" />
          <button @click="sendMessage" :disabled="!userInput.trim() || isProcessing"
                  class="absolute right-2 w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:bg-white/5 disabled:text-white/20 disabled:cursor-not-allowed transition-colors shadow-lg z-10">
            <i class="fas fa-paper-plane text-xs ml-0.5 mt-0.5"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Right Pane: Artifact Viewer (Lean Canvas) -->
    <div class="artifact-pane flex-1 p-8 lg:p-12 overflow-y-auto relative z-10 flex flex-col">
      <div v-if="!canvasData" class="h-full flex flex-col items-center justify-center text-slate-400">
        <div class="w-40 h-40 mb-8 rounded-full border border-white/5 bg-white/[0.02] backdrop-blur-2xl flex items-center justify-center relative shadow-[0_0_50px_-10px_rgba(99,102,241,0.15)] group">
          <div class="absolute inset-0 bg-gradient-to-bl from-indigo-500/20 to-purple-500/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
          <i class="fas fa-lightbulb text-5xl text-indigo-400 group-hover:scale-110 transition-transform duration-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]"></i>
        </div>
        <h3 class="text-2xl font-bold text-white tracking-wide">Refine Your Vision</h3>
        <p class="text-sm mt-3 max-w-sm text-center leading-relaxed opacity-70">Pitch your idea to the Mentor on the left. The AI will crystallize it into a professional Lean Canvas dynamically.</p>
      </div>
      
      <div v-else class="lean-canvas-wrapper h-full flex flex-col max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div class="flex justify-between items-center mb-10 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-xl">
          <div>
             <h2 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-white drop-shadow-sm">Business MVP Canvas</h2>
             <p class="text-xs text-indigo-300 mt-2 font-semibold tracking-widest uppercase items-center flex"><i class="fas fa-check-circle mr-2 text-green-400"></i>AI Validated Model</p>
          </div>
          <button @click="saveProject" class="px-8 py-3 bg-white text-indigo-900 rounded-2xl font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 transition-all flex items-center group">
            <i class="fas fa-cloud-upload-alt mr-2 group-hover:-translate-y-0.5 transition-transform"></i> Save Blueprint
          </button>
        </div>
        
        <!-- Canvas Grid Layout - VisionOS Glass Style -->
        <div class="canvas-grid grid grid-cols-5 grid-rows-3 gap-4 flex-1">
          <!-- Block Component Definition implicitly via classes -->
          <div class="canvas-card col-span-1 row-span-2">
            <h3><div class="icon-wrap bg-rose-500/20 text-rose-400"><i class="fas fa-exclamation-triangle"></i></div> Problem</h3>
            <ul><li v-for="(item, i) in canvasData.problem" :key="i">{{item}}</li></ul>
          </div>
          <div class="canvas-card col-span-1 row-span-1">
            <h3><div class="icon-wrap bg-amber-500/20 text-amber-400"><i class="fas fa-magic"></i></div> Solution</h3>
            <ul><li v-for="(item, i) in canvasData.solution" :key="i">{{item}}</li></ul>
          </div>
          
          <div class="canvas-card col-span-1 row-span-2 highlight-card">
            <h3><div class="icon-wrap bg-indigo-500/20 text-indigo-300"><i class="fas fa-gem"></i></div> Value Proposition</h3>
            <p class="text-xl font-bold text-white mt-6 leading-relaxed">{{canvasData.uniqueValueProposition}}</p>
          </div>
          
          <div class="canvas-card col-span-1 row-span-1">
            <h3><div class="icon-wrap bg-green-500/20 text-green-400"><i class="fas fa-shield-alt"></i></div> Unfair Advantage</h3>
            <p class="text-sm text-slate-300 mt-2">{{canvasData.unfairAdvantage}}</p>
          </div>
          <div class="canvas-card col-span-1 row-span-2">
            <h3><div class="icon-wrap bg-blue-500/20 text-blue-400"><i class="fas fa-users"></i></div> Customer Segments</h3>
            <ul><li v-for="(item, i) in canvasData.customerSegments" :key="i">{{item}}</li></ul>
          </div>
          
          <div class="canvas-card col-span-1 row-span-1">
            <h3><div class="icon-wrap bg-purple-500/20 text-purple-400"><i class="fas fa-chart-pie"></i></div> Key Metrics</h3>
            <ul><li v-for="(item, i) in canvasData.keyMetrics" :key="i">{{item}}</li></ul>
          </div>
          <div class="canvas-card col-span-1 row-span-1">
            <h3><div class="icon-wrap bg-orange-500/20 text-orange-400"><i class="fas fa-truck-fast"></i></div> Channels</h3>
            <ul><li v-for="(item, i) in canvasData.channels" :key="i">{{item}}</li></ul>
          </div>
          
          <div class="canvas-card col-span-2 row-span-1">
            <h3><div class="icon-wrap bg-slate-500/20 text-slate-400"><i class="fas fa-wallet"></i></div> Cost Structure</h3>
            <ul><li v-for="(item, i) in canvasData.costStructure" :key="i">{{item}}</li></ul>
          </div>
          <div class="canvas-card col-span-3 row-span-1 border-t-2 border-indigo-500/30">
            <h3><div class="icon-wrap bg-emerald-500/20 text-emerald-400"><i class="fas fa-sack-dollar"></i></div> Revenue Streams</h3>
            <ul><li v-for="(item, i) in canvasData.revenueStreams" :key="i">{{item}}</li></ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue';
import { callDeepseekAPIStream } from '../services/aiService';
import { useToast } from '../composables/useToast';
import api from '../services/api';
import { useRouter } from 'vue-router';

const { show: showToast } = useToast();
const router = useRouter();

const chatContainer = ref(null);
const userInput = ref('');
const isProcessing = ref(false);
const messages = ref([{
  id: 'welcome',
  role: 'agent',
  content: '你好，我是 AILab 的首席孵化导师。给我讲讲你想做什么创业项目？核心解决什么人的什么痛点？'
}]);

const canvasData = ref(null);

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

const parseMarkdown = (text) => {
  if (!text) return '';
  return text.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b class="text-indigo-300 font-bold">$1</b>');
};

const sendMessage = async () => {
  const text = userInput.value.trim();
  if (!text || isProcessing.value) return;

  // Basic Auth Check
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (!token) {
    showToast('导师功能需要您先登陆哦', 'error');
    router.push('/login');
    return;
  }

  messages.value.push({ id: Date.now().toString(), role: 'user', content: text });
  userInput.value = '';
  isProcessing.value = true;
  scrollToBottom();

  const msgId = `ai-${Date.now()}`;
  messages.value.push({ id: msgId, role: 'agent', content: '...' });

  const apiMessages = messages.value.filter(m => m.content !== '...').map(m => ({
    role: m.role === 'agent' ? 'assistant' : 'user',
    content: m.content
  }));

  try {
    let finalContent = '';
    await callDeepseekAPIStream(
      apiMessages,
      'mentor',
      (chunk, buffer) => {
        const message = messages.value.find(m => m.id === msgId);
        if (message) {
          let displayBuffer = buffer;
          const jsonMatch = buffer.match(/\[CANVAS_JSON:[\s\S]*?\]/);
          if (jsonMatch) {
            displayBuffer = buffer.replace(jsonMatch[0], '\n\n*(✨ The Lean Canvas has been generated and populated on the right dashboard.)*\n\n');
          }
          message.content = displayBuffer.trim() === '' ? '...' : displayBuffer;
          finalContent = buffer;
        }
      },
      0.7, 4000, {}
    );
    
    const jsonMatch = finalContent.match(/\[CANVAS_JSON:\s*([\s\S]*?)\]/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        canvasData.value = JSON.parse(jsonMatch[1]);
        showToast('Business Canvas Synthesized Successfully!', 'success');
      } catch (err) {
        console.error('Failed to parse CANVAS_JSON', err);
      }
    }

  } catch (err) {
    console.error('AILab Chat Error:', err);
    if (err.status === 401 || err.status === 403 || String(err).includes('403')) {
      showToast('Authentication expired. Please log in again.', 'error');
      router.push('/login');
    } else {
      showToast('AI Service Timeout or Engine Error.', 'error');
    }
    messages.value.pop();
  } finally {
    isProcessing.value = false;
    scrollToBottom();
  }
};

const saveProject = async () => {
  if (!canvasData.value) return;
  try {
    await api.post('/ailab/projects', {
      name: "Vision " + new Date().toLocaleDateString(),
      description: messages.value.filter(m=>m.role==='user').map(m=>m.content).join('\n').substring(0, 100),
      leanCanvas: canvasData.value,
      status: 'defined'
    });
    showToast('Project blueprints saved to AILab vault.', 'success');
  } catch (err) {
    console.error('Save failed:', err);
    showToast('Failed to save project.', 'error');
  }
};
</script>

<style scoped>
.canvas-card {
  @apply bg-white/[0.03] border border-white/10 p-5 rounded-2xl shadow-xl flex flex-col transition-all duration-300 hover:border-white/30 hover:bg-white/[0.05] backdrop-blur-md relative overflow-hidden;
}

.canvas-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.canvas-card:hover::before {
  transform: translateX(100%);
}

.highlight-card {
  @apply bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-indigo-500/30;
}

.canvas-card h3 {
  @apply text-[11px] font-extrabold text-slate-300 mb-3 tracking-widest uppercase flex items-center gap-3 drop-shadow;
}

.icon-wrap {
  @apply w-7 h-7 rounded-lg flex items-center justify-center text-[10px];
}

.canvas-card ul {
  @apply flex-1 space-y-2 text-[13px] text-slate-400 pl-2;
}

.canvas-card li {
  @apply leading-relaxed relative pl-4;
}

.canvas-card li::before {
  content: '•';
  @apply absolute left-0 text-indigo-400 font-bold;
}
</style>
