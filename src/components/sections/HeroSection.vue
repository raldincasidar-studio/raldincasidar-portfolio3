<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

// Hero — full-screen section with background video + intro copy.
const heroVisible = ref(false)

function showHero() {
  heroVisible.value = true
}

function showHeroAfterRouteChange() {
  requestAnimationFrame(() => {
    heroVisible.value = false
    requestAnimationFrame(showHero)
  })
}

onMounted(() => {
  window.addEventListener('preloader:done', showHero)

  if (!document.documentElement.classList.contains('preloader-lock')) {
    showHeroAfterRouteChange()
  }
})

onBeforeUnmount(() => window.removeEventListener('preloader:done', showHero))
</script>

<template>
  <div
    class="relative min-h-screen flex items-end lg:items-center bg-cover bg-center px-4 sm:px-8 lg:px-20 pt-28 pb-16 lg:py-0 bg-gradient-to-b from-slate-800 via-slate-900 to-black"
  >
    <!-- Background video (gradient above acts as a fallback while it loads) -->
    <div class="absolute inset-0 z-0 overflow-hidden">
      <video
        autoplay
        muted
        loop
        playsinline
        class="absolute top-0 left-0 w-full h-full object-cover"
      >
        <source src="/assets/video/head-image-loop.mp4" type="video/mp4" />
      </video>
    </div>

    <!-- Dark overlay -->
    <div class="absolute inset-0 z-[1] bg-black/20"></div>

    <!-- Content -->
    <div class="relative z-[2] max-w-[1500px] mx-auto w-full">
      <div
        class="hero-content w-full lg:max-w-[55%] xl:max-w-[50%]"
        :class="{ 'hero-content-visible': heroVisible }"
      >
        <h1
          class="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white font-bricolage leading-tight mb-6 sm:mb-8 lg:mb-10"
        >
          <div class="hero-reveal-item hero-reveal-name font-bricolage inline">Raldin Casidar.</div>
          <br />
          <div class="hero-reveal-item hero-reveal-role text-white/80 font-bricolage inline">Fullstack Developer &amp; Systems Builder.</div>
        </h1>
        <p class="hero-reveal-item hero-reveal-paragraph text-base sm:text-lg lg:text-xl leading-relaxed text-white/90">
          Fullstack Web Developer specialized in high-performance digital tools.
          With over 30 successful projects delivered, I bridge the gap between
          complex code and seamless user experiences. Based in Zamboanga del
          Norte, Philippines.
        </p>

        <div class="hero-reveal-item hero-reveal-actions mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <a
            href="#works"
            class="py-3 px-6 sm:px-8 rounded-full font-semibold text-black/70 bg-white text-sm sm:text-base lg:text-lg hover:bg-blue hover:opacity-80 transition-opacity duration-300 flex items-center justify-center gap-2"
          >
            View my work
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              class="size-4 bouncing-text"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M8 2a.75.75 0 0 1 .75.75v8.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.22 3.22V2.75A.75.75 0 0 1 8 2Z"
                clip-rule="evenodd"
              />
            </svg>
          </a>
          <a
            href="#about"
            class="py-3 px-6 sm:px-8 rounded-full font-semibold bg-transparent outline outline-white text-white text-sm sm:text-base lg:text-lg hover:bg-blue hover:opacity-80 transition-colors duration-300 text-center"
          >
            Discover my story
          </a>
        </div>

        <p class="hero-reveal-item hero-reveal-case-studies mt-5 text-sm sm:text-base lg:text-lg text-white leading-relaxed">
          Explore 12+ featured case studies
        </p>
      </div>
    </div>
  </div>
</template>
