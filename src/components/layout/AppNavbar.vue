<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  /**
   * When `true` the navbar renders with its solid "pill" background
   * immediately (useful on pages without a dark hero behind it).
   * Passed in from DefaultLayout based on the route's `meta.navbarSolid`.
   */
  solid: { type: Boolean, default: false },
})

const route = useRoute()
const router = useRouter()

const scrolled = ref(false)
const menuOpen = ref(false)

/** Solid "pill" style applied after scrolling (or when `solid` prop is set). */
const navbarClasses = computed(() => {
  if (props.solid || scrolled.value) {
    return [
      'bg-cyan-500/50',
      'backdrop-blur-md',
      'top-2',
      'sm:top-3',
      'left-2',
      'right-2',
      'sm:left-4',
      'sm:right-4',
      'lg:left-[20%]',
      'lg:right-[20%]',
      'rounded-full',
      'border',
      'border-white/30',
    ]
  }
  return ['bg-transparent', 'border-transparent']
})

const links = [
  { label: 'Work', id: 'works' },
  { label: 'Lab', id: 'labs' },
  { label: 'About', id: 'about' },
]

function onScroll() {
  scrolled.value = window.scrollY > 50
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
  document.body.classList.toggle('menu-open', menuOpen.value)
}

function closeMenu() {
  if (!menuOpen.value) return
  menuOpen.value = false
  document.body.classList.remove('menu-open')
}

/**
 * Smooth-scroll to a section id. If we're not on the home page yet,
 * navigate home first, wait for the view to mount, then scroll.
 */
async function goTo(id) {
  closeMenu()
  if (route.path !== '/') {
    await router.push('/')
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

function onResize() {
  if (window.innerWidth >= 1024) closeMenu()
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
  onScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
  document.body.classList.remove('menu-open')
})
</script>

<template>
  <nav
    id="navbar"
    class="fixed top-0 left-0 right-0 z-50 py-3 sm:py-4 px-4 sm:px-6 lg:px-8 transition-all duration-300"
    :class="navbarClasses"
  >
    <div class="max-w-[1500px] mx-auto flex justify-between items-center">
      <!-- Logo -->
      <router-link
        to="/"
        class="text-white text-base font-normal sm:text-lg font-semibold flex items-center"
      >
        <img
          src="/assets/img/logo-white.svg"
          alt="Raldin Casidar Logo"
          class="h-8 sm:h-10 inline-block mr-2"
        />
        Raldin.
      </router-link>

      <!-- Desktop nav links (lg and up) -->
      <ul class="hidden lg:flex gap-1 text-base xl:text-lg font-medium">
        <li v-for="link in links" :key="link.id">
          <button
            type="button"
            class="text-white/80 inline-block px-4 py-2 font-semibold rounded-full hover:text-white transition-colors duration-200"
            @click="goTo(link.id)"
          >
            {{ link.label }}
          </button>
        </li>
      </ul>

      <!-- Say Hi button (desktop) -->
      <a
        href="mailto:hello@raldincasidar.studio"
        class="hidden lg:inline-block border-2 border-white/40 px-4 py-2 rounded-full text-white hover:scale-105 transition-transform bg-white/10 font-semibold text-base xl:text-lg"
      >
        Say Hi!👋
      </a>

      <!-- Hamburger button (mobile & tablet) -->
      <button
        id="hamburger-btn"
        type="button"
        aria-label="Toggle menu"
        class="lg:hidden relative w-9 h-9 sm:w-10 sm:h-10 flex flex-col justify-center items-center gap-[6px] z-[60]"
        :class="{ open: menuOpen }"
        @click="toggleMenu"
      >
        <span class="bar bar-top block w-6 sm:w-7 h-0.5 bg-white rounded-full"></span>
        <span class="bar bar-mid block w-6 sm:w-7 h-0.5 bg-white rounded-full"></span>
        <span class="bar bar-bottom block w-6 sm:w-7 h-0.5 bg-white rounded-full"></span>
      </button>
    </div>
  </nav>

  <!-- Overlay -->
  <div
    class="fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 lg:hidden"
    :class="menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    @click="closeMenu"
  ></div>

  <!-- Sliding mobile / tablet menu -->
  <div
    class="fixed top-0 right-0 h-full w-[80%] max-w-sm bg-gray-950 z-50 transition-transform duration-500 ease-in-out flex flex-col px-8 py-10 lg:hidden"
    :class="menuOpen ? 'translate-x-0' : 'translate-x-full'"
  >
    <div class="flex justify-end">
      <div class="w-9 h-9 sm:w-10 sm:h-10"></div>
    </div>

    <ul class="flex flex-col gap-2 mt-10 text-2xl font-semibold">
      <li v-for="(link, i) in links" :key="link.id">
        <button
          type="button"
          class="w-full text-left block py-3 border-b border-white/10"
          :class="i === 0 ? 'text-white' : 'text-white/80'"
          @click="goTo(link.id)"
        >
          {{ link.label }}
        </button>
      </li>
    </ul>

    <a
      href="mailto:hello@raldincasidar.studio"
      class="mt-10 text-center border-2 border-white/40 px-6 py-3 rounded-full text-white bg-white/10 font-semibold text-lg"
      @click="closeMenu"
    >
      Say Hi! 👋
    </a>

    <p class="mt-auto text-white/40 text-sm">© 2026 Raldin Casidar</p>
  </div>
</template>
