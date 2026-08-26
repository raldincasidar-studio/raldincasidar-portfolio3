<script setup>
// Home page — composes the site's section components in order.
// Layout chrome (preloader / navbar / footer) is provided by DefaultLayout.
import HeroSection from '@/components/sections/HeroSection.vue'
import WorksSection from '@/components/sections/WorksSection.vue'
import LabsSection from '@/components/sections/LabsSection.vue'
import AboutSection from '@/components/sections/AboutSection.vue'
</script>

<template>
  <div>
    <HeroSection />
    <WorksSection />
    <LabsSection />
    <AboutSection />
  </div>
</template>
