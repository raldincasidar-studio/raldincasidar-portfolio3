<script setup>
import ArrowIcon from '@/components/ui/ArrowIcon.vue'

/**
 * WorkCard — a single project card in the "Selected works" grid.
 * Reusable: pass `title`, `description`, `tags`, `year`, `videoSrc`
 * and a `device` ('phone' | 'browser') to render either mockup style.
 */
defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
  tags: { type: String, required: true },
  year: { type: String, required: true },
  videoSrc: { type: String, required: true },
  device: { type: String, default: 'phone' }, // 'phone' | 'browser'
  href: { type: String, default: '#!' },
})
</script>

<template>
  <div v-reveal class="w-full p-2 sm:p-4">
    <!-- Preview container -->
    <div
      class="relative group aspect-[4/3] w-full h-auto overflow-hidden gradient rounded-2xl sm:rounded-3xl lg:rounded-[1.4vw] flex justify-center items-center"
    >
      <div
        class="bg-black/30 cursor-pointer opacity-0 transition-opacity duration-500 group-hover:opacity-100 absolute inset-0 z-10 flex justify-center items-center"
      >
        <a
          :href="href"
          class="px-3 sm:px-4 py-2 bg-white rounded-full text-gray-950 shadow-lg flex items-center gap-2 font-normal text-sm sm:text-base hover:bg-gray-100 transition-colors duration-300"
        >
          View case study
          <ArrowIcon />
        </a>
      </div>

      <!-- Phone mockup -->
      <div
        v-if="device === 'phone'"
        class="scale-125 sm:scale-150 -mb-[15vw] sm:-mb-[11vw] relative overflow-hidden group-hover:scale-[1.3] sm:group-hover:scale-[1.55] transition-transform duration-500 rounded-2xl sm:rounded-3xl lg:rounded-[1.4vw] h-5/6 w-auto aspect-[9/19] bg-gray-800 border-4 sm:border-[0.4vw] border-gray-800 shadow-lg group-hover:shadow-xl"
      >
        <video
          autoplay
          muted
          loop
          playsinline
          class="absolute top-0 left-0 w-full h-full object-cover"
        >
          <source :src="videoSrc" type="video/mp4" />
        </video>
      </div>

      <!-- Browser mockup -->
      <div
        v-else
        class="scale-90 relative overflow-hidden group-hover:scale-95 transition-transform duration-500 rounded-xl sm:rounded-2xl lg:rounded-[1.2vw] h-5/6 w-auto aspect-[16/9] bg-gray-800 border-4 sm:border-[0.4vw] border-gray-800 shadow-lg group-hover:shadow-xl"
      >
        <video
          autoplay
          muted
          loop
          playsinline
          class="absolute top-0 left-0 w-full h-full object-cover"
        >
          <source :src="videoSrc" type="video/mp4" />
        </video>
      </div>
    </div>

    <div class="group cursor-pointer">
      <div class="flex justify-between items-center mt-4 sm:mt-5 mb-2">
        <span class="text-xs sm:text-subtitle text-black/40">{{ tags }}</span>
        <span class="text-xs sm:text-subtitle text-black/40">{{ year }}</span>
      </div>
      <h3
        class="relative text-xl sm:text-2xl lg:text-3xl font-bold group-hover:text-blue-500 transition-colors duration-300"
      >
        {{ title }}
        <ArrowIcon
          size-class="size-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 group-hover:top-0 group-hover:right-0 transition-all duration-300"
        />
      </h3>
      <p class="mt-3 sm:mt-4 text-sm sm:text-base lg:text-lg text-black/70">
        {{ description }}
      </p>
    </div>
  </div>
</template>
