<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { renderInline } from '@/utils/richText.js'

/**
 * MediaLightbox — full-screen preview for a post visual.
 *
 * Opened by tapping any gallery tile (or a solo visual) so the reader can see
 * one image or video at full width instead of a thumbnail.
 *
 * Accessibility and mobile behaviour:
 *  · `role="dialog" aria-modal`, focus moves in on open and returns to the
 *    tile that opened it on close.
 *  · Escape closes, ← / → move between visuals, Tab is trapped inside.
 *  · Swipe left/right changes visual, swipe down dismisses (touch).
 *  · Page scroll is locked, compensating for the scrollbar so nothing jumps.
 */
const props = defineProps({
  open: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  index: { type: Number, default: 0 },
  label: { type: String, default: 'Project gallery' },
})

const emit = defineEmits(['update:open', 'update:index'])

const dialogElement = ref(null)
const current = computed(() => props.items[props.index] || null)
const count = computed(() => props.items.length)
const isVideo = computed(() => current.value?.mediaType === 'video')
const caption = computed(() => renderInline(current.value?.caption))
const alt = computed(() => current.value?.alt || current.value?.caption || props.label)
const href = computed(() => (/^https?:\/\//i.test(current.value?.href || '') ? current.value.href : ''))
const hasMultiple = computed(() => count.value > 1)

let restoreFocus = null
let restoreStyles = null

/* ── Scroll lock ───────────────────────────────────────────────────────── */
function lockScroll() {
  const root = document.documentElement
  const body = document.body
  const gap = window.innerWidth - root.clientWidth
  restoreStyles = { rootOverflow: root.style.overflow, bodyOverflow: body.style.overflow, bodyPadding: body.style.paddingRight }
  root.style.overflow = 'hidden'
  body.style.overflow = 'hidden'
  // Keep the page from shifting when the scrollbar disappears.
  if (gap > 0) body.style.paddingRight = `${gap}px`
}

function unlockScroll() {
  if (!restoreStyles) return
  document.documentElement.style.overflow = restoreStyles.rootOverflow
  document.body.style.overflow = restoreStyles.bodyOverflow
  document.body.style.paddingRight = restoreStyles.bodyPadding
  restoreStyles = null
}

/* ── Navigation ───────────────────────────────────────────────────────── */
function close() {
  emit('update:open', false)
}

function step(delta) {
  if (!hasMultiple.value) return
  const next = (props.index + delta + count.value) % count.value
  emit('update:index', next)
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    step(-1)
    return
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    step(1)
    return
  }
  if (event.key !== 'Tab') return
  // Keep focus inside the dialog.
  const focusable = dialogElement.value?.querySelectorAll('button, a[href]')
  if (!focusable?.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

/* ── Touch gestures ────────────────────────────────────────────────────── */
let touchStart = null

function onTouchStart(event) {
  const touch = event.changedTouches[0]
  touchStart = { x: touch.clientX, y: touch.clientY }
}

function onTouchEnd(event) {
  if (!touchStart) return
  const touch = event.changedTouches[0]
  const dx = touch.clientX - touchStart.x
  const dy = touch.clientY - touchStart.y
  touchStart = null
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
    step(dx < 0 ? 1 : -1)
    return
  }
  if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close()
}

/* ── Neighbour prefetch: the next tap should feel instant ──────────────── */
function prefetch() {
  if (!props.open || !hasMultiple.value) return
  ;[1, -1].forEach((delta) => {
    const neighbour = props.items[(props.index + delta + count.value) % count.value]
    if (neighbour?.mediaType === 'video' || !neighbour?.url) return
    const image = new Image()
    image.src = neighbour.url
  })
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    restoreFocus = document.activeElement
    lockScroll()
    window.addEventListener('keydown', onKeydown)
    nextTick(() => {
      dialogElement.value?.focus()
      prefetch()
    })
    return
  }
  unlockScroll()
  window.removeEventListener('keydown', onKeydown)
  const target = restoreFocus
  restoreFocus = null
  if (target && document.contains(target)) target.focus()
})

watch(() => props.index, prefetch)

onBeforeUnmount(() => {
  unlockScroll()
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <!--
    Teleported so the dialog escapes the article's measure and stacking context.
    The open fade is a CSS animation instead of Vue's Transition component,
    which would pull ~2.7 kB gzip of extra runtime into every page's bundle.
  -->
  <Teleport to="body">
    <div
      v-if="open && current"
      ref="dialogElement"
      class="post-lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="label"
      tabindex="-1"
      @click.self="close"
    >
      <div class="post-lightbox-scrim" aria-hidden="true" @click="close" />

      <div class="post-lightbox-shell" @click.self="close">
        <header class="post-lightbox-bar">
          <span class="post-lightbox-count" aria-live="polite">
            <template v-if="hasMultiple">{{ index + 1 }} / {{ count }}</template>
          </span>
          <button type="button" class="post-lightbox-close" aria-label="Close preview" @click="close">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="size-5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div
          class="post-lightbox-stage"
          @touchstart.passive="onTouchStart"
          @touchend.passive="onTouchEnd"
        >
          <video
            v-if="isVideo"
            :key="current.url"
            class="post-lightbox-media"
            :src="current.url"
            :aria-label="alt"
            autoplay
            controls
            loop
            muted
            playsinline
          />
          <img v-else :key="current.url" class="post-lightbox-media" :src="current.url" :alt="alt" />

          <button
            v-if="hasMultiple"
            type="button"
            class="post-lightbox-nav is-prev"
            aria-label="Previous visual"
            @click="step(-1)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor" class="size-5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            v-if="hasMultiple"
            type="button"
            class="post-lightbox-nav is-next"
            aria-label="Next visual"
            @click="step(1)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor" class="size-5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        <footer v-if="caption || href || hasMultiple" class="post-lightbox-foot">
          <p v-if="caption" class="post-lightbox-caption" v-html="caption" />
          <div class="post-lightbox-actions">
            <a v-if="href" class="post-lightbox-link" :href="href" target="_blank" rel="noopener noreferrer">
              Open link
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor" class="size-3.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5M9 6H7.5A1.5 1.5 0 0 0 6 7.5v9A1.5 1.5 0 0 0 7.5 18h9a1.5 1.5 0 0 0 1.5-1.5V15" />
              </svg>
            </a>
            <div v-if="hasMultiple" class="post-lightbox-mobile-nav">
              <button type="button" aria-label="Previous visual" @click="step(-1)">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor" class="size-4" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button type="button" aria-label="Next visual" @click="step(1)">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor" class="size-4" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
