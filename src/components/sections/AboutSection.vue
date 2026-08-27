<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ArrowIcon from '@/components/ui/ArrowIcon.vue'

const aboutHeading = ref(null)
const aboutColorProgress = ref(0)

const aboutWords = computed(() => {
  const segments = [
    {
      text: "I'm Raldin, a developer in Zamboanga del Norte by way of the Philippines. For the last few years, I've helped businesses and communities ship products that actually work. Right now I'm building the",
      color: '#111827',
    },
    {
      text: 'intersection of logic and creativity,',
      color: '#3b82f6',
    },
    {
      text: 'making the web feel',
      color: '#111827',
    },
    {
      text: 'a little more intelligent.',
      color: '#6b7280',
    },
  ]

  return segments.flatMap(({ text, color }) =>
    text.split(/\s+/).map((word) => ({ word, color })),
  )
})

function updateAboutColor() {
  const heading = aboutHeading.value
  if (!heading) return

  const startLine = window.innerHeight * 0.75
  const endLine = window.innerHeight * 0.35
  const { top, height } = heading.getBoundingClientRect()
  const headingCenter = top + height / 2

  aboutColorProgress.value = Math.min(
    100,
    Math.max(0, ((startLine - headingCenter) / (startLine - endLine)) * 100),
  )
}

function getWordColorProgress(index) {
  const wordCount = aboutWords.value.length
  const wordStart = (index / wordCount) * 100
  const wordEnd = ((index + 1) / wordCount) * 100

  return Math.min(
    100,
    Math.max(
      0,
      ((aboutColorProgress.value - wordStart) / (wordEnd - wordStart)) * 100,
    ),
  )
}

onMounted(() => {
  window.addEventListener('scroll', updateAboutColor, { passive: true })
  window.addEventListener('resize', updateAboutColor)
  updateAboutColor()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateAboutColor)
  window.removeEventListener('resize', updateAboutColor)
})
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
            ref="aboutHeading"
            class="about-heading text-2xl sm:text-3xl lg:text-4xl leading-snug sm:leading-relaxed font-semibold my-4 sm:my-8 mt-0 sm:mt-0"
          >
            <template v-for="(item, index) in aboutWords" :key="`${item.word}-${index}`">
              <span
                class="about-word-color-reveal"
                :style="{
                  '--word-color': item.color,
                  '--word-color-progress': `${getWordColorProgress(index)}%`,
                }"
              >{{ item.word }}</span>{{ index < aboutWords.length - 1 ? ' ' : '' }}
            </template>
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
              href="https://ph.linkedin.com/in/raldincasidar"
              target="_blank"
              class="group bg-transparent rounded-full px-4 sm:px-5 py-2 text-sm sm:text-base text-black border hover:text-blue-500 transition-colors duration-300"
            >
              LinkedIn
              <ArrowIcon size-class="size-4 align-middle ml-1 inline group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
            <a
              href="https://drive.google.com/file/d/1gJp8SPxyT5xLZMMsQwI674lzwi0_xzNY/view?usp=drive_link"
              target="_blank"
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

<style scoped>
.about-heading {
  color: #d1d5db;
}

.about-word-color-reveal {
  --word-color-progress: 0%;
  color: transparent;
  background: linear-gradient(
    to right,
    var(--word-color) 0 var(--word-color-progress),
    #d1d5db var(--word-color-progress) 100%
  );
  background-clip: text;
  -webkit-background-clip: text;
}
</style>
