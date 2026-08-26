<script setup>
import WorkCard from '@/components/sections/WorkCard.vue'
import router from '@/router/index.js'

/**
 * "Selected works" grid.
 * Edit this array to add / remove / reorder projects — each entry maps
 * 1:1 to a `<WorkCard />` in the template below.
 */


 const works = [
  {
    title: "Angel's Pizza Super App",
    description:
      'A modern pizza ordering app with real-time updates and seamless payment integration.',
    tags: 'Mobile App, Community',
    year: '2026',
    videoSrc: '/assets/video/bangsamoro-app.mp4',
    device: 'phone',
    id: 'angels-pizza-app'
  },
  {
    title: "Ella Batilona's Portfolio",
    description:
      "Portfolio website showcasing Ella's work and skills, expressing her skills thru her portfolio web experience.",
    tags: 'Web App, Portfolio',
    year: '2026',
    videoSrc: '/assets/video/ella-web.mkv',
    device: 'browser',
    id: 'ella-batilona'
  },
  {
    title: 'Bangsamoro Ramadhan App',
    description:
      'A companion app for the Bangsamoro Ramadhan community, providing time differences and prayer schedules.',
    tags: 'Mobile App, Community',
    year: '2026',
    videoSrc: '/assets/video/ramadhan-app.mp4',
    device: 'phone',
    id: 'bangsamoro'
  },
  {
    title: 'JRMSU Pasado Web App',
    description:
      'Mock board exam simulator and training platform for JRMSU students and alumni.',
    tags: 'Web App, Education',
    year: '2025',
    videoSrc: '/assets/video/pasado-app.mkv',
    device: 'browser',
    id: 'pasado'
  },
]
</script>

<template>
  <div class="py-14 sm:py-20 px-4 sm:px-6" id="works">
    <div class="w-full max-w-[1400px] mx-auto">
      <!-- Header -->
      <div
        v-reveal
        class="py-6 sm:py-7 mb-6 sm:mb-10 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 border-b"
      >
        <h2 class="text-3xl sm:text-4xl lg:text-5xl text-gray-950 font-bold">
          Selected works
        </h2>
        <p class="text-sm sm:text-base lg:text-lg text-black/70">
          Work I'm most proud of — projects I built that solve real-world
          problems.
        </p>
      </div>

      <!-- Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 mt-6 sm:mt-10">
        <WorkCard v-for="work in works" :key="work.title" @click="router.push('/case-study/' + work.id)" v-bind="work" />
      </div>
    </div>
  </div>
</template>
