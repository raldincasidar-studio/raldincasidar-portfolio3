<script setup>
import ArrowIcon from '@/components/ui/ArrowIcon.vue'
</script>

<template>
  <footer class="bg-[#17A6E3] text-white py-16 sm:py-24 lg:py-30">
    <div class="w-full max-w-[1500px] mx-auto px-4 sm:px-6">
      <!-- Big email CTA -->
      <a
        href="mailto:hello@raldincasidar.studio"
        class="group font-bold block w-full text-xl sm:text-3xl md:text-5xl lg:text-6xl break-words"
      >
        hello@raldincasidar.studio
        <ArrowIcon
          size-class="size-8 sm:size-10 md:size-12 lg:size-15 align-middle ml-1 inline group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-300"
        />
      </a>

      <!-- Socials -->
      <div
        class="border-t border-white/70 py-8 sm:py-10 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 mt-8 sm:mt-10 mb-8 sm:mb-10"
      >
        <div>
          <p class="text-white/70 uppercase tracking-[0.3rem] sm:tracking-[0.4rem] text-xs mb-2">
            Facebook
          </p>
          <a href="https://fb.me/raldincasidar" target="_blank" class="block text-white text-sm sm:text-base">@raldincasidar</a>
        </div>
        <div>
          <p class="text-white/70 uppercase tracking-[0.3rem] sm:tracking-[0.4rem] text-xs mb-2">
            LinkedIn
          </p>
          <a href="https://ph.linkedin.com/in/raldincasidar" target="_blank" class="block text-white text-sm sm:text-base">@raldincasidar</a>
        </div>
        <div>
          <p class="text-white/70 uppercase tracking-[0.3rem] sm:tracking-[0.4rem] text-xs mb-2">
            BASED IN
          </p>
          <span class="block text-white text-sm sm:text-base">Philippines</span>
        </div>
      </div>

      <p class="text-white/70 uppercase text-[10px] sm:text-xs mb-2">
        © 2026 Raldin Casidar. DESIGNED AND BUILT IN THE PHILIPPINES
      </p>
    </div>
  </footer>
</template>
