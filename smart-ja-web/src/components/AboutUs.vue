<script setup>
import { onMounted, ref } from 'vue';
import gsap from 'gsap';

const emit = defineEmits(['close']);
const modalContent = ref(null);

onMounted(() => {
  gsap.from(modalContent.value, {
    y: 50,
    opacity: 0,
    duration: 0.5,
    ease: 'power3.out'
  });
});
</script>

<template>
  <div class="fixed inset-0 z-[60] flex items-center justify-center px-4">
    <!-- 背景遮罩 (Backdrop Blur) -->
    <div class="absolute inset-0 bg-black/30 backdrop-blur-md transition-opacity" @click="$emit('close')"></div>

    <!-- 内容卡片 -->
    <div ref="modalContent" class="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
      
      <!-- 关闭按钮 -->
      <button @click="$emit('close')" class="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors z-10">
        <svg class="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>

      <!-- 滚动区域 -->
      <div class="overflow-y-auto p-8 md:p-12 custom-scrollbar">
        <div class="max-w-3xl mx-auto">
          <h2 class="text-3xl font-bold mb-4">关于 NS Smart Shopping</h2>
          <div class="h-1 w-20 bg-blue-600 mb-8"></div>

          <div class="space-y-8 text-lg text-slate-600 leading-relaxed text-justify">
            <p>
              本产品是由 <span class="font-semibold text-slate-900">NS智能AI科技有限公司</span> 开发的 AI 驱动型学生商业服务平台，核心团队及运营体系 100% 由人工智能构成，致力于为 NS 学生公司提供一站式数字化解决方案。初代版本以网站形式呈现，参考 Apple、华为等科技品牌的设计理念，采用分层导航架构与 AI 动态交互技术，支持商品展示、智能导购及客服响应，并嵌入 AI 生成视频动图的商品预览功能，于 2026 年 1 月 11 日 NS 学生线下路演中完成首次产品部分展示。
            </p>

            <div 
              @mousemove="handleCardMouseMove"
              @mouseleave="handleCardMouseLeave"
              class="bg-slate-50 p-6 rounded-2xl border border-slate-100 transition-all duration-100 ease-out will-change-transform hover:shadow-md cursor-pointer"
            >
              <h3 class="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <svg class="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                AI 自主化运营体系
              </h3>
              <p>
                平台后端管理系统全面实现 AI 自主化运营，通过集成谷歌 Gemini 语言大模型，构建五大智能体矩阵：
              </p>
              <ul class="mt-4 space-y-2 list-disc list-inside text-base">
                <li><span class="font-medium text-slate-800">市场调研智能体</span>：提供商品趋势分析与数据支持</li>
                <li><span class="font-medium text-slate-800">大数据抓取智能体</span>：实时追踪竞品信息并生成商业布局方案</li>
                <li><span class="font-medium text-slate-800">商业布局助手</span>：辅助定价策略与销售规划</li>
                <li><span class="font-medium text-slate-800">虚拟首席信息执行官</span>：整合用户反馈数据，形成全链路商业决策闭环</li>
              </ul>
            </div>

            <p>
              未来，平台将升级为移动端 APP，优化“一句话导购”“动态商品解析”等核心功能，并拓展 AR/VR 购物场景，支持 3D 商品试用与设计服务，最终面向全行业开放 AI 导购能力，成为连接学生创业与智能商业的创新桥梁。
            </p>
          </div>
          
          <div class="mt-12 flex justify-center">
             <span class="text-sm text-slate-400">© 2026 NS Smart Shopping. All Rights Reserved.</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(107, 114, 128, 0.8);
}
</style>