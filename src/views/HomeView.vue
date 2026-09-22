<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import HeroSection from '@/components/sections/HeroSection.vue'
import WorksSection from '@/components/sections/WorksSection.vue'
import LabsSection from '@/components/sections/LabsSection.vue'
import AboutSection from '@/components/sections/AboutSection.vue'
import { usePublicContent } from '@/composables/usePublicContent.js'

const { works, labs, isLoading, load } = usePublicContent()
let mounted = true

onMounted(async () => {
  try { await load() } catch { /* sections render their empty state; the preloader must still release */ }
  if (mounted) window.dispatchEvent(new Event('preloader:data-ready'))
})

onBeforeUnmount(() => { mounted = false })
</script>

<template>
  <div>
    <HeroSection />
    <WorksSection :works="works" :is-loading="isLoading" />
    <LabsSection :labs="labs" :is-loading="isLoading" />
    <AboutSection />
  </div>
</template>
