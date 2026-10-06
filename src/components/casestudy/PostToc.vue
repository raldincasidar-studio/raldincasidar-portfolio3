<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { buildPostHeadings } from '@/utils/postBlocks.js'
import { anchorScrollTop, computeScrollSpy } from '@/utils/scrollSpy.js'

/**
 * PostToc — "on this page" navigation for the long-form chapter.
 *
 *  · ≥1280px → a sticky rail that lives in the left gutter beside the post,
 *              tracking the heading you are reading and the reading progress.
 *  · <1280px → a sticky bar under the navbar showing the current section,
 *              which expands into a scrollable sheet of every heading.
 *
 * Anchors come from `buildPostHeadings`, the same function `PostContent` uses
 * to id each heading, so links and targets can never drift apart.
 */
const props = defineProps({
  post: { type: Object, default: () => ({}) },
  /** The element wrapping the post — the reading-progress track. */
  spyTarget: { type: Object, default: null },
  /** Small label above the title, e.g. the client name. */
  kicker: { type: String, default: '' },
  /** Bold title, e.g. the case study name. */
  title: { type: String, default: '' },
})

// `window`/`document` are absent during SSR (and in the render tests), so every
// measurement is behind this guard.
const canUseDom = typeof window !== 'undefined' && typeof document !== 'undefined'

const headings = computed(() => buildPostHeadings(props.post))
const activeId = ref('')
const progress = ref(0)
const open = ref(false)
const barElement = ref(null)
const panelElement = ref(null)

/* Until the first measurement lands — and on the server — the opening section
   is the current one, so the rail never renders with nothing selected. */
const currentId = computed(() => activeId.value || headings.value[0]?.id || '')
const activeHeading = computed(() => headings.value.find((heading) => heading.id === currentId.value) || null)
// A single heading is not a table of contents, it is a stray label.
const hasToc = computed(() => headings.value.length >= 2)

/* ── Sticky geometry ─────────────────────────────────────────────────────
   The anchor target must clear the fixed navbar and, on small screens, the
   sticky bar below it. Both are measured from their own `top` + height so the
   value stays correct no matter where the page is scrolled. */
const stickyBottom = ref(0)

function measureStickyBottom() {
  if (!canUseDom) return
  const parts = []
  const navbar = document.querySelector('[data-site-navbar]')
  if (navbar) parts.push(offsetBottom(navbar))
  if (barElement.value && window.innerWidth < 1280) parts.push(offsetBottom(barElement.value))
  stickyBottom.value = parts.length ? Math.max(...parts) : 0
}

function offsetBottom(element) {
  const style = getComputedStyle(element)
  // `top` is ignored on a static element, in which case its box already sits
  // where it belongs and the rect is the honest answer.
  const top = style.position === 'static' ? element.getBoundingClientRect().top : parseFloat(style.top) || 0
  return top + element.offsetHeight
}

const anchorOffset = computed(() => stickyBottom.value + 18)

/* ── Scroll spy ──────────────────────────────────────────────────────── */
let frame = 0
let lockUntil = 0

function headingTops() {
  return headings.value.map((heading) => {
    const element = document.getElementById(heading.id)
    return element ? element.getBoundingClientRect().top + window.scrollY : Number.NaN
  })
}

function measure() {
  frame = 0
  const target = props.spyTarget
  if (!canUseDom || !target || !headings.value.length) return
  const box = target.getBoundingClientRect()
  const state = computeScrollSpy({
    headings: headings.value,
    headingTops: headingTops(),
    containerTop: box.top + window.scrollY,
    containerHeight: box.height,
    scrollY: window.scrollY,
    innerHeight: window.innerHeight,
    offset: anchorOffset.value,
  })
  // While a click-initiated scroll is animating, keep the item the reader
  // picked highlighted instead of flickering through the headings in between.
  if (Date.now() > lockUntil) activeId.value = state.activeId
  progress.value = state.progress
}

function schedule() {
  if (!canUseDom || frame) return
  frame = requestAnimationFrame(measure)
}

/* ── Navigation ──────────────────────────────────────────────────────── */
function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function go(id) {
  const element = document.getElementById(id)
  if (!element) return
  open.value = false
  activeId.value = id
  lockUntil = Date.now() + 800
  const limit = document.documentElement.scrollHeight - window.innerHeight
  const top = anchorScrollTop(element.getBoundingClientRect().top + window.scrollY, anchorOffset.value, limit)
  window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  // Keep the address bar shareable without handing the router a navigation it
  // would have to re-run the page for.
  try {
    history.replaceState(null, '', `#${id}`)
  } catch {
    /* history is unavailable in some embedded contexts — scrolling still works */
  }
}

function backToTop() {
  const target = props.spyTarget
  if (!target) return
  const top = anchorScrollTop(target.getBoundingClientRect().top + window.scrollY, anchorOffset.value, document.documentElement.scrollHeight)
  window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

/* ── Deep links: /case-study/x#post-a-heading ────────────────────────── */
let deepLinkDone = false

function followHash() {
  if (!canUseDom || deepLinkDone) return
  const hash = decodeURIComponent((window.location.hash || '').replace(/^#/, ''))
  if (!hash || !headings.value.some((heading) => heading.id === hash)) return
  deepLinkDone = true
  const element = document.getElementById(hash)
  if (!element) return
  // Let fonts and any media above the heading settle before measuring.
  window.setTimeout(() => {
    const limit = document.documentElement.scrollHeight - window.innerHeight
    const top = anchorScrollTop(element.getBoundingClientRect().top + window.scrollY, anchorOffset.value, limit)
    window.scrollTo({ top, behavior: 'auto' })
    activeId.value = hash
    measure()
  }, 80)
}

watch([headings, () => props.spyTarget], () => nextTick(() => {
  measureStickyBottom()
  followHash()
  schedule()
}), { immediate: true })

watch(open, (isOpen) => {
  if (!isOpen) return
  // Bring the current section into view inside a long sheet.
  nextTick(() => {
    panelElement.value?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' })
  })
})

function onKeydown(event) {
  if (event.key === 'Escape' && open.value) open.value = false
}

function onResize() {
  measureStickyBottom()
  schedule()
}

onMounted(() => {
  if (!canUseDom) return
  measureStickyBottom()
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', onResize)
  window.addEventListener('hashchange', followHash)
  window.addEventListener('keydown', onKeydown)
  schedule()
})

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame)
  if (!canUseDom) return
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('hashchange', followHash)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <nav v-if="hasToc" class="post-toc" aria-label="On this page">
    <!-- ── Desktop: sticky rail in the gutter beside the post ── -->
    <div class="post-toc-rail">
      <div class="post-toc-rail-inner">
        <div class="post-toc-head">
          <div class="post-toc-headings">
            <p v-if="kicker" class="post-toc-kicker">{{ kicker }}</p>
            <p class="post-toc-title">{{ title || 'The Story' }}</p>
          </div>
          <button type="button" class="post-toc-top" aria-label="Back to the top of the story" @click="backToTop">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor" class="size-4" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 19.5v-15m0 0-6.75 6.75M12 4.5l6.75 6.75" />
            </svg>
          </button>
        </div>

        <p class="post-toc-label">In this story</p>

        <ul class="post-toc-list">
          <li v-for="heading in headings" :key="heading.id">
            <a
              :href="`#${heading.id}`"
              class="post-toc-link"
              :class="[`post-toc-link-${heading.level}`, { 'is-active': heading.id === currentId }]"
              :aria-current="heading.id === currentId ? 'location' : undefined"
              @click.prevent="go(heading.id)"
            >{{ heading.text }}</a>
          </li>
        </ul>

        <div class="post-toc-progress" role="presentation">
          <span class="post-toc-progress-bar" :style="{ transform: `scaleX(${progress})` }" />
        </div>
        <p class="post-toc-progress-text">{{ Math.round(progress * 100) }}% read</p>
      </div>
    </div>

    <!-- ── Compact: sticky bar that expands into a sheet ── -->
    <div ref="barElement" class="post-toc-compact" :class="{ 'is-open': open }">
      <span v-if="open" class="post-toc-scrim" aria-hidden="true" @click="open = false" />

      <button
        type="button"
        class="post-toc-compact-bar"
        aria-controls="post-toc-panel"
        :aria-expanded="open"
        @click="open = !open"
      >
        <span class="post-toc-compact-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" class="size-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h10.5" />
          </svg>
        </span>
        <span class="post-toc-compact-text">
          <span class="post-toc-compact-label">On this page</span>
          <span class="post-toc-compact-current">{{ activeHeading ? activeHeading.text : 'The Story' }}</span>
        </span>
        <span class="post-toc-compact-count">{{ headings.length }}</span>
        <span class="post-toc-compact-chevron" :class="{ 'is-open': open }" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" class="size-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
      </button>

      <div v-show="open" id="post-toc-panel" ref="panelElement" class="post-toc-panel">
        <ul class="post-toc-list">
          <li v-for="heading in headings" :key="heading.id">
            <a
              :href="`#${heading.id}`"
              class="post-toc-link"
              :class="[`post-toc-link-${heading.level}`, { 'is-active': heading.id === currentId }]"
              :aria-current="heading.id === currentId ? 'location' : undefined"
              @click.prevent="go(heading.id)"
            >{{ heading.text }}</a>
          </li>
        </ul>
      </div>

      <span class="post-toc-compact-progress" aria-hidden="true">
        <span class="post-toc-progress-bar" :style="{ transform: `scaleX(${progress})` }" />
      </span>
    </div>
  </nav>
</template>
