<script setup>
import { onMounted, ref, nextTick, computed } from 'vue';
import gsap from 'gsap';
import { useToast } from '../composables/useToast';
import { evaluateProject, analyzeProjectNeeds } from '../services/aiService';
import { MarketService } from '../services/api';

const { show } = useToast();
const selectedOrg = ref(null);
const activeTab = ref('story'); // story, updates, comments
const customAmount = ref(''); // Custom donation amount
const isAnalyzing = ref(false);
const isMatching = ref(false);
const projectNeeds = ref({ needs: [], keywords: [] });
const recommendedMakers = ref([]);

const organizations = ref([
  {
    id: 'aiuni',
    name: 'AIUNI',
    subtitle: 'NS 独家公益战略合作伙伴',
    description: 'AIUNI 是深圳上庠青少年科技创新促进中心旗下公益品牌，也是 NS Smart Shopping 本次路演的唯一指定公益合作伙伴。我们致力于为 6 到 15 岁青少年提供均衡成长的科技创新平台，通过赋能各地项目团队，深耕少年儿童双效公益培养。',
    verified: true,
    exclusive: true,
    logoGradient: 'from-blue-600 to-purple-600',
    coverImage: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    goalAmount: 50000,
    raisedAmount: 32450,
    backerCount: 218,
    daysLeft: 12,
    tags: ['科技教育', '青少年', '独家公益'],
    aiAnalysis: {
      innovation: 92,
      socialImpact: 98,
      feasibility: 88,
      comment: "该项目结合了青少年教育与前沿 AI 技术，具有极高的社会价值和可持续发展潜力。NS-AI 算法预测其成功率超过 95%。"
    },
    tiers: [
      { id: 1, amount: 99, title: '爱心支持', desc: '获得电子版感谢证书 + 项目进度周报' },
      { id: 2, amount: 299, title: '筑梦天使', desc: '获得实体感谢证书 + AIUNI 纪念徽章 + 线下路演优先入场券' },
      { id: 3, amount: 999, title: '未来合伙人', desc: '列入年度捐赠名录 + 获邀参加年度科技节 + 定制纪念礼盒' }
    ]
  }
  // 其他组织已暂停展示，等待后续排期
]);

const selectOrg = async (org) => {
  selectedOrg.value = org;
  activeTab.value = 'story';
  recommendedMakers.value = [];
  projectNeeds.value = { needs: [], keywords: [] };

  // Trigger AI Analysis (Parallel)
  isAnalyzing.value = true;
  isMatching.value = true;
  
  try {
    // 1. Evaluate Project
    const evaluatePromise = evaluateProject(org);
    
    // 2. Analyze Needs & Match Makers
    const matchPromise = (async () => {
      // Analyze Needs
      const needsResult = await analyzeProjectNeeds(org.description);
      projectNeeds.value = needsResult;
      
      // Fetch Makers (Mocking matching logic for now as backend filtering is limited)
      // In production: await MarketService.getMakersBySkills(needsResult.needs);
      const allServices = await MarketService.getAllServices();
      
      // Simple client-side filter
      const matched = allServices.filter(s => {
        // Match service type with project needs
        if (needsResult.needs.includes(s.type)) return true;
        // Match tags
        if (s.tags && s.tags.some(t => needsResult.keywords.includes(t))) return true;
        return false;
      }).slice(0, 3); // Top 3
      
      recommendedMakers.value = matched;
    })();

    const [aiResult] = await Promise.all([evaluatePromise, matchPromise]);
    
    if (aiResult) {
      Object.assign(selectedOrg.value.aiAnalysis, aiResult);
    }
  } catch (e) {
    console.error("AI Analysis/Matching failed", e);
  } finally {
    isAnalyzing.value = false;
    isMatching.value = false;
  }

  nextTick(() => {
    const detailEl = document.querySelector('.detail-view');
    if (detailEl) {
      gsap.from(detailEl, { opacity: 0, y: 30, duration: 0.5, ease: 'power2.out' });
    }
  });
};

const backToList = () => {
  const detailEl = document.querySelector('.detail-view');
  if (detailEl) {
    gsap.to(detailEl, { opacity: 0, y: -20, duration: 0.3, onComplete: () => {
      selectedOrg.value = null;
      nextTick(() => initListAnimation());
    }});
  } else {
    selectedOrg.value = null;
    nextTick(() => initListAnimation());
  }
};

const bookRoadshow = () => {
  show('预约成功！我们会通过短信通知您具体的路演链接。', 'success');
};

const supportOrg = (tier) => {
  show(`感谢您的支持！即将跳转支付 ¥${tier.amount}。`, 'success');
};

const handleCustomSupport = () => {
  if (!customAmount.value || customAmount.value <= 0) {
    show('请输入有效的支持金额', 'warning');
    return;
  }
  show(`感谢您的支持！即将跳转支付 ¥${customAmount.value}。`, 'success');
  customAmount.value = ''; // Reset after support
};

const handleCardMouseMove = (e, index) => {
  const card = document.getElementById(`org-card-${index}`);
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
  const card = document.getElementById(`org-card-${index}`);
  if (!card) return;
  
  card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};

const initListAnimation = () => {
  const cards = document.querySelectorAll('.org-card-item');
  if (cards.length > 0) {
    gsap.set(cards, { opacity: 0, y: 50 });
    gsap.to(cards, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.15 });
  }
};

onMounted(() => {
  nextTick(() => initListAnimation());
});

const calculateProgress = (raised, goal) => {
  const p = Math.min((raised / goal) * 100, 100);
  return p.toFixed(1);
};
</script>

<template>
  <div class="pt-24 min-h-screen bg-gray-50 pb-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Header -->
      <div v-if="!selectedOrg" class="hero-section text-center mb-12">
        <h1 class="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
          众筹计划 <span class="text-blue-600">&</span> 公益路演
        </h1>
        <p class="text-lg text-slate-500 max-w-3xl mx-auto mb-6">
          <span class="font-bold text-slate-800">科技向善，让梦想落地。</span><br/>
          即使没有启动资金，只要有好的想法，在这里就有机会获得公益组织、基金会的天使轮支持。
          <span class="text-blue-600">平台不抽取任何佣金</span>，只为成就每一个创新火花。
        </p>
      </div>

      <!-- LIST VIEW -->
      <div v-if="!selectedOrg" class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 list-view">
        <div 
          v-for="(org, index) in organizations" 
          :key="org.id"
          :id="`org-card-${index}`"
          @click="selectOrg(org)"
          @mousemove="(e) => handleCardMouseMove(e, index)"
          @mouseleave="() => handleCardMouseLeave(index)"
          class="org-card-item bg-white rounded-3xl overflow-hidden shadow-lg border border-slate-100 hover:shadow-2xl transition-all duration-200 cursor-pointer group flex flex-col h-full will-change-transform ease-out"
        >
          <!-- Cover Image -->
          <div class="h-48 relative overflow-hidden">
            <img :src="org.coverImage" :alt="org.name" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            <div class="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold text-slate-800 shadow-sm" v-if="org.daysLeft > 0">
              剩余 {{ org.daysLeft }} 天
            </div>
            <div class="absolute top-4 right-4 bg-slate-800/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold text-white shadow-sm" v-else>
              已结束
            </div>
          </div>

          <!-- Content -->
          <div class="p-6 flex-1 flex flex-col">
            <div class="flex items-start justify-between mb-3">
              <h3 class="text-xl font-bold text-slate-900 line-clamp-1">{{ org.name }}</h3>
              <div class="flex gap-1">
                <span v-if="org.exclusive" class="text-xs font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 px-2 py-0.5 rounded-full shadow-sm" title="独家合作伙伴">
                  独家
                </span>
                <span v-if="org.verified" class="text-blue-500" title="已认证">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </span>
              </div>
            </div>
            
            <p class="text-sm text-slate-500 mb-4 line-clamp-2 min-h-[40px]">{{ org.description }}</p>

            <!-- Tags -->
            <div class="flex flex-wrap gap-2 mb-6">
              <span v-for="tag in org.tags" :key="tag" class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{{ tag }}</span>
            </div>

            <!-- Progress Bar -->
            <div class="mt-auto">
              <div class="flex justify-between text-sm mb-1 font-medium">
                <span class="text-slate-900">¥{{ org.raisedAmount.toLocaleString() }}</span>
                <span class="text-gray-500">{{ calculateProgress(org.raisedAmount, org.goalAmount) }}%</span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-1000 ease-out" :style="{ width: calculateProgress(org.raisedAmount, org.goalAmount) + '%' }"></div>
              </div>
              <div class="flex justify-between text-xs text-gray-400 mt-2">
                <span>目标 ¥{{ org.goalAmount.toLocaleString() }}</span>
                <span>{{ org.backerCount }} 人支持</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Add New Placeholder -->
        <div class="org-card-item bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border-2 border-dashed border-blue-200 flex flex-col items-center justify-center p-8 text-center hover:bg-blue-100 hover:border-blue-400 transition-colors min-h-[300px] cursor-pointer group relative overflow-hidden">
          <div class="absolute inset-0 bg-white/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div class="relative z-10">
            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform text-2xl">
              💡
            </div>
            <h3 class="text-xl font-bold text-slate-800 mb-2">我有好点子</h3>
            <p class="text-sm text-slate-600 max-w-xs mb-4">
              提交您的创意，预约线上路演。<br/>
              <span class="font-bold text-blue-600">有机会获得天使轮投资</span>
            </p>
            <button class="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-full transform transition-all group-hover:scale-105">
              立即申请孵化
            </button>
          </div>
        </div>
      </div>

      <!-- DETAIL VIEW -->
      <div v-else class="detail-view max-w-6xl mx-auto">
        <!-- Navigation -->
        <button 
          @click="backToList"
          class="mb-6 flex items-center text-slate-500 hover:text-slate-900 transition-colors font-medium group"
        >
          <div class="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center mr-2 group-hover:border-slate-300 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
          </div>
          返回列表
        </button>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <!-- Left: Main Content -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Header Card -->
            <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
              <div class="flex flex-col md:flex-row gap-6 items-start">
                <img :src="selectedOrg.coverImage" class="w-full md:w-32 md:h-32 rounded-2xl object-cover shadow-md" />
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <span class="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">众筹中</span>
                    <h1 class="text-2xl md:text-3xl font-bold text-slate-900">{{ selectedOrg.name }}</h1>
                  </div>
                  <p class="text-slate-500 mb-4">{{ selectedOrg.subtitle }}</p>
                  <div class="flex flex-wrap gap-4 text-sm">
                    <div class="flex items-center gap-1 text-slate-700">
                      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                      <span class="font-bold">{{ selectedOrg.backerCount }}</span> 人支持
                    </div>
                    <div class="flex items-center gap-1 text-slate-700">
                      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <span class="font-bold">{{ selectedOrg.daysLeft }}</span> 天剩余
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Progress -->
              <div class="mt-8">
                <div class="flex justify-between items-end mb-2">
                  <div>
                    <span class="text-3xl font-bold text-blue-600">¥{{ selectedOrg.raisedAmount.toLocaleString() }}</span>
                    <span class="text-sm text-gray-500 ml-2">已筹集</span>
                  </div>
                  <span class="text-sm font-bold text-slate-700">{{ calculateProgress(selectedOrg.raisedAmount, selectedOrg.goalAmount) }}%</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div class="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full relative transition-all duration-1000 ease-out" :style="{ width: calculateProgress(selectedOrg.raisedAmount, selectedOrg.goalAmount) + '%' }">
                    <div class="absolute right-0 top-0 bottom-0 w-1 bg-white/30 animate-pulse"></div>
                  </div>
                </div>
                <div class="text-right text-xs text-gray-400 mt-2">目标金额 ¥{{ selectedOrg.goalAmount.toLocaleString() }}</div>
              </div>
            </div>

            <!-- AI Insight Card -->
            <div class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 shadow-lg text-white relative overflow-hidden group">
              <!-- Loading Overlay -->
              <div v-if="isAnalyzing" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm z-50 transition-opacity">
                <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p class="text-blue-400 font-mono text-sm animate-pulse">NS-AI Analysis In Progress...</p>
              </div>

              <!-- Background Decoration -->
              <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-overlay filter blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
              
              <div class="flex items-center gap-3 mb-6 relative z-10">
                <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                  <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div>
                  <h3 class="text-xl font-bold">NS-AI 智能评估报告</h3>
                  <p class="text-xs text-slate-400">基于大数据模型的项目潜力分析</p>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <!-- Scores -->
                <div class="space-y-4">
                  <div v-for="(score, label) in { '创新指数': selectedOrg.aiAnalysis.innovation, '社会价值': selectedOrg.aiAnalysis.socialImpact, '可行性': selectedOrg.aiAnalysis.feasibility }" :key="label">
                    <div class="flex justify-between text-sm mb-1">
                      <span class="text-slate-300">{{ label }}</span>
                      <span class="font-bold text-blue-300">{{ score }}</span>
                    </div>
                    <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div class="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" :style="{ width: score + '%' }"></div>
                    </div>
                  </div>
                </div>

                <!-- Comment -->
                <div class="bg-white/5 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                  <div class="flex items-start gap-2">
                    <span class="text-2xl">❝</span>
                    <p class="text-sm text-slate-300 leading-relaxed italic pt-2">
                      {{ selectedOrg.aiAnalysis.comment }}
                    </p>
                  </div>
                  <div class="mt-4 text-right">
                    <span class="text-xs font-mono text-blue-400 opacity-70">Generated by NS-AI v3.0</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Smart Supply Chain Card (New Collaboration Feature) -->
            <div v-if="projectNeeds.needs.length > 0 || isMatching" class="bg-gradient-to-br from-indigo-50 to-white rounded-3xl p-6 border border-indigo-100 shadow-sm relative overflow-hidden">
              <div v-if="isMatching" class="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                <span class="text-indigo-600 text-sm font-bold flex items-center gap-2">
                  <span class="animate-spin">⚡</span> AI 正在匹配供应链...
                </span>
              </div>

              <div class="flex items-center gap-2 mb-4">
                <span class="text-2xl">🤝</span>
                <div>
                  <h3 class="font-bold text-slate-900">智能供应链匹配</h3>
                  <p class="text-xs text-slate-500">AI 识别到项目需要以下支持</p>
                </div>
              </div>

              <!-- Needs Tags -->
              <div class="flex flex-wrap gap-2 mb-6">
                <span v-for="kw in projectNeeds.keywords" :key="kw" class="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                  {{ kw }}
                </span>
              </div>

              <!-- Recommended Makers -->
              <div v-if="recommendedMakers.length > 0">
                <h4 class="text-xs font-bold text-slate-400 uppercase mb-3">推荐创客服务</h4>
                <div class="space-y-3">
                  <div v-for="maker in recommendedMakers" :key="maker.id" class="flex items-center gap-3 p-3 bg-white rounded-xl border border-indigo-50 hover:shadow-md transition-shadow cursor-pointer">
                    <img :src="maker.image" class="w-12 h-12 rounded-lg object-cover bg-gray-100">
                    <div class="flex-1 min-w-0">
                      <div class="font-bold text-slate-800 text-sm truncate">{{ maker.title }}</div>
                      <div class="text-xs text-slate-500 truncate">{{ maker.provider?.username || '认证创客' }} • 评分 4.9</div>
                    </div>
                    <button class="px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">联系</button>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-4 text-slate-400 text-xs">
                暂无完全匹配的创客，<a href="#" class="text-indigo-600 underline">邀请更多创客加入</a>
              </div>
            </div>

            <!-- Tabs & Content -->
            <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div class="flex border-b border-gray-100">
                <button 
                  v-for="tab in ['story', 'updates', 'comments']" 
                  :key="tab"
                  @click="activeTab = tab"
                  class="flex-1 py-4 text-sm font-bold transition-colors relative"
                  :class="activeTab === tab ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'"
                >
                  {{ tab === 'story' ? '项目故事' : tab === 'updates' ? '项目进展' : '支持记录' }}
                  <div v-if="activeTab === tab" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-t-full"></div>
                </button>
              </div>

              <div class="p-8 min-h-[400px]">
                <!-- Story Tab -->
                <div v-if="activeTab === 'story'" class="prose prose-slate max-w-none animate-fade-in">
                  <p class="lead">{{ selectedOrg.description }}</p>
                  <h3>关于我们</h3>
                  <p>我们是一群热衷于公益的年轻人，希望通过科技的力量改变世界。{{ selectedOrg.name }} 项目启动于2026年...</p>
                  <img :src="selectedOrg.coverImage" class="rounded-xl w-full my-6 shadow-sm" />
                  <h3>为什么需要您的支持</h3>
                  <p>所有的资金将用于购买教学设备、场地租赁以及志愿者补贴。我们会定期公开资金使用明细，确保每一分钱都花在刀刃上。</p>
                </div>

                <!-- Updates Tab -->
                <div v-else-if="activeTab === 'updates'" class="space-y-8 animate-fade-in">
                  <div class="relative pl-8 border-l-2 border-gray-100">
                    <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500"></div>
                    <div class="mb-1 text-sm text-gray-400">2026-01-05</div>
                    <h4 class="text-lg font-bold text-slate-900 mb-2">项目正式上线啦！</h4>
                    <p class="text-slate-600">感谢大家的第一波支持，我们已经完成了初步的筹备工作。</p>
                  </div>
                  <div class="relative pl-8 border-l-2 border-gray-100">
                     <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-200 border-2 border-gray-400"></div>
                     <div class="mb-1 text-sm text-gray-400">2026-12-28</div>
                     <h4 class="text-lg font-bold text-slate-900 mb-2">预热准备中</h4>
                     <p class="text-slate-600">团队成员正在紧张地拍摄宣传片，敬请期待。</p>
                   </div>
                </div>

                <!-- Comments Tab -->
                <div v-else-if="activeTab === 'comments'" class="space-y-6 animate-fade-in">
                  <div class="flex gap-4">
                    <div class="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"></div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-slate-900">热心网友</span>
                        <span class="text-xs text-gray-400">2小时前</span>
                      </div>
                      <p class="text-slate-600 mt-1">支持！希望能帮到孩子们。</p>
                    </div>
                  </div>
                  <div class="flex gap-4">
                    <div class="w-10 h-10 rounded-full bg-blue-100 flex-shrink-0"></div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-slate-900">李老师</span>
                        <span class="text-xs text-gray-400">5小时前</span>
                      </div>
                      <p class="text-slate-600 mt-1">非常有意义的项目，已转发朋友圈。</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Sidebar -->
          <div class="lg:col-span-1 space-y-6">
            
            <!-- Support Tiers -->
            <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 sticky top-24">
              <h3 class="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                选择支持项
              </h3>
              
              <div class="space-y-4">
                <div 
                  v-for="tier in selectedOrg.tiers" 
                  :key="tier.id" 
                  class="border border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
                  @click="supportOrg(tier)"
                >
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-lg font-bold text-blue-600">¥{{ tier.amount }}</span>
                    <span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{{ tier.title }}</span>
                  </div>
                  <p class="text-sm text-gray-600 mb-3">{{ tier.desc }}</p>
                  <button class="w-full py-2 bg-slate-900 text-white text-sm font-bold rounded-lg transform transition-all active:scale-95 hover:bg-slate-800">
                    支持 ¥{{ tier.amount }}
                  </button>
                </div>

                <!-- Custom Amount -->
                <div class="border border-dashed border-gray-300 rounded-xl p-4 transition-colors hover:border-blue-500 hover:bg-blue-50">
                  <div class="text-center text-slate-500 mb-3 font-bold">无私奉献 (自定义金额)</div>
                  <div class="flex gap-2">
                    <div class="relative flex-1">
                      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">¥</span>
                      <input 
                        v-model="customAmount" 
                        type="number" 
                        min="1" 
                        placeholder="输入金额"
                        class="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 font-bold bg-white"
                      >
                    </div>
                    <button 
                      @click="handleCustomSupport"
                      :disabled="!customAmount || customAmount <= 0"
                      class="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg transform transition-all active:scale-95 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      支持
                    </button>
                  </div>
                </div>
              </div>

              <!-- Roadshow Booking -->
              <div class="mt-8 pt-6 border-t border-gray-100">
                 <h4 class="font-bold text-slate-900 mb-3">预约路演</h4>
                 <div class="bg-slate-50 rounded-xl p-4 mb-3">
                   <div class="flex items-center text-sm text-slate-600 mb-1">
                     <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                     每周六、日 19:00
                   </div>
                   <div class="text-xs text-gray-400">腾讯会议 / 线下展厅</div>
                 </div>
                 <button @click="bookRoadshow" class="w-full py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                   预约路演名额
                 </button>
              </div>
            </div>

          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
