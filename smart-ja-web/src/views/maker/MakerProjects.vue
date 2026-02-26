<script setup>
import { ref, onMounted } from 'vue';
import { useAILabStore } from '../../store/aiLab';
import { useRouter } from 'vue-router';
import { useToast } from '../../composables/useToast';

const store = useAILabStore();
const router = useRouter();
const { show: showToast } = useToast();

const projects = ref([]);
const activeProject = ref(null);
const showChat = ref(false);
const chatInput = ref('');
const chatMessages = ref([]);

onMounted(() => {
  store.initStore();
  // Filter history to get projects
  projects.value = store.state.historySessions || [];
});

const openProject = (project) => {
  // If we want to resume in AI Lab
  store.loadSession(project);
  router.push('/ai-lab');
};

const openMentorChat = (project) => {
  activeProject.value = project;
  showChat.value = true;
  chatMessages.value = [
    { role: 'system', content: `你好，我是您的专属 AI 导师。我已经阅读了项目 "${project.title}" 的所有资料。我们可以讨论其中的细节，提取灵感，或者商讨下一步的改进方案。商讨的结果可以同步回 AI Lab。` }
  ];
};

const sendMentorMessage = () => {
  const userText = chatInput.value.trim();
  if (!userText) return;

  // User Message
  chatMessages.value.push({ role: 'user', content: userText });
  chatInput.value = '';

  // Simulate AI Mentor Response
  setTimeout(() => {
    let aiResponse = "这是一个很有趣的想法。";
    
    // Inject back into AI Lab Store context for this project
    // We do this by appending a special system note to the project messages
    const projectIdx = store.state.historySessions.findIndex(p => p.id === activeProject.value.id);
    if (projectIdx > -1) {
        const newContextMsg = {
            id: 'mentor-note-' + Date.now(),
            role: 'system',
            content: `[AI 导师反馈] 用户在创客中心与导师商讨了以下内容，请在后续决策中参考：${userText}`,
            agentIndex: store.state.historySessions[projectIdx].currentStage
        };
        
        // Update history session
        store.state.historySessions[projectIdx].messages.push(newContextMsg);
        
        // If this is the current active session, update it too
        if (store.state.currentSessionId === activeProject.value.id) {
            store.state.messages.push(newContextMsg);
            store.saveCurrentState();
        } else {
            // Save history update directly
            localStorage.setItem('ns_ailab_sessions_v2', JSON.stringify(store.state.historySessions));
        }

        if (userText.includes("提取") || userText.includes("记录")) {
            aiResponse = "好的，我已经将这段对话标记为重要灵感。下次您在 AI Lab 中继续该项目时，智能体将会参考这些新想法。";
        } else {
            aiResponse = "针对这个项目，我认为我们可以进一步优化供应链环节。您觉得之前的成本评估准确吗？";
        }
    }

    chatMessages.value.push({ role: 'agent', content: aiResponse });
  }, 1000);
};

const formatDate = (dateStr) => {
  return dateStr || '刚刚';
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-800">🧪 AI 孵化记录</h1>
      <button @click="router.push('/ai-lab')" class="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/30">
        + 新建孵化项目
      </button>
    </div>

    <!-- Project List -->
    <div v-if="projects.length === 0" class="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
      <div class="text-6xl mb-4">🧬</div>
      <h3 class="text-xl font-bold text-gray-800 mb-2">暂无孵化记录</h3>
      <p class="text-gray-400 mb-6">去 AI 实验室开启你的第一个从 0 到 1 的项目吧！</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-4">
      <div v-for="project in projects" :key="project.id" class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-bold text-lg text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">{{ project.title }}</h3>
            <div class="text-xs text-gray-400 mb-3 flex items-center gap-2">
              <span>📅 {{ formatDate(project.date) }}</span>
              <span class="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">Stage {{ project.currentStage + 1 }}</span>
            </div>
            <p class="text-sm text-gray-600 line-clamp-2 bg-gray-50 p-3 rounded-lg">{{ project.preview }}</p>
          </div>
          <div class="flex flex-col gap-2">
             <button @click="openProject(project)" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition">
               继续孵化 &rarr;
             </button>
             <button @click="openMentorChat(project)" class="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition">
               🎓 AI 导师商讨
             </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Mentor Chat Modal -->
    <div v-if="showChat" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showChat = false"></div>
      <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative z-10 flex flex-col h-[600px]">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">🎓</div>
            <div>
              <h3 class="font-bold">AI 导师</h3>
              <div class="text-xs opacity-80">正在讨论: {{ activeProject?.title }}</div>
            </div>
          </div>
          <button @click="showChat = false" class="text-white/80 hover:text-white text-xl">&times;</button>
        </div>

        <!-- Messages -->
        <div class="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          <div v-for="(msg, idx) in chatMessages" :key="idx" class="flex gap-3" :class="msg.role === 'user' ? 'flex-row-reverse' : ''">
             <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0" 
                  :class="msg.role === 'user' ? 'bg-gray-200' : 'bg-indigo-100 text-indigo-600'">
               {{ msg.role === 'user' ? 'Me' : 'AI' }}
             </div>
             <div class="max-w-[80%] p-3 rounded-2xl text-sm" 
                  :class="msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-700 shadow-sm rounded-tl-none'">
               {{ msg.content }}
             </div>
          </div>
        </div>

        <!-- Input -->
        <div class="p-4 bg-white border-t border-gray-100">
          <div class="flex gap-2">
            <input v-model="chatInput" @keyup.enter="sendMentorMessage" placeholder="输入想法，商讨结果将同步至 Lab..." class="flex-1 px-4 py-2 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
            <button @click="sendMentorMessage" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition">发送</button>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>