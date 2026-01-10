<script setup>
import { ref, onMounted, nextTick, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from '../composables/useToast';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent } from 'echarts/components';

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent
]);

const router = useRouter();
const { show: showToast } = useToast();
const currentDate = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });

// --- Data Models ---

const salesStats = ref({
  totalSales: '¥128,500.00',
  growth: '+15.2%',
  todayOrders: 45,
  conversionRate: '3.8%'
});

const videoTraffic = ref({
  totalViews: '1.2M',
  todayViews: '15.6K',
  engagementRate: '8.5%',
  topVideo: '夏季新品发布会'
});

const videoSales = ref({
  totalRevenue: '¥85,400.00',
  topProduct: '智能运动手表 X3',
  conversion: '2.1%'
});

const inventoryAlerts = ref([
  { id: 1, name: '无线蓝牙耳机', stock: 12, sales_velocity: 'High', status: 'critical' },
  { id: 2, name: '运动水壶', stock: 45, sales_velocity: 'Medium', status: 'warning' }
]);

const pricingStrategies = ref([
  { id: 1, name: '智能手环', currentPrice: 199, competitorPrice: 189, suggestion: '降价至 185 以抢占市场' },
  { id: 2, name: '瑜伽垫', currentPrice: 89, competitorPrice: 120, suggestion: '保持价格，强调品质优势' }
]);

const historyCorrections = ref([
  { id: 1, date: '2026-05-10', type: 'Sales', original: '¥120,000', corrected: '¥128,500', reason: '系统延迟数据补录' },
  { id: 2, date: '2026-05-08', type: 'Traffic', original: '1.1M', corrected: '1.15M', reason: '爬虫算法优化' }
]);

const aiInsights = ref([
  {
    id: 1,
    type: 'trend',
    title: '市场趋势预测',
    content: '根据本周数据分析，"户外露营"类目搜索量上涨 45%，建议增加相关视频内容投放。',
    level: 'high'
  },
  {
    id: 2,
    type: 'optimization',
    title: '库存预警',
    content: '爆款"无线蓝牙耳机"库存周转天数低于 3 天，建议及时补货。',
    level: 'medium'
  },
  {
    id: 3,
    type: 'strategy',
    title: '定价策略建议',
    content: '同类竞品平均价格下调 5%，建议开展限时折扣活动以保持竞争力。',
    level: 'low'
  }
]);

// --- Detail Modal Logic ---
const showDetailModal = ref(false);
const currentDetailType = ref(''); // 'sales', 'traffic', 'market'
const detailChartOption = ref({});
const detailData = ref(null);

const openDetail = (type) => {
  currentDetailType.value = type;
  showDetailModal.value = true;
  
  if (type === 'sales') {
    detailData.value = {
      title: '销售数据详情',
      metrics: [
        { label: '近7日总销', value: '¥854,000' },
        { label: '平均客单价', value: '¥245' },
        { label: '复购率', value: '28%' },
        { label: '退款率', value: '1.2%' }
      ]
    };
    detailChartOption.value = {
      tooltip: { 
        trigger: 'axis',
        formatter: (params) => {
          const p = params[0];
          return `${p.name}<br/>${p.seriesName}: ${p.value}<br/><button onclick="window.forwardToCIO('${p.name}', '${p.value}', '销售额')" style="margin-top:5px;background:#4f46e5;color:white;border:none;padding:2px 6px;border-radius:4px;cursor:pointer;font-size:10px;">询问CIO</button>`;
        },
        enterable: true 
      },
      grid: { top: '10%', left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
      yAxis: { type: 'value' },
      series: [{ 
        name: '销售额',
        data: [12000, 13200, 10100, 13400, 9000, 23000, 21000], 
        type: 'line', 
        smooth: true,
        areaStyle: { opacity: 0.2 },
        itemStyle: { color: '#4f46e5' }
      }]
    };
  } else if (type === 'traffic') {
    detailData.value = {
      title: '流量趋势详情',
      metrics: [
        { label: '总曝光', value: '5.4M' },
        { label: '点击率', value: '4.5%' },
        { label: '平均播放', value: '45s' },
        { label: '完播率', value: '12%' }
      ]
    };
    detailChartOption.value = {
      tooltip: { 
        trigger: 'axis', 
        formatter: (params) => {
          const p = params[0];
          return `${p.name}<br/>${p.seriesName}: ${p.value}<br/><button onclick="window.forwardToCIO('${p.name}', '${p.value}', '流量')" style="margin-top:5px;background:#ec4899;color:white;border:none;padding:2px 6px;border-radius:4px;cursor:pointer;font-size:10px;">询问CIO</button>`;
        },
        enterable: true
      },
      grid: { top: '10%', left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
      yAxis: { type: 'value' },
      series: [{ 
        name: '流量',
        data: [820, 932, 901, 934, 1290, 1330, 1320], 
        type: 'bar',
        itemStyle: { color: '#ec4899' }
      }]
    };
  } else if (type === 'history') {
    detailData.value = { title: '历史修正记录' };
  }
};

// Global function for chart tooltip button click
const forwardToCIO = (date, value, type, extra = null) => {
  isChatOpen.value = true;
  if (extra) {
    // Richer context for historical corrections
    inputMessage.value = `【数据修正分析请求】\n日期：${date}\n类型：${type}\n-------------------\n🔴 修正前原值：${extra.original}\n🟢 修正后数值：${value}\n📝 修正原因：${extra.reason}\n-------------------\n请分析此次数据修正对整体业务趋势的影响，并评估数据质量是否存在系统性风险。`;
  } else {
    // Standard chart point analysis
    inputMessage.value = `请分析 ${date} 的${type}数据异常（数值：${value}），并给出改进建议。`;
  }
};

window.forwardToCIO = forwardToCIO;

const handleBack = () => {
  router.back();
};

// Chat State
const isChatOpen = ref(false);
const isChatMaximized = ref(false);
const inputMessage = ref('');
const isTyping = ref(false);
const chatContainer = ref(null);
const messages = ref([
  {
    id: 1,
    role: 'ai',
    content: '你好！我是 NS Smart CIO（首席信息官）。\n我可以为你深度分析店铺数据、诊断经营问题或提供决策建议。\n请问你想了解什么？'
  }
]);

const DEEPSEEK_API_KEY = 'sk-35ae1d84f57449eda853fc209d8630ec';
const API_URL = 'https://api.deepseek.com/chat/completions';

const generateCIOPrompt = () => {
  const context = `
    【当前店铺核心数据】
    - 日期：${currentDate}
    - 总销售额：${salesStats.value.totalSales} (环比增长 ${salesStats.value.growth})
    - 今日订单数：${salesStats.value.todayOrders} 单
    - 支付转化率：${salesStats.value.conversionRate}
    - 视频总播放量：${videoTraffic.value.totalViews} (今日新增 ${videoTraffic.value.todayViews})
    - 爆款视频：${videoTraffic.value.topVideo}
    - 爆款商品：${videoSales.value.topProduct} (贡献营收 ${videoSales.value.totalRevenue})
    
    【库存预警】
    ${inventoryAlerts.value.map(i => `- ${i.name}: 库存${i.stock} (${i.status})`).join('\n')}

    【定价策略】
    ${pricingStrategies.value.map(i => `- ${i.name}: 现价${i.currentPrice}, 竞品${i.competitorPrice}, 建议: ${i.suggestion}`).join('\n')}

    【AI智能洞察库】
    ${aiInsights.value.map(i => `- [${i.type === 'trend' ? '趋势' : i.type === 'optimization' ? '优化' : '策略'}] ${i.title}: ${i.content}`).join('\n')}
  `;

  return `你是一个名为“NS Smart CIO”的虚拟首席信息官，服务于一家学生模拟公司。你的角色是专业、理智、数据驱动的商业顾问。

请基于以下店铺数据进行分析和回答：
${context}

回答原则：
1. **数据驱动**：尽可能引用上述具体数据来支持你的观点。
2. **专业建议**：提供可执行的商业策略（如库存调整、营销活动、定价优化）。
3. **角色代入**：保持专业、自信的CIO语气，不要过于机械，要有高管对话的感觉。
4. **简洁有力**：重点突出，不要长篇大论，适当使用emoji增加可读性。
5. 如果用户问及数据以外的问题，礼貌地引导回商业分析话题。
`;
};

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

const callDeepseekAPI = async (userMsg) => {
  try {
    const history = messages.value.slice(-6).map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content
    }));

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: generateCIOPrompt() },
          ...history,
          { role: 'user', content: userMsg }
        ],
        temperature: 0.7,
        max_tokens: 600
      })
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('API Error:', error);
    return '连接数据中心神经元失败... 请检查网络或稍后重试。';
  }
};

const sendMessage = async () => {
  if (!inputMessage.value.trim()) return;

  const userMsg = inputMessage.value;
  inputMessage.value = '';

  // User Message
  messages.value.push({
    id: Date.now(),
    role: 'user',
    content: userMsg
  });
  scrollToBottom();

  isTyping.value = true;

  // AI Response
  const reply = await callDeepseekAPI(userMsg);

  isTyping.value = false;
  messages.value.push({
    id: Date.now() + 1,
    role: 'ai',
    content: reply
  });
  scrollToBottom();
};

const handleAction = (type) => {
  if (type === 'restock') {
    showToast('已生成智能补货单，发送至供应链系统', 'success');
  } else if (type === 'price') {
    showToast('已应用智能定价策略，预计提升转化率 2%', 'success');
  } else if (type === 'ad') {
    showToast('已自动优化广告投放预算分配', 'success');
  }
};

const handleCardMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  // Subtle tilt effect
  const rotateX = ((y - centerY) / centerY) * -2; 
  const rotateY = ((x - centerX) / centerX) * 2;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
};

const handleCardMouseLeave = (e) => {
  const card = e.currentTarget;
  card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <!-- Header -->
    <header class="bg-white shadow-sm sticky top-0 z-10">
      <div class="flex items-center justify-between px-4 h-14">
        <button @click="handleBack" class="p-2 -ml-2 text-gray-600 hover:text-gray-900 transition">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>
        <h1 class="text-lg font-bold text-gray-900">数据中心</h1>
        <div class="w-8"></div>
      </div>
    </header>

    <div class="p-4 space-y-6">
      <!-- 1. AI Intelligent Analysis of Product Sales (Clickable) -->
      <section 
        @click="openDetail('sales')" 
        @mousemove="handleCardMouseMove"
        @mouseleave="handleCardMouseLeave"
        class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-transform duration-100 ease-out will-change-transform"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold text-gray-800 flex items-center">
            <span class="w-1.5 h-4 bg-blue-600 rounded-full mr-2"></span>
            商品销售智能分析
          </h2>
          <span class="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full flex items-center">
            {{ currentDate }}
            <svg class="w-3 h-3 ml-1 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </span>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-3 border border-blue-100">
            <div class="text-xs text-gray-500 mb-1">总销售额</div>
            <div class="text-lg font-bold text-blue-700">{{ salesStats.totalSales }}</div>
            <div class="text-xs text-blue-600 flex items-center mt-1 font-medium">
              <svg class="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
              {{ salesStats.growth }}
            </div>
          </div>
          <div class="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-3 border border-purple-100">
            <div class="text-xs text-gray-500 mb-1">今日订单</div>
            <div class="text-lg font-bold text-purple-700">{{ salesStats.todayOrders }}</div>
            <div class="text-xs text-purple-600 mt-1 font-medium">转化率 {{ salesStats.conversionRate }}</div>
          </div>
        </div>
        
        <!-- Chart Visual -->
        <div class="h-32 bg-gray-50 rounded-xl flex items-end justify-between px-3 pb-3 pt-8 gap-2 border border-gray-100 overflow-hidden relative">
          <!-- Grid lines -->
          <div class="absolute inset-0 flex flex-col justify-between p-3 opacity-10 pointer-events-none">
             <div class="w-full h-px bg-gray-400"></div>
             <div class="w-full h-px bg-gray-400"></div>
             <div class="w-full h-px bg-gray-400"></div>
          </div>
          <div class="w-full bg-blue-300 rounded-t-sm h-[40%]"></div>
          <div class="w-full bg-blue-400 rounded-t-sm h-[60%]"></div>
          <div class="w-full bg-blue-500 rounded-t-sm h-[30%]"></div>
          <div class="w-full bg-blue-600 rounded-t-sm h-[80%]"></div>
          <div class="w-full bg-blue-700 rounded-t-sm h-[50%]"></div>
          <div class="w-full bg-blue-600 rounded-t-sm h-[70%]"></div>
          <div class="w-full bg-blue-500 rounded-t-sm h-[90%]"></div>
        </div>
      </section>

      <!-- 2. Video Traffic & Sales (Clickable) -->
      <section 
        @click="openDetail('traffic')" 
        @mousemove="handleCardMouseMove"
        @mouseleave="handleCardMouseLeave"
        class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-100 ease-out will-change-transform"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold text-gray-800 flex items-center">
            <span class="w-1.5 h-4 bg-pink-500 rounded-full mr-2"></span>
            视频流量与带货分析
          </h2>
           <span class="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full flex items-center">
            详情
            <svg class="w-3 h-3 ml-1 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </span>
        </div>

        <div class="space-y-4">
          <div class="flex justify-between items-center border-b border-gray-50 pb-3">
            <div>
              <div class="text-sm font-medium text-gray-700 flex items-center">
                 <span class="bg-pink-100 p-1 rounded-md mr-2 text-pink-500"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></span>
                 视频播放流量
              </div>
              <div class="text-xs text-gray-400 mt-1 ml-8">总播放量 {{ videoTraffic.totalViews }}</div>
            </div>
            <div class="text-right">
              <div class="text-lg font-bold text-gray-900">{{ videoTraffic.todayViews }}</div>
              <div class="text-xs text-green-500 bg-green-50 px-1.5 py-0.5 rounded flex items-center justify-end">
                <svg class="w-2.5 h-2.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                12.5%
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center">
            <div>
              <div class="text-sm font-medium text-gray-700 flex items-center">
                <span class="bg-orange-100 p-1 rounded-md mr-2 text-orange-500"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg></span>
                视频带货销量
              </div>
              <div class="text-xs text-gray-400 mt-1 ml-8">爆款: {{ videoSales.topProduct }}</div>
            </div>
            <div class="text-right">
              <div class="text-lg font-bold text-orange-600">{{ videoSales.totalRevenue }}</div>
              <div class="text-xs text-orange-400">转化率 {{ videoSales.conversion }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. Inventory Alerts (New) -->
      <section 
        class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 transition-transform duration-100 ease-out will-change-transform"
        @mousemove="handleCardMouseMove"
        @mouseleave="handleCardMouseLeave"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold text-gray-800 flex items-center">
            <span class="w-1.5 h-4 bg-amber-500 rounded-full mr-2"></span>
            库存预警
          </h2>
          <span class="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-bold">2项</span>
        </div>
        <div class="space-y-3">
          <div v-for="item in inventoryAlerts" :key="item.id" class="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div>
               <div class="font-medium text-gray-800 text-sm">{{ item.name }}</div>
               <div class="text-xs text-gray-500 mt-0.5">剩余库存: <span class="font-bold text-gray-800">{{ item.stock }}</span> | 销速: {{ item.sales_velocity }}</div>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="item.status === 'critical'" class="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">严重</span>
              <span v-else class="text-[10px] bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded">警告</span>
              <button @click.stop="handleAction('restock')" class="bg-white border border-gray-200 text-xs px-2 py-1 rounded-lg text-gray-600 hover:text-indigo-600 hover:border-indigo-200 transition">补货</button>
            </div>
          </div>
        </div>
      </section>

      <!-- 5. Pricing Strategy (New) -->
      <section 
        @click="openDetail('pricing')" 
        @mousemove="handleCardMouseMove"
        @mouseleave="handleCardMouseLeave"
        class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-transform duration-100 ease-out will-change-transform"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold text-gray-800 flex items-center">
            <span class="w-1.5 h-4 bg-emerald-500 rounded-full mr-2"></span>
            定价策略建议
          </h2>
        </div>
        <div class="space-y-3">
          <div v-for="item in pricingStrategies" :key="item.id" class="bg-gray-50 p-3 rounded-xl border border-gray-100">
             <div class="flex justify-between items-start mb-2">
                <div class="font-medium text-gray-800 text-sm">{{ item.name }}</div>
                <div class="text-xs text-gray-400">竞品 ¥{{ item.competitorPrice }}</div>
             </div>
             <div class="flex items-center justify-between">
                <div class="text-lg font-bold text-gray-800">¥{{ item.currentPrice }}</div>
                <div class="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex-1 ml-3 truncate">
                  💡 {{ item.suggestion }}
                </div>
             </div>
          </div>
        </div>
      </section>

      <!-- 6. History Corrections (New) -->
      <section @click="openDetail('history')" class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all active:scale-[0.99]">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold text-gray-800 flex items-center">
            <span class="w-1.5 h-4 bg-gray-400 rounded-full mr-2"></span>
            历史数据修正反馈
          </h2>
          <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </div>
        <div class="space-y-2">
           <div v-for="item in historyCorrections.slice(0, 2)" :key="item.id" class="flex items-center text-xs text-gray-500 border-l-2 border-gray-200 pl-3 py-1">
              <span class="font-mono text-gray-400 mr-2">{{ item.date }}</span>
              <span class="flex-1 truncate">{{ item.reason }}</span>
              <span class="text-indigo-500">查看详情</span>
           </div>
        </div>
      </section>

      <!-- 3. AI CIO Insights -->
      <section class="bg-gradient-to-br from-[#1e1b4b] to-[#312e81] rounded-2xl p-5 shadow-xl text-white relative overflow-hidden">
        <!-- Decor -->
        <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
        <div class="absolute bottom-0 left-0 w-24 h-24 bg-pink-500 rounded-full blur-3xl opacity-20 -ml-10 -mb-10"></div>

        <div class="flex items-center justify-between mb-6 relative z-10">
          <h2 class="font-bold text-lg flex items-center">
            <span class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mr-3 border border-white/20 shadow-inner">
               <span class="text-sm">🤖</span>
            </span>
            CIO 智能决策
          </h2>
          <span class="bg-indigo-500/30 text-indigo-200 text-xs px-2.5 py-1 rounded-full border border-indigo-500/50 flex items-center">
            <span class="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-pulse"></span>
            实时监控中
          </span>
        </div>

        <div class="space-y-3 relative z-10">
          <div v-for="insight in aiInsights" :key="insight.id" class="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/5 hover:bg-white/15 transition-colors">
            <div class="flex items-start gap-3">
              <div class="mt-0.5 bg-white/10 p-1.5 rounded-lg">
                <span v-if="insight.type === 'trend'" class="text-lg">📈</span>
                <span v-else-if="insight.type === 'optimization'" class="text-lg">⚡</span>
                <span v-else class="text-lg">💡</span>
              </div>
              <div class="flex-1">
                <h3 class="font-bold text-indigo-50 text-sm mb-1">{{ insight.title }}</h3>
                <p class="text-xs text-gray-300 leading-relaxed mb-3">{{ insight.content }}</p>
                
                <!-- Action Buttons -->
                <button v-if="insight.type === 'optimization'" 
                  @click="handleAction('restock')"
                  class="group text-xs bg-indigo-500/80 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-all flex items-center w-fit backdrop-blur-sm border border-white/10">
                  <span class="mr-1.5">⚡</span> 一键补货
                  <svg class="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity -mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
                <button v-else-if="insight.type === 'strategy'" 
                  @click="handleAction('price')"
                  class="group text-xs bg-pink-500/80 hover:bg-pink-500 text-white px-3 py-1.5 rounded-lg transition-all flex items-center w-fit backdrop-blur-sm border border-white/10">
                  <span class="mr-1.5">🏷️</span> 应用策略
                  <svg class="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity -mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
                <button v-else 
                  @click="handleAction('ad')"
                  class="group text-xs bg-blue-500/80 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-all flex items-center w-fit backdrop-blur-sm border border-white/10">
                  <span class="mr-1.5">📢</span> 增加投放
                  <svg class="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity -mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <button @click="isChatOpen = true" class="group w-full mt-5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-sm font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-900/50 flex items-center justify-center border border-white/10">
          <span class="mr-2 text-lg">💬</span>
          与 CIO 对话 (深度咨询)
          <svg class="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
        </button>
      </section>
    </div>

    <!-- Data Detail Modal -->
    <div v-if="showDetailModal" class="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" style="z-index: 10000;">
       <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="showDetailModal = false"></div>
       <div class="relative bg-white w-full h-[90vh] sm:h-[700px] sm:w-[600px] sm:rounded-2xl rounded-t-2xl flex flex-col shadow-2xl animate-slide-up overflow-hidden">
         <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-white z-10 shadow-sm">
           <h3 class="font-bold text-gray-900 text-lg">{{ detailData?.title || '数据详情' }}</h3>
           <button @click="showDetailModal = false" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 transition">
             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
           </button>
         </div>
         
         <div class="flex-1 overflow-y-auto p-4 bg-gray-50">
            <!-- Chart or Content -->
            <div v-if="currentDetailType !== 'history'" class="bg-white p-4 rounded-xl shadow-sm mb-4 h-64 border border-gray-100">
               <v-chart class="chart" :option="detailChartOption" autoresize />
            </div>

            <!-- Stats Grid -->
            <div v-if="detailData?.metrics" class="grid grid-cols-2 gap-3 mb-6">
              <div v-for="(m, i) in detailData.metrics" :key="i" class="bg-white p-3 rounded-xl border border-gray-100">
                <div class="text-xs text-gray-500 mb-1">{{ m.label }}</div>
                <div class="text-lg font-bold text-gray-800">{{ m.value }}</div>
              </div>
            </div>

            <!-- History List -->
            <div v-if="currentDetailType === 'history'" class="space-y-4">
               <div v-for="item in historyCorrections" :key="item.id" class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                 <div class="flex justify-between mb-2">
                   <span class="font-bold text-gray-800">{{ item.type }} 数据修正</span>
                   <span class="text-xs text-gray-400">{{ item.date }}</span>
                 </div>
                 <div class="flex items-center gap-3 text-sm mb-3">
                   <div class="text-gray-400 line-through">{{ item.original }}</div>
                   <div class="text-gray-400">→</div>
                   <div class="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">{{ item.corrected }}</div>
                 </div>
                 <div class="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                   原因: {{ item.reason }}
                 </div>
                 <button @click="forwardToCIO(item.date, item.corrected, item.type + '修正', { original: item.original, reason: item.reason })" class="mt-3 w-full text-center text-xs text-indigo-600 font-medium py-1 border border-indigo-100 rounded hover:bg-indigo-50">
                   向 CIO 询问详情
                 </button>
               </div>
            </div>
            
            <div v-if="currentDetailType !== 'history'" class="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
               <p class="text-xs text-indigo-800 mb-3 leading-relaxed">
                 <span class="font-bold">CIO 提示：</span> 点击图表中的数据点，可以直接将该数据发送给我进行深度分析。或者直接点击下方按钮。
               </p>
               <button @click="isChatOpen = true" class="w-full bg-indigo-600 text-white text-sm font-bold py-2.5 rounded-lg shadow-md hover:bg-indigo-700 transition">
                 发起全量数据诊断
               </button>
            </div>
         </div>
       </div>
    </div>

    <!-- Optimized Chat Drawer (Matching AI Smart Shopping Style) -->
    <div v-if="isChatOpen" class="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" style="z-index: 9999;">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="isChatOpen = false"></div>
      
      <!-- Chat Container -->
      <div class="relative bg-white flex flex-col shadow-2xl animate-slide-up overflow-hidden transition-all duration-300 ease-in-out"
           :class="isChatMaximized ? 'fixed inset-0 w-full h-full rounded-none sm:rounded-none z-[10000]' : 'w-full h-[85vh] sm:h-[650px] sm:w-[450px] sm:rounded-2xl rounded-t-2xl'">
        
        <!-- Header -->
        <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-white z-10 shadow-sm">
          <div class="flex items-center">
            <div class="relative">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-md">
                <span class="text-lg">🧠</span>
              </div>
              <div class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div class="ml-3">
              <h3 class="font-bold text-gray-900 text-base">NS Smart CIO</h3>
              <p class="text-xs text-indigo-500 font-medium flex items-center">
                <span class="w-1 h-1 bg-indigo-500 rounded-full mr-1"></span>
                Deepseek-V3 驱动
              </p>
            </div>
          </div>
          <div class="flex items-center">
            <button @click="isChatMaximized = !isChatMaximized" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition mr-2" :title="isChatMaximized ? '还原窗口' : '最大化窗口'">
               <svg v-if="!isChatMaximized" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
               <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14h6m0 0v6m0-6L4 20m6-6l6-6m-6 6h6m0 0v-6"></path></svg>
            </button>
            <button @click="isChatOpen = false" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>

        <!-- Chat Messages Area -->
        <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-5 bg-gray-50 scroll-smooth">
          <!-- Time Divider -->
          <div class="flex justify-center my-2">
            <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{{ new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}</span>
          </div>

          <div v-for="msg in messages" :key="msg.id" class="flex w-full" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
            
            <!-- AI Avatar -->
            <div v-if="msg.role === 'ai'" class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex-shrink-0 flex items-center justify-center text-xs text-white mr-2 mt-1 shadow-sm select-none">
              CIO
            </div>

            <!-- Message Bubble -->
            <div class="max-w-[80%] relative group">
              <div 
                class="px-4 py-3 text-sm shadow-sm leading-relaxed"
                :class="[
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                    : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100'
                ]"
              >
                <div class="whitespace-pre-wrap">{{ msg.content }}</div>
              </div>
              
              <!-- Message Meta -->
              <div class="text-[10px] text-gray-300 mt-1 px-1" :class="msg.role === 'user' ? 'text-right' : 'text-left'">
                {{ msg.role === 'ai' ? 'AI Generated' : 'Read' }}
              </div>
            </div>

            <!-- User Avatar -->
            <div v-if="msg.role === 'user'" class="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-xs text-gray-500 ml-2 mt-1 overflow-hidden shadow-sm select-none">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Me" alt="User" class="w-full h-full object-cover" />
            </div>
          </div>

          <!-- Typing Indicator -->
          <div v-if="isTyping" class="flex w-full justify-start">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex-shrink-0 flex items-center justify-center text-xs text-white mr-2 mt-1 shadow-sm">
              CIO
            </div>
            <div class="bg-white px-4 py-3 rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm flex items-center gap-1.5 h-[46px]">
              <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
              <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
              <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-300"></span>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
          <div class="flex items-end gap-2 bg-gray-50 rounded-2xl p-2 border border-gray-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            <input 
              v-model="inputMessage" 
              @keyup.enter="sendMessage"
              type="text" 
              placeholder="问问 CIO 关于销量的建议..." 
              class="flex-1 bg-transparent border-none rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:ring-0 outline-none min-h-[44px]"
            >
            <button 
              @click="sendMessage"
              :disabled="!inputMessage.trim() || isTyping"
              class="mb-0.5 p-2 rounded-xl bg-indigo-600 text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all transform active:scale-95 flex items-center justify-center w-10 h-10"
            >
              <svg class="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            </button>
          </div>
          <div class="text-center mt-2">
            <p class="text-[10px] text-gray-400">内容由 AI 生成，仅供参考</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-slide-up {
  animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Hide scrollbar for clean UI */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}
</style>
