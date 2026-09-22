<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
// Home page — composes the site's section components in order.
// Layout chrome (preloader / navbar / footer) is provided by DefaultLayout.
import HeroSection from '@/components/sections/HeroSection.vue'
import WorksSection from '@/components/sections/WorksSection.vue'
import LabsSection from '@/components/sections/LabsSection.vue'
import AboutSection from '@/components/sections/AboutSection.vue'

const works = ref([
  {
    title: "Angel's Pizza Super App",
    description:
      'A modern pizza ordering app with real-time updates and seamless payment integration.',
    tags: 'Mobile App, Community',
    year: '2026',
    videoSrc: '/assets/video/bangsamoro-app.mp4',
    device: 'phone',
    id: 'angels-pizza-app',
  },
  {
    title: "Ella Batilona's Portfolio",
    description:
      "Portfolio website showcasing Ella's work and skills, expressing her skills thru her portfolio web experience.",
    tags: 'Web App, Portfolio',
    year: '2026',
    videoSrc: '/assets/video/ella-web.mp4',
    device: 'browser',
    id: 'ella-batilona',
  },
  {
    title: 'Bangsamoro Ramadhan App',
    description:
      'A companion app for the Bangsamoro Ramadhan community, providing time differences and prayer schedules.',
    tags: 'Mobile App, Community',
    year: '2026',
    videoSrc: '/assets/video/ramadhan-app.mp4',
    device: 'phone',
    id: 'bangsamoro',
  },
  {
    title: 'JRMSU Pasado Web App',
    description:
      'Mock board exam simulator and training platform for JRMSU students and alumni.',
    tags: 'Web App, Education',
    year: '2025',
    videoSrc: '/assets/video/pasado-app.mp4',
    device: 'browser',
    id: 'pasado',
  },
])

const labs = ref([
  {
    title: "Angel's Pizza Superapp",
    description: 'A mobile app for ordering pizza and managing restaurant operations.',
    category: 'Mobile App, Pizza',
    videoSrc: '/assets/video/bangsamoro-app.mp4',
  },
  {
    title: 'Bangsamoro Ramadhan App',
    description:
      'A mobile app for managing Bangsamoro Ramadhan activities and information.',
    category: 'Mobile App, Religion',
    videoSrc: '/assets/video/ramadhan-app.mp4',
  },
  {
    title: "Angel's Pizza Superapp",
    description: 'A mobile app for ordering pizza and managing restaurant operations.',
    category: 'Mobile App, Pizza',
    videoSrc: '/assets/video/bangsamoro-app.mp4',
    className: 'sm:col-span-2 lg:col-span-1',
  },
])

const isLoading = ref(true)
let loadingTimer

onMounted(() => {
  loadingTimer = setTimeout(() => {
    isLoading.value = false
    window.dispatchEvent(new Event('preloader:data-ready'))
  }, 1200)
})

onBeforeUnmount(() => clearTimeout(loadingTimer))
</script>

<template>
  <div>
    <HeroSection />
    <WorksSection :works="works" :is-loading="isLoading" />
    <LabsSection :labs="labs" :is-loading="isLoading" />
    <AboutSection />
  </div>
</template>
