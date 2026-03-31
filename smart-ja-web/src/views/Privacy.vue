<template>
  <div class="min-h-screen bg-[#0a0a0c] pb-20 pt-24 text-white">
    <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <article class="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl md:p-12">
        <header class="mb-10">
          <p class="text-[11px] uppercase tracking-[0.24em] text-white/35">{{ $t('privacy.modalLabel') }}</p>
          <h1 class="mt-3 text-4xl font-medium tracking-tighter">{{ $t('privacy.title') }}</h1>
          <p class="mt-3 text-sm text-white/45">{{ $t('privacy.updatedAt') }}</p>
        </header>

        <section class="space-y-8">
          <div>
            <h2 class="text-2xl font-medium tracking-tight">{{ $t('privacy.sections.collection.title') }}</h2>
            <p class="mt-3 text-sm leading-7 text-white/48">{{ $t('privacy.sections.collection.body') }}</p>
          </div>

          <div>
            <h2 class="text-2xl font-medium tracking-tight">{{ $t('privacy.sections.usage.title') }}</h2>
            <p class="mt-3 text-sm leading-7 text-white/48">{{ $t('privacy.sections.usage.body') }}</p>
          </div>

          <div>
            <h2 class="text-2xl font-medium tracking-tight">{{ $t('privacy.sections.sharing.title') }}</h2>
            <p class="mt-3 text-sm leading-7 text-white/48">{{ $t('privacy.sections.sharing.body') }}</p>
          </div>

          <div>
            <h2 class="text-2xl font-medium tracking-tight">{{ $t('privacy.sections.security.title') }}</h2>
            <p class="mt-3 text-sm leading-7 text-white/48">{{ $t('privacy.sections.security.body') }}</p>
          </div>
        </section>
      </article>
    </div>
  </div>
</template>
