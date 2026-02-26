import { reactive, computed } from 'vue';

// --- Constants ---
const STORAGE_KEY = 'ns_ailab_sessions_v2';
const CURRENT_SESSION_KEY = 'ns_ailab_current_session';

const agents = [
  {
    id: 'coordinator',
    name: 'NS-Coordinator',
    role: 'AI 孵化总管',
    avatar: '👨‍💼',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/20',
    desc: '我是统筹你创意孵化的总管。我将倾听你的想法，并自动安排背后的规划师、设计师帮你落地。'
  },
  {
    id: 'planner',
    name: 'NS-Planner',
    role: 'AI 产品规划师',
    avatar: '🧠',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    desc: '我是冷静理性的产品架构师。我将协助你定义MPV（最小可行性产品）的核心功能与市场定位。'
  },
  {
    id: 'designer',
    name: 'NS-Designer',
    role: 'AI 设计/建模师',
    avatar: '🎨',
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    desc: '我是追求极致美学的工业设计师。我将为你生成符合人体工学与现代审美的设计草图。'
  },
  {
    id: 'supply',
    name: 'NS-SupplyChain',
    role: 'AI 供应链经理',
    avatar: '🏭',
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    desc: '我是精打细算的供应链专家。我将为你筛选最优供应商，控制BOM成本并规划生产排期。'
  },
  {
    id: 'sales',
    name: 'NS-Sales',
    role: 'AI 销售经理',
    avatar: '📈',
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    desc: '我是深谙人性的市场营销专家。我将为你制定击穿用户心智的定价策略与推广文案。'
  }
];

// --- Global State ---
// This state persists in memory as long as the app is running (SPA).
// We also sync it to localStorage for persistence across reloads.
const state = reactive({
  currentStage: 0,
  currentSessionId: null,
  messages: [],
  historySessions: [],
  isProcessing: false,
  initialized: false
});

// --- Actions ---

const initStore = () => {
  if (state.initialized) return;

  // Load History
  try {
    const historyData = localStorage.getItem(STORAGE_KEY);
    if (historyData) {
      state.historySessions = JSON.parse(historyData);
    }
  } catch (e) {
    console.error('Failed to load history:', e);
    localStorage.removeItem(STORAGE_KEY);
  }

  // Load Current Session (Auto-resume)
  try {
    const savedCurrent = localStorage.getItem(CURRENT_SESSION_KEY);
    if (savedCurrent) {
      const session = JSON.parse(savedCurrent);
      state.currentSessionId = session.id;
      state.messages = session.messages || [];
      // Ensure stage is valid
      if (typeof session.currentStage === 'number' && session.currentStage >= 0 && session.currentStage < agents.length) {
        state.currentStage = session.currentStage;
      } else {
        state.currentStage = 0;
      }
    } else {
      startNewChat();
    }
  } catch (e) {
    console.error('Failed to load session:', e);
    localStorage.removeItem(CURRENT_SESSION_KEY);
    startNewChat();
  }

  state.initialized = true;
};

const startNewChat = () => {
  state.currentSessionId = Date.now().toString();
  state.currentStage = 0;
  state.messages = [{
    id: 'system-init',
    role: 'system',
    content: '欢迎来到 NS-AI 孵化器。我是您的项目孵化总管 NS-Coordinator。无论是模糊的想法还是具体的点子，请告诉我，我将在这边为您统筹所有的规划师与设计师。',
    agentIndex: 0
  }];
  saveCurrentState();
};

const addMessage = (msg) => {
  state.messages.push(msg);
  saveCurrentState();
};

const updateMessageContent = (msgId, content) => {
  const msg = state.messages.find(m => m.id === msgId);
  if (msg) {
    msg.content = content;
    // Don't save on every char update for performance, rely on component to save periodically or at end
  }
};

const setProcessing = (val) => {
  state.isProcessing = val;
};

const nextStage = () => {
  if (state.currentStage < agents.length - 1) {
    state.currentStage++;
    saveCurrentState();
    return true;
  }
  return false;
};

const jumpToAgent = (agentId) => {
  const index = agents.findIndex(a => a.id === agentId);
  if (index !== -1 && index !== state.currentStage) {
    state.currentStage = index;
    // Add context system message
    state.messages.push({
      id: 'sys-handoff-' + Date.now(),
      role: 'system',
      content: `[系统自动调度] 已将任务移交至：${agents[index].name} (${agents[index].role})`,
      agentIndex: index,
      isAction: true // Prevent looking like a normal chat
    });
    saveCurrentState();
    return true;
  }
  return false;
};

const prevStage = () => {
  if (state.currentStage > 0) {
    state.currentStage--;
    // Add system message indicating rollback
    state.messages.push({
      id: 'sys-rollback-' + Date.now(),
      role: 'system',
      content: `已回退至上一阶段：${agents[state.currentStage].role}`,
      agentIndex: state.currentStage
    });
    saveCurrentState();
    return true;
  }
  return false;
};

const loadSession = (session) => {
  state.currentSessionId = session.id;
  state.messages = session.messages;
  state.currentStage = session.currentStage;
  saveCurrentState();
};

const saveCurrentState = () => {
  // Save current active session
  const currentSession = {
    id: state.currentSessionId,
    messages: state.messages,
    currentStage: state.currentStage
  };
  localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(currentSession));

  // Save to history list
  if (state.messages.length > 1) { // Only save if user has interacted
    const sessionSummary = {
      id: state.currentSessionId,
      date: new Date().toLocaleDateString(),
      title: state.messages.find(m => m.role === 'user')?.content.slice(0, 15) || '新项目',
      preview: state.messages[state.messages.length - 1].content.slice(0, 30),
      messages: state.messages,
      currentStage: state.currentStage
    };

    const idx = state.historySessions.findIndex(s => s.id === state.currentSessionId);
    if (idx > -1) {
      state.historySessions[idx] = sessionSummary;
    } else {
      state.historySessions.unshift(sessionSummary);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.historySessions));
  }
};

// --- Computed ---
const currentAgent = computed(() => agents[state.currentStage] || agents[0]);

export const useAILabStore = () => {
  return {
    state,
    agents,
    currentAgent,
    initStore,
    startNewChat,
    addMessage,
    updateMessageContent,
    setProcessing,
    nextStage,
    jumpToAgent,
    prevStage,
    loadSession,
    saveCurrentState
  };
};