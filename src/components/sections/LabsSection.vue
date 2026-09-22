<script setup>
import LabCard from '@/components/sections/LabCard.vue'

defineProps({
  labs: { type: Array, required: true },
  isLoading: { type: Boolean, default: false },
})
</script>

<template>
  <div
    class="py-14 sm:py-20 px-4 sm:px-6 bg-[radial-gradient(ellipse_at_center,#132132,#000000)]"
    id="labs"
  >
    <div class="w-full max-w-[1400px] mx-auto">
      <!-- Header -->
      <div
        v-reveal
        class="py-6 sm:py-7 mb-10 sm:mb-16 lg:mb-30 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4 border-b border-white"
      >
        <h2 class="text-3xl sm:text-4xl lg:text-5xl text-white font-bold">
          Apps I shipped,<br />
          <span class="text-[#BBE6F6]">designed &amp; built.</span>
        </h2>
        <p class="text-sm sm:text-base lg:text-lg text-white/70">
          Little experiments where I do it all. I make things that matter.
        </p>
      </div>

      <!-- Grid -->
      <div
        v-show="!isLoading"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10 mt-6 sm:mt-10"
      >
        <LabCard
          v-for="lab in labs"
          :key="lab.id || lab.slug || lab.title + lab.category"
          v-bind="lab"
        />
      </div>
    </div>
  </div>
</template>
