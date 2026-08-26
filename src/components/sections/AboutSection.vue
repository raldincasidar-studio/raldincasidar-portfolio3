<script setup>
import ArrowIcon from '@/components/ui/ArrowIcon.vue'
</script>

<template>
  <div class="py-16 sm:py-24 lg:py-40 px-4 sm:px-6" id="about">
    <div class="w-full max-w-[1400px] mx-auto">
      <h3
        v-reveal
        class="uppercase text-gray-500 tracking-[0.4rem] sm:tracking-[0.7rem] mx-0 sm:mx-4 mb-4 text-xs sm:text-sm"
      >
        About
      </h3>

      <div class="flex flex-col lg:flex-row gap-8 lg:gap-0">
        <div v-reveal class="w-full lg:w-2/3 p-1 sm:p-3">
          <h1
            class="text-2xl sm:text-3xl lg:text-4xl leading-snug sm:leading-relaxed font-semibold my-4 sm:my-8 mt-0 sm:mt-0"
          >
            I'm Raldin, a developer in Zamboanga del Norte by way of the
            Philippines. For the last few years, I've helped businesses and
            communities ship products that actually work. Right now I'm
            building the
            <span class="text-blue-500">intersection of logic and creativity</span>,
            making the web feel
            <span class="text-gray-500">a little more intelligent.</span>
          </h1>

          <div class="flex flex-wrap gap-2">
            <div
              class="py-1.5 sm:py-2 px-3 border border-gray-300 bg-gray-100 text-gray-800 rounded-full text-xs sm:text-sm font-semibold"
            >
              <span>🌎 Zamboanga del Norte, PH</span>
            </div>
            <div
              class="py-1.5 sm:py-2 px-3 border border-gray-300 bg-gray-100 text-gray-800 rounded-full text-xs sm:text-sm font-semibold"
            >
              <span>💻 30+ Projects Shipped</span>
            </div>
            <div
              class="py-1.5 sm:py-2 px-3 border border-gray-300 bg-gray-100 text-gray-800 rounded-full text-xs sm:text-sm font-semibold"
            >
              <span>☕ Late-night coding sessions</span>
            </div>
          </div>
        </div>

        <div v-reveal class="w-full lg:w-1/3 p-1 sm:p-3">
          <p class="text-gray-600 text-base sm:text-lg">
            I think of code less like a set of instructions and more like a
            tool for scale. The best work happens when the technology
            disappears and only the solution remains. Honest, fast, and
            genuinely useful.
          </p>

          <div class="flex flex-wrap gap-2 mt-5">
            <a
              href="#!"
              class="bg-transparent rounded-full px-4 sm:px-5 py-2 text-sm sm:text-base text-black border hover:text-blue-500 transition-colors duration-300"
            >
              Discover my story
              <ArrowIcon size-class="size-4 align-middle ml-1 inline" />
            </a>
            <a
              href="#!"
              class="bg-black rounded-full px-4 sm:px-5 py-2 text-sm sm:text-base text-white hover:scale-105 transition-transform duration-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                class="size-4 align-middle mr-1 inline"
                aria-hidden="true"
              >
                <path
                  d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z"
                />
                <path
                  d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z"
                />
              </svg>
              Download my resume
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
