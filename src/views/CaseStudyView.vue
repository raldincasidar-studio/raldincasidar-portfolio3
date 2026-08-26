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

import { onBeforeUnmount, onMounted, ref } from "vue";

const device = ref("phone");
const activeSlide = ref(0);
const sliderElement = ref(null);
const slideElements = ref([]);

function setSlideElement(element) {
  if (element && !slideElements.value.includes(element)) {
    slideElements.value.push(element);
  }
}

function updateActiveSlide() {
  const slider = sliderElement.value;
  if (!slider || !slideElements.value.length) return;

  const sliderCenter =
    slider.getBoundingClientRect().left + slider.clientWidth / 2;
  activeSlide.value = slideElements.value.reduce(
    (closestIndex, slide, index) => {
      const slideCenter =
        slide.getBoundingClientRect().left + slide.clientWidth / 2;
      const closestSlide = slideElements.value[closestIndex];
      const closestCenter =
        closestSlide.getBoundingClientRect().left +
        closestSlide.clientWidth / 2;
      return Math.abs(slideCenter - sliderCenter) <
        Math.abs(closestCenter - sliderCenter)
        ? index
        : closestIndex;
    },
    0,
  );
}

function goToSlide(index) {
  const nextIndex = Math.max(
    0,
    Math.min(index, slideElements.value.length - 1),
  );
  slideElements.value[nextIndex]?.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "center",
  });
  activeSlide.value = nextIndex;
}

onMounted(() => {
  const slider = sliderElement.value;
  slider?.addEventListener("scroll", updateActiveSlide, { passive: true });
  updateActiveSlide();
});

onBeforeUnmount(() => {
  sliderElement.value?.removeEventListener("scroll", updateActiveSlide);
});
</script>

<template>
  <!--
    The wrapper below offsets the fixed navbar. Replace everything inside
    with your own sections — reuse components from `src/components/`
    (e.g. `@/components/sections/HeroSection.vue`) or build new ones.
  -->
  <section
    class="py-20 px-5 pb-12 sm:py-32 sm:px-8 sm:pb-16 lg:py-48 lg:px-10 lg:pb-20 bg-[linear-gradient(to_bottom,#17A6E3,#1794C9)]"
  >
    <div class="relative z-[2] max-w-[1500px] mx-auto w-full">
      <h6 v-reveal class="font-bricolage text-mono text-white/50 text-xs sm:text-sm">
        ANGEL’S PIZZA - 2024-2026 - MOBILE APP
      </h6>
      <h2
        v-reveal
        class="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white my-4 sm:my-5 leading-tight"
      >
        Turning a confusing checkout into Angel's Pizza's fastest-growing sales
        channel.
      </h2>
      <p
        v-reveal
        class="text-white max-w-xl sm:max-w-2xl text-base sm:text-lg leading-relaxed sm:leading-loose text-white/60"
      >
        Angel's Pizza didn't need another redesign, they needed the redesign
        they already had to actually work. Customers were getting lost
        mid-order, checkout took too many taps, and sales were flatlining
        because of it. I took the Figma files and turned them into a real,
        production-grade app.
      </p>

      <div
        v-reveal
        class="mobile overflow-hidden relative max-h-[700px] max-h-lvh mt-12 sm:mt-16 lg:mt-20"
      >
        <!-- Mobile mockup -->
        <div
          class="relative box-border overflow-hidden group-hover:-translate-y-3 mx-auto transition-transform duration-500 rounded-3xl lg:rounded-[1.4vw] w-[min(72vw,420px)] h-auto aspect-[9/19] outline outline-white/20 bg-gray-800 border-4 sm:border-[0.4vw] border-gray-800 shadow-lg group-hover:shadow-xl"
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
          >
            <source
              :src="'/assets/video/bangsamoro-app.mp4'"
              type="video/mp4"
            />
          </video>
        </div>
      </div>
    </div>
  </section>

  <!-- The story -->
  <section class="py-16 sm:py-24 lg:py-30 px-5 lg:px-0 box-border">
    <div
      class="relative z-[2] max-w-[1500px] mx-auto w-full flex flex-col lg:flex-row"
    >
      <div v-reveal class="w-full lg:w-2/3 sm:p-4">
        <p class="text-subtext text-blue-500 font-geist text-xs sm:text-sm">
          - THE STORY
        </p>
        <h2
          class="text-2xl sm:text-3xl lg:text-4xl my-4 sm:my-5 leading-normal sm:leading-relaxed font-semibold"
        >
          I took the provided Figma design and turned it into a fully working
          production app — connecting the interface to real-world features like
          GPS, maps, notifications, authentication, backend services, and
          databases. The result was a faster, clearer ordering experience that
          helped <span class="text-gray-400"
            >double app sales after launch.</span
          >
        </h2>

        <div
          class="border-t border-gray-300 p-2 py-5 flex justify-between items-center"
        >
          <p class="text-xs text-gray-500">MY CONTRIBUTION</p>
          <a href="#!" class="text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-5 sm:size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </a>
        </div>
      </div>
      <div v-reveal class="w-full lg:w-1/3 sm:p-4 mt-8 lg:mt-0">
        <div class="flex flex-wrap">
          <div class="w-1/2 px-2 py-4 sm:py-5">
            <p class="font-giest text-gray-400 text-xs sm:text-sm">ROLE</p>
            <h5 class="font-giest text-gray-800 text-base sm:text-xl mt-2">
              Full-stack App Developer
            </h5>
          </div>
          <div class="w-1/2 px-2 py-4 sm:py-5">
            <p class="font-giest text-gray-400 text-xs sm:text-sm">CLIENT</p>
            <h5 class="font-giest text-gray-800 text-base sm:text-xl mt-2">
              Angel’s Pizza
            </h5>
          </div>
          <div class="w-1/2 px-2 py-4 sm:py-5">
            <p class="font-giest text-gray-400 text-xs sm:text-sm">YEAR</p>
            <h5 class="font-giest text-gray-800 text-base sm:text-xl mt-2">
              2024-2026
            </h5>
          </div>
          <div class="w-1/2 px-2 py-4 sm:py-5">
            <p class="font-giest text-gray-400 text-xs sm:text-sm">
              DISCIPLINE
            </p>
            <h5 class="font-giest text-gray-800 text-base sm:text-xl mt-2">
              Mobile App Development, UX Engineering
            </h5>
          </div>
          <div class="w-full px-2 py-4 sm:py-5">
            <p class="font-giest text-gray-400 text-xs sm:text-sm mb-2">
              SCOPE
            </p>
            <span
              class="p-1.5 sm:p-2 text-xs sm:text-sm px-3 sm:px-4 m-1 border border-gray-300 text-gray-700 rounded-full inline-block"
              >Frontend</span
            >
            <span
              class="p-1.5 sm:p-2 text-xs sm:text-sm px-3 sm:px-4 m-1 border border-gray-300 text-gray-700 rounded-full inline-block"
              >Backend</span
            >
            <span
              class="p-1.5 sm:p-2 text-xs sm:text-sm px-3 sm:px-4 m-1 border border-gray-300 text-gray-700 rounded-full inline-block"
              >UX</span
            >
            <span
              class="p-1.5 sm:p-2 text-xs sm:text-sm px-3 sm:px-4 m-1 border border-gray-300 text-gray-700 rounded-full inline-block"
              >Database</span
            >
          </div>
        </div>

        <div
          class="border-t border-gray-300 p-2 py-5 flex flex-wrap justify-between gap-4"
        >
          <div>
            <h4 class="font-bricolage font-bold text-xl sm:text-2xl text-left">
              +100%
            </h4>
            <p class="text-xs sm:text-sm text-gray-400 mt-1 text-left">
              APP SALES
            </p>
          </div>
          <div>
            <h4 class="font-bricolage font-bold text-xl sm:text-2xl text-left">
              2x
            </h4>
            <p class="text-xs sm:text-sm text-gray-400 mt-1 text-left">
              SALES AFTER LAUNCH
            </p>
          </div>
          <div>
            <h4 class="font-bricolage font-bold text-xl sm:text-2xl text-left">
              6+
            </h4>
            <p class="text-xs sm:text-sm text-gray-400 mt-1 text-left">
              CORE INTEGRATION
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Visual Identity -->
  <section class="py-20 sm:py-28 lg:py-40 px-5 bg-[radial-gradient(#132132,#000000)]">
    <div class="relative max-w-[1300px] mx-auto w-full">
      <h5 v-reveal class="text-center text-xs sm:text-sm text-sky-300 tracking-wide">
        CHAPTER 01
      </h5>
      <h2
        v-reveal
        class="text-white text-3xl sm:text-4xl lg:text-5xl my-4 sm:my-5 font-bold text-center"
      >
        The Visual Identity
      </h2>
      <div class="flex flex-col lg:flex-row">
        <div v-reveal class="w-full lg:w-1/2 p-5 sm:p-8 lg:p-10">
          <div class="mb-2">
            <div
              class="inline-block relative h-16 w-16 sm:h-20 sm:w-20 bg-sky-200 rounded-2xl"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="size-8 sm:size-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z"
                />
              </svg>
            </div>
          </div>

          <p class="text-sky-300 mt-4 sm:mt-5 text-xs sm:text-sm">COLORS</p>
          <h4
            class="text-white text-xl sm:text-2xl lg:text-3xl font-bold my-4 sm:my-5 mb-6 sm:mb-10"
          >
            Built to whet the appetite Body
          </h4>

          <div class="grid grid-cols-2 gap-2 sm:gap-3">
            <div
              class="bg-[#FAD81E] py-8 sm:py-10 lg:py-13 rounded-3xl sm:rounded-4xl px-3 text-center text-black/90"
            >
              <h5 class="text-sm sm:text-lg font-bold mb-1 sm:mb-2">
                Lemon Orange
              </h5>
              <p class="text-xs sm:text-base">#FAD81E</p>
            </div>
            <div
              class="bg-[#FF5E42] py-8 sm:py-10 lg:py-13 rounded-3xl sm:rounded-4xl px-3 text-center text-black/90"
            >
              <h5 class="text-sm sm:text-lg font-bold mb-1 sm:mb-2">
                Stop Orange
              </h5>
              <p class="text-xs sm:text-base">#FF5E42</p>
            </div>
            <div
              class="bg-[#FFFFFF] py-8 sm:py-10 lg:py-13 rounded-3xl sm:rounded-4xl px-3 text-center text-black/90"
            >
              <h5 class="text-sm sm:text-lg font-bold mb-1 sm:mb-2">
                Vanilla
              </h5>
              <p class="text-xs sm:text-base">#FFFFFF</p>
            </div>
            <div
              class="bg-[#06B7F8] py-8 sm:py-10 lg:py-13 rounded-3xl sm:rounded-4xl px-3 text-center text-black/90"
            >
              <h5 class="text-sm sm:text-lg font-bold mb-1 sm:mb-2">
                Sky Blue
              </h5>
              <p class="text-xs sm:text-base">#06B7F8</p>
            </div>
          </div>
        </div>
        <div v-reveal class="w-full lg:w-1/2 p-5 sm:p-8 lg:p-10 mt-4 lg:mt-0">
          <div class="mb-2">
            <div
              class="inline-block relative h-16 w-16 sm:h-20 sm:w-20 bg-sky-200 rounded-2xl"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="size-8 sm:size-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                />
              </svg>
            </div>
          </div>

          <p class="text-sky-300 mt-4 sm:mt-5 text-xs sm:text-sm">FONTS</p>
          <h4
            class="text-white text-xl sm:text-2xl lg:text-3xl font-bold my-4 sm:my-5 mb-6 sm:mb-10"
          >
            Typeset for a fast, easy read Body
          </h4>

          <div class="py-3 sm:py-4">
            <p class="text-sky-300 mb-2 text-xs sm:text-sm">PRIMARY</p>
            <h4 class="text-lg sm:text-2xl text-white my-2 font-semibold">
              POPPINS FONT
            </h4>
          </div>
          <div class="py-3 sm:py-4">
            <p class="text-sky-300 mb-2 text-xs sm:text-sm">SECONDARY</p>
            <h4 class="text-lg sm:text-2xl text-white my-2 font-semibold">
              POPPINS FONT
            </h4>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Solutions Vid -->
  <section class="py-20 sm:py-28 lg:py-40 px-5 bg-[radial-gradient(#BBE6F6,#FFFFFF)]">
    <div class="relative max-w-[1300px] mx-auto w-full">
      <h5 v-reveal class="text-center text-xs sm:text-sm text-sky-500 tracking-wide">
        CHAPTER 02
      </h5>
      <h2
        v-reveal
        class="text-gray-800 text-3xl sm:text-4xl lg:text-5xl my-6 sm:my-10 font-semibold text-center"
      >
        Solutions Highlight
      </h2>
      <p
        v-reveal
        class="max-w-2xl mb-8 sm:mb-10 text-sm sm:text-base text-center mx-auto text-black/70 leading-relaxed px-2"
      >
        The Figma design solved the visual problem. Making it feel fast,
        natural, and premium in someone's hand was a separate job. Here's what
        that looked like in practice.
      </p>
    </div>

    <div
      v-reveal
      ref="sliderElement"
      class="case-study-slider overflow-x-auto scrollbar-none"
      aria-label="Solutions highlights carousel"
    >
      <!-- Preview container -->
      <div class="case-study-slider-track text-center">
        <div
          v-for="i in 5"
          :key="i"
          :ref="setSlideElement"
          class="case-study-slide"
        >
          <div
            class="relative group aspect-[16/9] h-auto overflow-hidden gradient rounded-2xl sm:rounded-3xl lg:rounded-[1.4vw] flex justify-center items-center snap-center"
          >
            <!-- Phone mockup -->
            <div
              v-if="device === 'phone'"
              class="scale-125 sm:scale-150 -mb-[15vw] sm:-mb-[15vw] relative overflow-hidden group-hover:scale-[1.3] sm:group-hover:scale-[1.55] transition-transform duration-500 rounded-2xl sm:rounded-3xl lg:rounded-[1.4vw] h-5/6 w-auto aspect-[9/19] bg-gray-800 border-4 sm:border-[0.4vw] border-gray-800 shadow-lg group-hover:shadow-xl"
            >
              <video
                autoplay
                muted
                loop
                playsinline
                class="absolute top-0 left-0 w-full h-full object-cover"
              >
                <source :src="'/assets/video/bangsamoro-app.mp4'" type="video/mp4" />
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
                <source :src="'/assets/video/bangsamoro-app.mp4'" type="video/mp4" />
              </video>
            </div>
          </div>
          <p class="text-center my-4 sm:my-5 text-sm sm:text-base text-black/70 px-2">
            Smooth, premium transitions between every screen — no jarring
            cuts, no dead space.
          </p>
        </div>
      </div>
    </div>
    <div class="slider-buttons flex justify-center gap-3 sm:gap-5 mt-5">
      <button
        type="button"
        aria-label="Previous solution highlight"
        :disabled="activeSlide === 0"
        class="inline-block p-3 sm:p-4 border border-black/20 rounded-full text-black/60 disabled:opacity-30 disabled:cursor-not-allowed hover:border-black/50 transition-colors"
        @click="goToSlide(activeSlide - 1)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="size-5 sm:size-6"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15.75 19.5 8.25 12l7.5-7.5"
          />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Next solution highlight"
        :disabled="activeSlide === 4"
        class="inline-block p-3 sm:p-4 border border-black/20 rounded-full text-black/60 disabled:opacity-30 disabled:cursor-not-allowed hover:border-black/50 transition-colors"
        @click="goToSlide(activeSlide + 1)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="size-5 sm:size-6"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="m8.25 4.5 7.5 7.5-7.5 7.5"
          />
        </svg>
      </button>
    </div>
  </section>
</template>

<style scoped>
.case-study-slider {
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
}

.case-study-slider-track {
  display: flex;
  gap: 0.75rem;
  width: max-content;
  padding-inline: calc((100vw - min(86vw, 900px)) / 2);
}

.case-study-slide {
  flex: 0 0 min(86vw, 900px);
}

@media (min-width: 640px) {
  .case-study-slider-track {
    gap: 1rem;
  }
}
</style>