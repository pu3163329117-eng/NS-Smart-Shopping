<script setup>
const handleCardMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -1;
  const rotateY = ((x - centerX) / centerX) * 1;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
};

const handleCardMouseLeave = (e) => {
  e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};
</script>

<template>
  <div class="pt-24 min-h-screen bg-gray-50 pb-20">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div 
        class="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-12 transition-all duration-300 ease-out will-change-transform"
        @mousemove="handleCardMouseMove"
        @mouseleave="handleCardMouseLeave"
      >
        <h1 class="text-3xl font-bold text-slate-900 mb-8">帮助中心</h1>
        
        <div class="space-y-8">
          <section>
            <h2 class="text-xl font-bold text-slate-800 mb-4">常见问题</h2>
            <div class="space-y-4">
              <div v-for="i in 3" :key="i" class="border-b border-gray-100 pb-4 last:border-0 group hover:translate-x-1 transition-transform duration-300">
                <h3 class="font-medium text-slate-900 mb-2 cursor-pointer group-hover:text-blue-600 transition-colors">如何发起一个众筹项目？</h3>
                <p class="text-slate-500 text-sm">您可以在众筹页面点击“发起项目”按钮，按照指引填写项目信息并提交审核。审核通过后即可上线。</p>
              </div>
            </div>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-800 mb-4">联系我们</h2>
            <div class="bg-blue-50 rounded-xl p-6">
              <p class="text-slate-700 mb-4">如果以上内容无法解决您的问题，请随时联系我们的客服团队。</p>
              <button class="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                在线客服
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>