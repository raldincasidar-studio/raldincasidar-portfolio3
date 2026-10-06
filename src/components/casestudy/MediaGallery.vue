<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import PostMedia from './PostMedia.vue'

/**
 * MediaGallery — renders post-content visuals.
 *
 *  • one item  → a full-width figure (solo image/video)
 *  • many items → the captioned row used by the case-study mockup gallery:
 *                 scroll-snap, an highlighted active tile, a counter and
 *                 previous/next controls. 2 tiles on mobile, 3 on tablet,
 *                 4 on desktop, then it scrolls horizontally.
 */
const props = defineProps({
  items: { type: Array, default: () => [] },
  label: { type: String, default: 'Visual gallery' },
})

const galleryItems = computed(() => (props.items || []).filter((item) => item?.url))
const isSolo = computed(() => galleryItems.value.length === 1)
const activeIndex = ref(0)
const trackElement = ref(null)
const itemElements = ref([])

function setItemElement(instance, index) {
  // Component refs expose the instance; keep the rendered DOM node instead.
  const node = instance && instance.$el ? instance.$el : instance
  if (node) itemElements.value[index] = node
}

function visibleItems() {
  return itemElements.value.filter((node) => node && node.isConnected)
}

function updateActive() {
  const track = trackElement.value
  const nodes = visibleItems()
  if (!track || nodes.length < 2) {
    activeIndex.value = 0
    return
  }
  // The tile nearest the left edge of the scroller is the "current" one.
  let best = 0
  let bestDistance = Infinity
  nodes.forEach((node, index) => {
    const distance = Math.abs(node.offsetLeft - track.scrollLeft)
    if (distance < bestDistance) {
      bestDistance = distance
      best = index
    }
  })
  activeIndex.value = best
}

function goTo(index) {
  const nodes = visibleItems()
  const next = Math.max(0, Math.min(index, nodes.length - 1))
  nodes[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
  activeIndex.value = next
}

function reset() {
  itemElements.value = []
  activeIndex.value = 0
  nextTick(updateActive)
}

onMounted(() => {
  window.addEventListener('resize', updateActive)
  nextTick(updateActive)
})
onBeforeUnmount(() => window.removeEventListener('resize', updateActive))
watch(galleryItems, reset)
</script>

<template>
  <template v-if="galleryItems.length">
    <!-- One visual → full-width figure -->
    <PostMedia v-if="isSolo" class="post-bleed" :item="galleryItems[0]" variant="solo" />

    <!-- Many visuals → captioned, scroll-snapping row -->
    <div v-else class="post-bleed">
      <div
        ref="trackElement"
        class="post-gallery"
        role="group"
        :aria-label="label"
        tabindex="0"
        @scroll.passive="updateActive"
      >
        <div class="post-gallery-track">
          <PostMedia
            v-for="(item, index) in galleryItems"
            :key="index"
            :ref="(instance) => setItemElement(instance, index)"
            :item="item"
            variant="tile"
            :active="index === activeIndex"
          />
        </div>
      </div>

      <div class="post-gallery-controls">
        <span class="post-gallery-count" aria-live="polite">{{ activeIndex + 1 }} / {{ galleryItems.length }}</span>
        <div class="post-gallery-buttons">
          <button
            type="button"
            class="post-gallery-button"
            :disabled="activeIndex === 0"
            aria-label="Previous visual"
            @click="goTo(activeIndex - 1)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            type="button"
            class="post-gallery-button"
            :disabled="activeIndex >= galleryItems.length - 1"
            aria-label="Next visual"
            @click="goTo(activeIndex + 1)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </template>
</template>
