<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * Preloader — the animated "wave fill" splash screen.
 * Tracks <img> / <video> loads and `document.fonts.ready`, then slides
 * up and away. Includes safety nets so a slow/stalled asset can never
 * keep the loader stuck on screen.
 */
const percent = ref(0)
const waveHeight = ref('0%')
const pop = ref(false) // logo "pop" right before exit
const exit = ref(false) // slide-up transition
const hidden = ref(false)

let timers = []
let dataReady = true
let dataReadyHandler

function clearTimers() {
  timers.forEach((t) => clearTimeout(t))
  timers = []
}

onMounted(() => {
  dataReady = window.location.pathname !== '/'
  if (!dataReady) {
    dataReadyHandler = () => {
      dataReady = true
    }
    window.addEventListener('preloader:data-ready', dataReadyHandler, { once: true })
  }

  // Give the routed view a tick to mount before scanning for assets.
  timers.push(
    setTimeout(() => {
      const images = Array.from(document.querySelectorAll('img'))
      const videos = Array.from(document.querySelectorAll('video'))
      const assetPromises = []

      // Track <img> loads
      images.forEach((img) => {
        assetPromises.push(
          new Promise((resolve) => {
            if (img.complete && img.naturalWidth !== 0) return resolve()
            img.addEventListener('load', resolve, { once: true })
            img.addEventListener('error', resolve, { once: true })
          })
        )
      })

      // Track <video> loads (with a safety timeout in case autoplay/network stalls)
      videos.forEach((video) => {
        assetPromises.push(
          new Promise((resolve) => {
            if (video.readyState >= 3) return resolve()
            const done = () => resolve()
            video.addEventListener('canplaythrough', done, { once: true })
            video.addEventListener('loadeddata', done, { once: true })
            video.addEventListener('error', done, { once: true })
            setTimeout(done, 8000)
          })
        )
      })

      // Track web fonts
      if (document.fonts && document.fonts.ready) {
        assetPromises.push(document.fonts.ready.catch(() => {}))
      }

      const total = assetPromises.length || 1
      let loadedCount = 0

      function renderProgress() {
        const p = Math.min(100, Math.round((loadedCount / total) * 100))
        waveHeight.value = `${p}%`
        percent.value = p
      }

      assetPromises.forEach((p) => {
        p.then(() => {
          loadedCount++
          renderProgress()
        }).catch(() => {
          loadedCount++
          renderProgress()
        })
      })

      // Hard safety net: never keep the preloader up longer than 12s
      const hardTimeout = new Promise((resolve) => setTimeout(resolve, 12000))

      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        waveHeight.value = '100%'
        percent.value = 100

        // Small pause at 100% → pop the logo → slide the preloader away.
        timers.push(
          setTimeout(() => {
            pop.value = true
            timers.push(
              setTimeout(() => {
                exit.value = true
                document.documentElement.classList.remove('preloader-lock')
                window.dispatchEvent(new Event('preloader:done'))
                timers.push(setTimeout(() => (hidden.value = true), 950))
              }, 450)
            )
          }, 300)
        )
      }

      const dataPromise = new Promise((resolve) => {
        if (dataReady) return resolve()
        window.addEventListener('preloader:data-ready', resolve, { once: true })
      })

      Promise.race([Promise.all([Promise.all(assetPromises), dataPromise]), hardTimeout]).then(finish)
    }, 50)
  )
})

onBeforeUnmount(() => {
  if (dataReadyHandler) {
    window.removeEventListener('preloader:data-ready', dataReadyHandler)
  }
  clearTimers()
})
</script>

<template>
  <div
    v-if="!hidden"
    id="preloader"
    :class="{ 'preloader-loaded': pop, 'preloader-exit': exit }"
  >
    <div class="preloader-logo-wrap">
      <!-- Faint outline copy of the navbar logo -->
      <div class="preloader-logo-outline logo-mask"></div>

      <!-- Wave-filled copy of the logo, revealed via mask -->
      <div class="preloader-logo-clip logo-mask">
        <div id="wave-level" :style="{ height: waveHeight }">
          <div class="wave-layer wave-back"></div>
          <div class="wave-layer wave-front"></div>
          <div class="wave-fill-solid"></div>
        </div>
      </div>
    </div>

    <div class="mt-6 sm:mt-8 flex flex-col items-center gap-2">
      <span
        id="preloader-percent"
        class="text-white font-bold text-xl sm:text-2xl tracking-wider"
      >
        {{ percent }}%
      </span>
      <span class="text-white/70 text-[10px] sm:text-xs uppercase tracking-[0.3rem]">
        Loading Experience
      </span>
    </div>
  </div>
</template>
