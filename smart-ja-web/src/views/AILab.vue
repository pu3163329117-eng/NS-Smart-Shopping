<script setup>
import { onMounted, ref, onUnmounted } from 'vue';
import gsap from 'gsap';
import { useToast } from '../composables/useToast';

const { show: showToast } = useToast();

// Terminal Logic
const terminalLogs = ref([
  { time: '14:20:01', type: 'INFO', msg: 'System initialized. Connecting to NS Neural Network...' },
  { time: '14:20:02', type: 'SUCCESS', msg: 'Connection established. Latency: 12ms' },
  { time: '14:20:03', type: 'INFO', msg: 'Type "help" to see available commands.' }
]);
const terminalInput = ref('');
const terminalInputRef = ref(null);
const terminalLogContainer = ref(null);
let logInterval;

const possibleLogs = [
  { type: 'INFO', msg: 'Analyzing global fashion trends (Source: Social Media API)...' },
  { type: 'SUCCESS', msg: 'Detected new viral keyword: "Cyberpunk Eco-wear"' },
  { type: 'WARN', msg: 'Supply chain alert: Cotton prices increasing by 2.3%' },
  { type: 'INFO', msg: 'Virtual CIO optimizing server load distribution...' },
  { type: 'INFO', msg: 'Generating 3D prototype for SKU-9928...' },
  { type: 'SUCCESS', msg: 'User sentiment analysis completed. Positive rate: 94%' },
  { type: 'INFO', msg: 'Crowdfunding smart contract audit in progress...' },
  { type: 'SUCCESS', msg: 'AIUNI project update received. Verifying data...' }
];

const addLog = (log) => {
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  
  if (log) {
    terminalLogs.value.push({ time: timeStr, ...log });
  } else {
    // Auto logs
    const randomLog = possibleLogs[Math.floor(Math.random() * possibleLogs.length)];
    terminalLogs.value.push({ time: timeStr, ...randomLog });
  }

  if (terminalLogs.value.length > 8) {
    terminalLogs.value.shift();
  }
  
  scrollToBottom();
};

const scrollToBottom = () => {
  if (terminalLogContainer.value) {
    setTimeout(() => {
      terminalLogContainer.value.scrollTop = terminalLogContainer.value.scrollHeight;
    }, 10);
  }
};

const handleCommand = () => {
  const cmd = terminalInput.value.trim().toLowerCase();
  if (!cmd) return;

  // Echo user command
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  terminalLogs.value.push({ time: timeStr, type: 'USER', msg: `> ${cmd}` });
  
  terminalInput.value = '';

  // Process command
  setTimeout(() => {
    if (cmd === 'help') {
      addLog({ type: 'SYSTEM', msg: 'Available commands: help, analyze, clear, status' });
    } else if (cmd === 'clear') {
      terminalLogs.value = [];
    } else if (cmd === 'status') {
      addLog({ type: 'SYSTEM', msg: 'All systems operational. CPU Load: 12%. Memory: 4GB/16GB' });
    } else if (cmd === 'analyze') {
      addLog({ type: 'INFO', msg: 'Starting deep market analysis...' });
      setTimeout(() => addLog({ type: 'SUCCESS', msg: 'Analysis Complete: Market bullish on AI-driven products.' }), 1500);
    } else {
      addLog({ type: 'ERROR', msg: `Command not found: ${cmd}` });
    }
  }, 300);
};

onMounted(() => {
  gsap.from('.hero-content', { opacity: 0, y: 30, duration: 1, ease: 'power3.out' });
  
  // Start terminal simulation (slower background logs)
  logInterval = setInterval(() => addLog(), 5000);
});

onUnmounted(() => {
  if (logInterval) clearInterval(logInterval);
});

const handleApply = () => {
  showToast('申请提交成功！请等待邮件通知', 'success');
};

const handleCardMouseMove = (e, index) => {
  const card = document.getElementById(`feature-card-${index}`);
  if (!card) return;
  
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -5;
  const rotateY = ((x - centerX) / centerX) * 5;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
};

const handleCardMouseLeave = (index) => {
  const card = document.getElementById(`feature-card-${index}`);
  if (!card) return;
  
  card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};
</script>

<template>
  <div class="pt-24 min-h-screen bg-black text-white overflow-hidden relative">
    <!-- Background Effect -->
    <div class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1620712943543-bcc4688e7485?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-20"></div>
    <div class="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20">
      <div class="hero-content text-center max-w-3xl mx-auto">
        <div class="inline-block px-4 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-400 text-sm font-bold mb-6">
          NS Future Lab
        </div>
        <h1 class="text-5xl md:text-7xl font-bold mb-8 tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          AI 实验室
        </h1>
        <p class="text-xl text-gray-400 mb-12 leading-relaxed">
          探索人工智能的无限可能。我们正在构建下一代智能购物助手，让每一次消费决策都充满智慧。
        </p>

        <!-- Live Terminal -->
        <div class="mb-20 mx-auto max-w-2xl bg-black/80 border border-green-500/30 rounded-lg p-4 font-mono text-left shadow-[0_0_30px_rgba(34,197,94,0.1)]">
          <div class="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
            <div class="w-3 h-3 rounded-full bg-red-500"></div>
            <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div class="w-3 h-3 rounded-full bg-green-500"></div>
            <span class="text-xs text-gray-500 ml-2">ns-agent-core — zsh — 80x24</span>
          </div>
          <div class="space-y-1 h-48 overflow-y-auto relative scrollbar-hide font-mono text-sm" ref="terminalLogContainer">
            <div v-for="(log, i) in terminalLogs" :key="i" class="leading-relaxed">
              <span class="text-gray-500 opacity-50">[{{ log.time }}]</span>
              <span :class="{
                'text-blue-400': log.type === 'INFO',
                'text-green-400': log.type === 'SUCCESS',
                'text-yellow-400': log.type === 'WARN',
                'text-red-400': log.type === 'ERROR',
                'text-white': log.type === 'USER',
                'text-purple-400': log.type === 'SYSTEM'
              }" class="mx-2 font-bold">{{ log.type }}:</span>
              <span class="text-gray-300">{{ log.msg }}</span>
            </div>
            <!-- Input Area -->
            <div class="flex items-center mt-2 group">
              <span class="text-green-500 mr-2 animate-pulse">➜</span>
              <input 
                ref="terminalInputRef"
                v-model="terminalInput"
                @keydown.enter="handleCommand"
                type="text" 
                class="bg-transparent border-none outline-none text-white w-full font-mono placeholder-gray-700"
                placeholder="Type command..."
                autocomplete="off"
              >
            </div>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-left mt-20">
          <div 
            id="feature-card-0"
            @mousemove="(e) => handleCardMouseMove(e, 0)"
            @mouseleave="() => handleCardMouseLeave(0)"
            class="bg-gray-900/50 backdrop-blur border border-gray-800 p-6 rounded-2xl hover:border-blue-500/50 transition-colors group will-change-transform duration-200 ease-out"
          >
            <div class="w-12 h-12 bg-blue-900/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <h3 class="text-xl font-bold mb-2">智能推荐引擎</h3>
            <p class="text-gray-500 text-sm">基于深度学习的用户偏好分析，提供毫秒级的个性化商品推荐。</p>
          </div>
          
          <div 
            id="feature-card-1"
            @mousemove="(e) => handleCardMouseMove(e, 1)"
            @mouseleave="() => handleCardMouseLeave(1)"
            class="bg-gray-900/50 backdrop-blur border border-gray-800 p-6 rounded-2xl hover:border-purple-500/50 transition-colors group will-change-transform duration-200 ease-out"
          >
            <div class="w-12 h-12 bg-purple-900/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            </div>
            <h3 class="text-xl font-bold mb-2">虚拟试穿实验室</h3>
            <p class="text-gray-500 text-sm">利用 AR 技术实现实时虚拟试穿，还原真实的穿着效果。</p>
          </div>

          <div 
            id="feature-card-2"
            @mousemove="(e) => handleCardMouseMove(e, 2)"
            @mouseleave="() => handleCardMouseLeave(2)"
            class="bg-gray-900/50 backdrop-blur border border-gray-800 p-6 rounded-2xl hover:border-pink-500/50 transition-colors group will-change-transform duration-200 ease-out"
          >
            <div class="w-12 h-12 bg-pink-900/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            </div>
            <h3 class="text-xl font-bold mb-2">五大AI智能体辅助产品创新销售</h3>
            <p class="text-gray-500 text-sm">分别是市场调研智能体、大数据抓取智能体、商业布局智能体、虚拟CIO、产品辅助设计智能体</p>
          </div>
        </div>

        <div class="mt-16">
          <button 
            @click="handleApply"
            class="bg-white text-black px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform"
          >
            申请加入内测
          </button>
        </div>
      </div>
    </div>
  </div>
</template>