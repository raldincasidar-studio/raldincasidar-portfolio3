<script setup>
import WorkCard from '@/components/sections/WorkCard.vue'
import router from '@/router/index.js'

defineProps({
  works: { type: Array, required: true },
  isLoading: { type: Boolean, default: false },
})

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
      <div
        v-show="!isLoading"
        class="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 mt-6 sm:mt-10"
      >
        <WorkCard v-for="work in works" :key="work.title" @click="router.push('/case-study/' + work.id)" v-bind="work" />
      </div>
    </div>
  </div>
</template>
