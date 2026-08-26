<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 *  BLANK PAGE TEMPLATE
 *
 *  Copy this file to start a new page (e.g. `src/views/AboutView.vue`),
 *  then register it in `src/router/index.js` as a child of
 *  `DefaultLayout`. The Preloader, Navbar and Footer come along
 *  automatically — you only design the content in between.
 *
 *  Route meta flags available to every page:
 *    • `title`       → browser tab title
 *    • `navbarSolid` → navbar starts with its solid background
 * ════════════════════════════════════════════════════════════════════
 */
</script>

<template>
  <!--
    The wrapper below offsets the fixed navbar. Replace everything inside
    with your own sections — reuse components from `src/components/`
    (e.g. `@/components/sections/HeroSection.vue`) or build new ones.
  -->
  <section class="pt-32 sm:pt-40 pb-16 sm:pb-24 px-4 sm:px-6 min-h-screen">
    <div class="w-full max-w-[1400px] mx-auto">
      <h1 class="text-3xl sm:text-5xl font-bold text-gray-950">Page title</h1>
      <p class="mt-3 text-black/60 text-base sm:text-lg">
        A short description of what this page is about.
      </p>

      <!-- ✏️ Start designing here — delete this placeholder. -->
      <div
        class="mt-10 border-2 border-dashed border-gray-300 rounded-2xl p-10 sm:p-16 flex items-center justify-center text-center bg-gray-50"
      >
        <p class="text-gray-400 text-sm sm:text-base">
          Your content goes here.<br />
          Delete this placeholder and start building.
        </p>
      </div>
    </div>
  </section>
</template>
