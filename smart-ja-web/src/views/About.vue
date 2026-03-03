<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
const pageRoot = ref(null);
let ctx;

onMounted(() => {
  ctx = gsap.context(() => {
    gsap.from('.reveal-text', {
      y: 60,
      opacity: 0,
      duration: 1.2,
      ease: 'power3.out',
      stagger: 0.15
    });
    
    gsap.utils.toArray('.feature-box').forEach((box, i) => {
       gsap.from(box, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
             trigger: box,
             start: "top 85%"
          }
       });
    });
  }, pageRoot.value);
});

onBeforeUnmount(() => {
  if (ctx) ctx.revert();
});
</script>

<template>
  <div ref="pageRoot" class="min-h-screen bg-black text-white pt-32 pb-32 overflow-hidden relative font-sans selection:bg-white/20">
    <div class="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(255,255,255,0.06),_transparent_50%)]"></div>
    <div class="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

    <div class="max-w-4xl mx-auto px-6 relative z-10">
      
      <!-- Hero -->
      <div class="text-center mb-32 reveal-text">
        <h1 class="text-6xl md:text-[6rem] font-medium tracking-tighter mb-8 bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">NS Vision</h1>
        <p class="text-xl md:text-3xl text-slate-400 font-light leading-relaxed max-w-2xl mx-auto tracking-normal">
          AI 驱动的未来商业基座，<br>为创客与数字世界搭建互联桥梁。
        </p>
      </div>

      <div class="space-y-32">
        <!-- Story -->
        <div class="reveal-text">
          <p class="text-xl md:text-[1.75rem] text-slate-300 leading-snug font-light tracking-tight">
            本产品是由 <span class="text-white font-medium">NS智能AI科技有限公司</span> 开发的 AI 驱动型学生商业服务平台。核心团队及运营体系 <span class="text-white font-medium">100% 由人工智能构成</span>，致力于为 NS 学生公司提供一站式数字化解决方案。
          </p>
          <p class="text-xl md:text-[1.75rem] text-slate-300 leading-snug font-light tracking-tight mt-8">
            初代版本参考科技先锋品牌的设计理念，采用极致的分层架构与 AI 动态交互，于 2026 年初完成首次线下路演展示。
          </p>
        </div>

        <!-- Arch -->
        <div class="relative rounded-[3rem] bg-white/[0.02] p-8 md:p-16 border border-white/10 overflow-hidden group">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.04),_transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
          <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent_25%,transparent_75%,rgba(255,255,255,0.03))]"></div>
          
          <h3 class="text-3xl md:text-5xl font-medium mb-12 tracking-tighter text-white">AI 自主化运营矩阵</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div class="feature-box p-8 rounded-3xl bg-black/40 border border-white/5 backdrop-blur-md transition-all hover:bg-white/[0.04] hover:border-white/10">
              <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-6">
                 <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <h4 class="text-xl font-medium text-white mb-3">市场调研智能体</h4>
              <p class="text-slate-400 text-sm leading-relaxed font-light">提供商品趋势分析与数据支持，洞察前沿商业风向。</p>
            </div>
            
            <div class="feature-box p-8 rounded-3xl bg-black/40 border border-white/5 backdrop-blur-md transition-all hover:bg-white/[0.04] hover:border-white/10">
              <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-6">
                 <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
              </div>
              <h4 class="text-xl font-medium text-white mb-3">大数据抓取智能体</h4>
              <p class="text-slate-400 text-sm leading-relaxed font-light">实时追踪竞品信息并自动生成商业布局全景方案。</p>
            </div>
            
            <div class="feature-box p-8 rounded-3xl bg-black/40 border border-white/5 backdrop-blur-md transition-all hover:bg-white/[0.04] hover:border-white/10">
              <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-6">
                 <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              </div>
              <h4 class="text-xl font-medium text-white mb-3">商业布局助手</h4>
              <p class="text-slate-400 text-sm leading-relaxed font-light">基于算法辅助定价策略与销售规划，构建极致转化链路。</p>
            </div>
            
            <div class="feature-box p-8 rounded-3xl bg-black/40 border border-white/5 backdrop-blur-md transition-all hover:bg-white/[0.04] hover:border-white/10">
              <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-6">
                 <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
              </div>
              <h4 class="text-xl font-medium text-white mb-3">虚拟信息执行官</h4>
              <p class="text-slate-400 text-sm leading-relaxed font-light">串联 API 整合用户反馈数据，形成全链路自动化决策闭环。</p>
            </div>
          </div>
        </div>

        <!-- Vision -->
        <div class="reveal-text">
          <h3 class="text-3xl md:text-5xl font-medium mb-8 tracking-tighter text-white">Next Horizon</h3>
          <p class="text-xl md:text-[1.5rem] text-slate-300 leading-snug font-light tracking-tight">
            未来，平台将升级为移动端生态，优化「一句话导购」「动态解析」等核心交互特性；并拓展 AR/VR 场景，支持全模态 3D 试用。最终面向全行业开放大模型接口，成为连接校园先锋项目与智能商业领域的灯塔基建。
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-40 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4 tracking-widest uppercase">
        <span>© 2026 NS Smart Shopping</span>
        <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-white/30"></span> Algorithm Version 1.0 (Alpha)</span>
      </div>
      
    </div>
  </div>
</template>
