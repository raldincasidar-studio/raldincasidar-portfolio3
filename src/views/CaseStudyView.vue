<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 *  BLANK PAGE TEMPLATE
 * ════════════════════════════════════════════════════════════════════
 */

import { computed, onBeforeUnmount, onMounted, ref, nextTick } from "vue";
import { useRoute } from "vue-router";
import { getWork } from "@/api/publicContent.js";
import { normalizePublicError } from "@/utils/publicErrors.js";

const route = useRoute();
const device = ref("phone");
const hero_device = ref("browser");
const activeSlide = ref(0);
const sliderElement = ref(null);
const slideElements = ref([]);
const storyHeading = ref(null);
const storyColorProgress = ref(0);

/* ──────────────────────────────────────────────
 *  "SERVER" DATA + LOADING STATE
 *  In real app this would come from an API call.
 * ────────────────────────────────────────────── */
const isLoading = ref(true);
const pageData = ref(null);
const storyWords = computed(() =>
  pageData.value?.the_story?.match(/\S+/g) ?? [],
);

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

function updateStoryColor() {
  const heading = storyHeading.value;
  if (!heading) return;

  const startLine = window.innerHeight * 0.80;
  const endLine = window.innerHeight * 0.30;
  const { top, height } = heading.getBoundingClientRect();
  const headingCenter = top + height / 2;
  storyColorProgress.value = Math.min(
    100,
    Math.max(
      0,
      ((startLine - headingCenter) / (startLine - endLine)) * 100,
    ),
  );
}

function getWordColorProgress(index) {
  const wordCount = storyWords.value.length;
  if (!wordCount) return 0;

  const wordStart = (index / wordCount) * 100;
  const wordEnd = ((index + 1) / wordCount) * 100;
  return Math.min(
    100,
    Math.max(
      0,
      ((storyColorProgress.value - wordStart) / (wordEnd - wordStart)) * 100,
    ),
  );
}

/* API-backed case-study data. The presentation model remains compatible with
 * the existing template so the visual layout is unchanged. */
const requestError = ref(null);

async function fetchPageData() {
  isLoading.value = true;
  requestError.value = null;
  try {
    pageData.value = await getWork(route.params.id);
    device.value = pageData.value.hero_video.type || device.value;
    await nextTick();
    updateActiveSlide();
    updateStoryColor();
  } catch (error) {
    requestError.value = normalizePublicError(error);
    pageData.value = null;
  } finally {
    isLoading.value = false;
    await nextTick();
    window.dispatchEvent(new Event("preloader:data-ready"));
  }
}

onMounted(() => {
  fetchPageData();

  const slider = sliderElement.value;
  slider?.addEventListener("scroll", updateActiveSlide, { passive: true });
  window.addEventListener("scroll", updateStoryColor, { passive: true });
  window.addEventListener("resize", updateStoryColor);
  updateStoryColor();
});

onBeforeUnmount(() => {
  sliderElement.value?.removeEventListener("scroll", updateActiveSlide);
  window.removeEventListener("scroll", updateStoryColor);
  window.removeEventListener("resize", updateStoryColor);
});
</script>

<template>
  <div v-if="requestError" class="min-h-[70vh] bg-[linear-gradient(to_bottom,#17A6E3,#1794C9)] px-5 py-40 text-center text-white">
    <h1 class="font-bricolage text-4xl font-bold">{{ requestError.title }}</h1>
    <p class="mx-auto mt-4 max-w-lg text-white/80">{{ requestError.message }}</p>
    <button class="mt-8 rounded-full bg-white px-6 py-3 text-gray-950" @click="fetchPageData">Try again</button>
  </div>
  <template v-else>
  <!-- HERO -->
  <section
    class="py-20 px-5 pb-12 sm:py-32 sm:px-8 sm:pb-16 lg:py-48 lg:px-10 lg:pb-20 bg-[linear-gradient(to_bottom,#17A6E3,#1794C9)]"
  >
    <div class="relative z-[2] max-w-[1500px] mx-auto w-full">
      <!-- Eyebrow -->
      <template v-if="isLoading">
        <div class="h-3 w-64 sm:w-80 bg-white/20 rounded animate-pulse"></div>
      </template>
      <h6
        v-else
        v-reveal
        class="font-bricolage text-mono text-white/50 text-xs sm:text-sm"
      >
        {{ pageData.client_name }} - {{ pageData.year }} - {{ pageData.type }}
      </h6>

      <!-- Title -->
      <template v-if="isLoading">
        <div class="my-4 sm:my-5 space-y-3">
          <div class="h-8 sm:h-12 lg:h-14 w-full bg-white/20 rounded animate-pulse"></div>
          <div class="h-8 sm:h-12 lg:h-14 w-4/5 bg-white/20 rounded animate-pulse"></div>
        </div>
      </template>
      <h2
        v-else
        v-reveal
        class="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white my-4 sm:my-5 leading-tight"
      >
        {{ pageData.case_title }}
      </h2>

      <!-- Description -->
      <template v-if="isLoading">
        <div class="max-w-xl sm:max-w-2xl space-y-2">
          <div class="h-3 sm:h-4 w-full bg-white/10 rounded animate-pulse"></div>
          <div class="h-3 sm:h-4 w-full bg-white/10 rounded animate-pulse"></div>
          <div class="h-3 sm:h-4 w-3/4 bg-white/10 rounded animate-pulse"></div>
        </div>
      </template>
      <p
        v-else
        v-reveal
        class="text-white max-w-xl sm:max-w-2xl text-base sm:text-lg leading-relaxed sm:leading-loose text-white/60"
      >
        {{ pageData.case_description }}
      </p>

      <div
        v-reveal
        class="mobile overflow-hidden relative max-h-[700px] max-h-lvh mt-12 sm:mt-16 lg:mt-20"
      >
        <!-- Loading skeleton for mockup -->
        <template v-if="isLoading">
          <div
            class="relative box-border overflow-hidden mx-auto rounded-3xl lg:rounded-[1.4vw] w-full h-auto aspect-[16/9] bg-white/10 animate-pulse border-4 sm:border-[0.4vw] border-white/10"
          ></div>
        </template>

        <template v-else>
          <!-- Mobile mockup -->
          <div
            v-if="pageData.hero_video.type == 'phone'"
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
              <source :src="pageData.hero_video.src" type="video/mp4" />
            </video>
          </div>

          <!-- browser mockup -->
          <div
            v-if="pageData.hero_video.type == 'browser'"
            class="relative box-border overflow-hidden group-hover:-translate-y-3 mx-auto transition-transform duration-500 rounded-3xl lg:rounded-[1.4vw] w-full h-auto aspect-[16/9] outline outline-white/20 bg-gray-800 border-4 sm:border-[0.4vw] border-gray-800 shadow-lg group-hover:shadow-xl"
          >
            <video
              autoplay
              muted
              loop
              playsinline
              class="absolute top-0 left-0 w-full h-full object-cover"
            >
              <source :src="pageData.hero_video.src" type="video/mp4" />
            </video>
          </div>
        </template>
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
          - CHAPTER 01: THE STORY
        </p>

        <!-- Story text -->
        <template v-if="isLoading">
          <div class="my-4 sm:my-5 space-y-3">
            <div class="h-6 sm:h-8 w-full bg-gray-200 rounded animate-pulse"></div>
            <div class="h-6 sm:h-8 w-full bg-gray-200 rounded animate-pulse"></div>
            <div class="h-6 sm:h-8 w-2/3 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </template>
        <h2
          v-else
          ref="storyHeading"
          class="text-2xl sm:text-3xl lg:text-4xl my-4 sm:my-5 leading-normal sm:leading-relaxed font-semibold"
        >
          <template v-for="(word, index) in storyWords" :key="`${word}-${index}`">
            <span
              class="story-word-color-reveal"
              :style="{ '--word-color-progress': `${getWordColorProgress(index)}%` }"
            >{{ word }}</span>{{ index < storyWords.length - 1 ? " " : "" }}
          </template>
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
          <!-- Contribution info -->
          <template v-if="isLoading">
            <div v-for="n in 4" :key="n" class="w-1/2 px-2 py-4 sm:py-5">
              <div class="h-2.5 w-16 bg-gray-200 rounded animate-pulse"></div>
              <div class="h-5 sm:h-6 w-32 bg-gray-300 rounded animate-pulse mt-2"></div>
            </div>
          </template>

          <template v-else>
            <div class="w-1/2 px-2 py-4 sm:py-5">
              <p class="font-giest text-gray-400 text-xs sm:text-sm">ROLE</p>
              <h5 class="font-giest text-gray-800 text-base sm:text-xl mt-2">
                {{ pageData.contribution.role }}
              </h5>
            </div>
            <div class="w-1/2 px-2 py-4 sm:py-5">
              <p class="font-giest text-gray-400 text-xs sm:text-sm">CLIENT</p>
              <h5 class="font-giest text-gray-800 text-base sm:text-xl mt-2">
                {{ pageData.contribution.client }}
              </h5>
            </div>
            <div class="w-1/2 px-2 py-4 sm:py-5">
              <p class="font-giest text-gray-400 text-xs sm:text-sm">YEAR</p>
              <h5 class="font-giest text-gray-800 text-base sm:text-xl mt-2">
                {{ pageData.contribution.year }}
              </h5>
            </div>
            <div class="w-1/2 px-2 py-4 sm:py-5">
              <p class="font-giest text-gray-400 text-xs sm:text-sm">
                DISCIPLINE
              </p>
              <h5 class="font-giest text-gray-800 text-base sm:text-xl mt-2">
                {{ pageData.contribution.discipline }}
              </h5>
            </div>
          </template>

          <!-- Scope -->
          <div class="w-full px-2 py-4 sm:py-5">
            <p class="font-giest text-gray-400 text-xs sm:text-sm mb-2">
              SCOPE
            </p>

            <template v-if="isLoading">
              <span
                v-for="n in 4"
                :key="n"
                class="inline-block h-8 sm:h-9 w-20 sm:w-24 m-1 rounded-full bg-gray-200 animate-pulse"
              ></span>
            </template>

            <template v-else>
              <span
                v-for="(item, index) in pageData.contribution.scope"
                :key="index"
                class="p-1.5 sm:p-2 text-xs sm:text-sm px-3 sm:px-4 m-1 border border-gray-300 text-gray-700 rounded-full inline-block"
                >{{ item }}</span
              >
            </template>
          </div>
        </div>

        <!-- Numbers -->
        <div
          class="border-t border-gray-300 p-2 py-5 flex flex-wrap justify-between gap-4"
        >
          <template v-if="isLoading">
            <div v-for="n in 3" :key="n">
              <div class="h-6 sm:h-7 w-14 bg-gray-300 rounded animate-pulse"></div>
              <div class="h-2.5 w-20 bg-gray-200 rounded animate-pulse mt-2"></div>
            </div>
          </template>

          <template v-else>
            <div v-for="(stat, index) in pageData.numbers" :key="index">
              <h4 class="font-bricolage font-bold text-xl sm:text-2xl text-left">
                {{ stat.value }}
              </h4>
              <p class="text-xs sm:text-sm text-gray-400 mt-1 text-left">
                {{ stat.label }}
              </p>
            </div>
          </template>
        </div>
      </div>
    </div>
  </section>

  <!-- Visual Identity -->
  <section class="py-20 sm:py-28 lg:py-40 px-5 bg-[radial-gradient(#132132,#000000)]">
    <div class="relative max-w-[1300px] mx-auto w-full">
      <h5 v-reveal class="text-center text-xs sm:text-sm text-sky-300 tracking-wide">
        CHAPTER 02
      </h5>
      <h2
        v-reveal
        class="text-white text-3xl sm:text-4xl lg:text-5xl my-4 sm:my-5 font-bold text-center"
      >
        The Visual Identity
      </h2>
      <div class="flex flex-col lg:flex-row">
        <!-- Colors -->
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

          <template v-if="isLoading">
            <div class="h-6 sm:h-8 w-3/4 bg-white/10 rounded animate-pulse my-4 sm:my-5 mb-6 sm:mb-10"></div>
          </template>
          <h4
            v-else
            class="text-white text-xl sm:text-2xl lg:text-3xl font-bold my-4 sm:my-5 mb-6 sm:mb-10"
          >
            {{ pageData.visual_identity.colors_title }}
          </h4>

          <div class="grid grid-cols-2 gap-2 sm:gap-3">
            <template v-if="isLoading">
              <div
                v-for="n in 4"
                :key="n"
                class="py-8 sm:py-10 lg:py-13 rounded-3xl sm:rounded-4xl px-3 bg-white/10 animate-pulse"
              ></div>
            </template>

            <template v-else>
              <div
                v-for="(color, index) in pageData.visual_identity.colors_list"
                :key="index"
                :style="{ backgroundColor: color.hex }"
                class="py-8 sm:py-10 lg:py-13 rounded-3xl sm:rounded-4xl px-3 text-center text-black/90"
              >
                <h5 class="text-sm sm:text-lg font-bold mb-1 sm:mb-2">
                  {{ color.name }}
                </h5>
                <p class="text-xs sm:text-base">{{ color.hex }}</p>
              </div>
            </template>
          </div>
        </div>

        <!-- Fonts -->
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

          <template v-if="isLoading">
            <div class="h-6 sm:h-8 w-3/4 bg-white/10 rounded animate-pulse my-4 sm:my-5 mb-6 sm:mb-10"></div>
          </template>
          <h4
            v-else
            class="text-white text-xl sm:text-2xl lg:text-3xl font-bold my-4 sm:my-5 mb-6 sm:mb-10"
          >
            {{ pageData.visual_identity.fonts_title }}
          </h4>

          <template v-if="isLoading">
            <div v-for="n in 2" :key="n" class="py-3 sm:py-4">
              <div class="h-2.5 w-16 bg-white/10 rounded animate-pulse mb-2"></div>
              <div class="h-6 sm:h-7 w-40 bg-white/20 rounded animate-pulse my-2"></div>
            </div>
          </template>

          <template v-else>
            <div
              v-for="(font, index) in pageData.visual_identity.fonts_list"
              :key="index"
              class="py-3 sm:py-4"
            >
              <p class="text-sky-300 mb-2 text-xs sm:text-sm">{{ font.label }}</p>
              <h4 class="text-lg sm:text-2xl text-white my-2 font-semibold">
                {{ font.name }}
              </h4>
            </div>
          </template>
        </div>
      </div>
    </div>
  </section>

  <!-- Solutions Vid -->
  <section class="py-20 sm:py-28 lg:py-40 px-5 bg-[radial-gradient(#BBE6F6,#FFFFFF)]">
    <div class="relative max-w-[1300px] mx-auto w-full">
      <h5 v-reveal class="text-center text-xs sm:text-sm text-sky-500 tracking-wide">
        CHAPTER 03
      </h5>
      <h2
        v-reveal
        class="text-gray-800 text-3xl sm:text-4xl lg:text-5xl my-6 sm:my-10 font-semibold text-center"
      >
        Solutions Overview
      </h2>

      <template v-if="isLoading">
        <div class="max-w-2xl mx-auto mb-8 sm:mb-10 space-y-2 px-2">
          <div class="h-3 sm:h-4 w-full bg-gray-200 rounded animate-pulse"></div>
          <div class="h-3 sm:h-4 w-5/6 mx-auto bg-gray-200 rounded animate-pulse"></div>
        </div>
      </template>
      <p
        v-else
        v-reveal
        class="max-w-2xl mb-8 sm:mb-10 text-sm sm:text-base text-center mx-auto text-black/70 leading-relaxed px-2"
      >
        {{ pageData.solutions_overview.description }}
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
        <!-- Skeleton slides -->
        <template v-if="isLoading">
          <div v-for="n in 5" :key="n" class="case-study-slide">
            <div
              class="relative aspect-[16/9] h-auto overflow-hidden rounded-2xl sm:rounded-3xl lg:rounded-[1.4vw] bg-gray-200 animate-pulse flex justify-center items-center"
            ></div>
            <div class="h-3 sm:h-4 w-4/5 mx-auto bg-gray-200 rounded animate-pulse my-4 sm:my-5"></div>
          </div>
        </template>

        <!-- Real slides -->
        <template v-else>
          <div
            v-for="(slide, i) in pageData.solutions_overview.slides"
            :key="i"
            :ref="setSlideElement"
            class="case-study-slide"
          >
            <div
              class="relative group aspect-[16/9] h-auto overflow-hidden gradient rounded-2xl sm:rounded-3xl lg:rounded-[1.4vw] flex justify-center items-center snap-center"
            >
              <!-- Phone mockup -->
              <div
                v-if="slide.video_type === 'phone'"
                class="scale-125 sm:scale-150 -mb-[15vw] sm:-mb-[15vw] relative overflow-hidden group-hover:scale-[1.3] sm:group-hover:scale-[1.55] transition-transform duration-500 rounded-2xl sm:rounded-3xl lg:rounded-[1.4vw] h-5/6 w-auto aspect-[9/19] bg-gray-800 border-4 sm:border-[0.4vw] border-gray-800 shadow-lg group-hover:shadow-xl"
              >
                <video
                  autoplay
                  muted
                  loop
                  playsinline
                  class="absolute top-0 left-0 w-full h-full object-cover"
                >
                  <source :src="slide.video_url" type="video/mp4" />
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
                  <source :src="slide.video_url" type="video/mp4" />
                </video>
              </div>
            </div>
            <p class="text-center my-4 sm:my-5 text-sm sm:text-base text-black/70 px-2">
              {{ slide.description }}
            </p>
          </div>
        </template>
      </div>
    </div>

    <div class="slider-buttons flex justify-center gap-3 sm:gap-5 mt-5">
      <button
        type="button"
        aria-label="Previous solution highlight"
        :disabled="isLoading || activeSlide === 0"
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
        :disabled="isLoading || activeSlide === 4"
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
</template>

<style scoped>
.case-study-slider {
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
}

.story-word-color-reveal {
  --word-color-progress: 0%;
  color: transparent;
  background: linear-gradient(
    to right,
    #111827 0 var(--word-color-progress),
    #d1d5db var(--word-color-progress) 100%
  );
  background-clip: text;
  -webkit-background-clip: text;
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