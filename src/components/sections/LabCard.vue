<script setup>
import ArrowIcon from '@/components/ui/ArrowIcon.vue'

/**
 * LabCard — a single "lab" experiment card (phone mockup style).
 * Reusable: pass `title`, `description`, `category`, `videoSrc` and an
 * optional `className` (e.g. to control column spans in the grid).
 */
const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  videoSrc: { type: String, default: '' },
  imageSrc: { type: String, default: '' },
  className: { type: String, default: '' },
  externalUrl: { type: String, default: '' },
})

function openDemo() {
  if (!props.externalUrl) return
  window.open(props.externalUrl, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div
    v-reveal
    class="group flex items-center justify-center flex-col relative text-center cursor-pointer"
    :class="className"
    :role="externalUrl ? 'link' : undefined"
    :tabindex="externalUrl ? 0 : undefined"
    @click="openDemo"
    @keydown.enter="openDemo"
    @keydown.space.prevent="openDemo"
  >
    <div
      class="relative overflow-hidden group-hover:-translate-y-3 mx-auto transition-transform duration-500 rounded-3xl lg:rounded-[1.4vw] h-auto w-1/2 sm:w-2/3 outline outline-white/20 aspect-[9/19] bg-gray-800 border-4 sm:border-[0.4vw] border-gray-800 shadow-lg group-hover:shadow-xl"
    >
      <!-- Notch -->
      <div
        class="absolute top-[0.8%] left-[50%] w-[30%] h-[3.5%] translate-x-[-50%] bg-gray-900 rounded-full z-10"
      ></div>

      <video
        autoplay
        muted
        loop
        playsinline
        class="absolute top-0 left-0 w-full h-full object-cover"
        :poster="imageSrc || undefined"
      >
        <source v-if="videoSrc" :src="videoSrc" type="video/mp4" />
      </video>
      <img v-if="!videoSrc && imageSrc" :src="imageSrc" :alt="`${title} preview`" class="absolute inset-0 size-full object-cover" />
    </div>

    <div class="flex items-center justify-center gap-2">
      <h3
        class="text-lg sm:text-xl lg:text-2xl text-white my-4 sm:my-5 font-semibold group-hover:text-blue-500 transition-colors duration-300"
      >
        {{ title }}
      </h3>
      <ArrowIcon
        size-class="size-6 translate-y-2 -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 text-blue-500 transition-all duration-300"
      />
    </div>
    <p class="text-sm sm:text-base text-white/90 px-4">{{ description }}</p>
    <p class="text-white/80 text-xs sm:text-sm mt-4 sm:mt-5 uppercase font-bricolage">
      {{ category }}
    </p>
  </div>
</template>
