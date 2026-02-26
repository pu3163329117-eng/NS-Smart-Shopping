<script setup>
import { onMounted, ref } from 'vue';
import gsap from 'gsap';

const handleCardMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -2;
  const rotateY = ((x - centerX) / centerX) * 2;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
};

const handleCardMouseLeave = (e) => {
  e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};

onMounted(() => {
  gsap.from('.about-content', {
    y: 50,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
    stagger: 0.2
  });
});
</script>

<template>
  <div class="pt-24 min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto px-6 py-12">
      <div class="about-content">
        <h1 class="text-3xl font-bold mb-4">关于 NS Smart Shopping</h1>
        <p class="text-gray-600 mb-4">
          本产品是由 <span class="font-semibold text-slate-900">NS智能AI科技有限公司</span> 开发的 AI 驱动型学生商业服务平台，核心团队及运营体系 100% 由人工智能构成，致力于为 NS 学生公司提供一站式数字化解决方案。初代版本以网站形式呈现，参考 Apple、华为等科技品牌的设计理念，采用分层导航架构与 AI 动态交互技术，支持商品展示、智能导购及客服响应，并嵌入 AI 生成视频动图的商品预览功能，于 2026 年 1 月 11 日 NS 学生线下路演中完成首次产品部分展示。
        </p>

        <div 
          class="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 transition-all duration-300 ease-out will-change-transform"
          @mousemove="handleCardMouseMove"
          @mouseleave="handleCardMouseLeave"
        >
          <h3 class="text-2xl font-bold text-slate-900 mb-6 flex items-center">
            <span class="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-4">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </span>
            AI 自主化运营体系
          </h3>
          <p class="mb-6">
            平台后端管理系统全面实现 AI 自主化运营，通过集成谷歌 Gemini 语言大模型，构建五大智能体矩阵：
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-start hover:bg-slate-50 p-2 rounded-lg transition-colors duration-300">
              <span class="text-blue-500 mr-2">•</span>
              <span><span class="font-bold text-slate-800">市场调研智能体</span>：提供商品趋势分析与数据支持</span>
            </div>
            <div class="flex items-start hover:bg-slate-50 p-2 rounded-lg transition-colors duration-300">
              <span class="text-blue-500 mr-2">•</span>
              <span><span class="font-bold text-slate-800">大数据抓取智能体</span>：实时追踪竞品信息并生成商业布局方案</span>
            </div>
            <div class="flex items-start hover:bg-slate-50 p-2 rounded-lg transition-colors duration-300">
              <span class="text-blue-500 mr-2">•</span>
              <span><span class="font-bold text-slate-800">商业布局助手</span>：辅助定价策略与销售规划</span>
            </div>
            <div class="flex items-start hover:bg-slate-50 p-2 rounded-lg transition-colors duration-300">
              <span class="text-blue-500 mr-2">•</span>
              <span><span class="font-bold text-slate-800">虚拟首席信息执行官</span>：整合用户反馈数据，形成全链路商业决策闭环</span>
            </div>
          </div>
        </div>

        <p>
          未来，平台将升级为移动端 APP，优化“一句话导购”“动态商品解析”等核心功能，并拓展 AR/VR 购物场景，支持 3D 商品试用与设计服务，最终面向全行业开放 AI 导购能力，成为连接学生创业与智能商业的创新桥梁。
        </p>
      </div>

      <div class="mt-20 text-center about-content">
        <span class="text-sm text-slate-400">© 2026 NS Smart Shopping. All Rights Reserved.</span>
      </div>
    </div>
  </div>
</template>
