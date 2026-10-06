<script setup>
import { computed, ref, watch } from 'vue'
import { renderInline } from '@/utils/richText.js'

/**
 * PostMedia — one captioned visual inside post content.
 *
 * Renders an image or a muted looping video, an optional caption (inline
 * Markdown allowed) and an optional outbound link. A failed asset degrades to
 * a labelled placeholder instead of a broken frame.
 */
const props = defineProps({
  item: { type: Object, required: true },
  /** Highlighted state used by the gallery row. */
  active: { type: Boolean, default: false },
  /** 'tile' → gallery square · 'solo' → full-width figure. */
  variant: { type: String, default: 'tile' },
  /** Rendered in the placeholder when the asset cannot load. */
  fallbackLabel: { type: String, default: '' },
  /**
   * Makes the frame a button that asks for a full-screen preview. An item with
   * its own `href` stays an outbound link instead — the author asked for the
   * link, so the link wins.
   */
  interactive: { type: Boolean, default: false },
})

const emit = defineEmits(['open'])

const failed = ref(false)
const videoElement = ref(null)
const isVideo = computed(() => props.item?.mediaType === 'video')
// A solo visual always plays; gallery tiles only play while they are the
// active one, which keeps a media-heavy story light on mobile data.
const shouldPlay = computed(() => props.variant === 'solo' || props.active)

watch(shouldPlay, (play) => {
  const element = videoElement.value
  if (!element) return
  if (play) element.play?.().catch(() => {})
  else element.pause?.()
})
const href = computed(() => (/^https?:\/\//i.test(props.item?.href || '') ? props.item.href : ''))
const caption = computed(() => renderInline(props.item?.caption))
const host = computed(() => {
  try {
    return new URL(props.item?.url || '').hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
})
const alt = computed(() => props.item?.alt || props.item?.caption || 'Case study visual')

// <a> when the author linked the visual, <button> when it opens the lightbox,
// plain <div> when it is a static preview (admin surfaces).
const frameTag = computed(() => (href.value ? 'a' : props.interactive ? 'button' : 'div'))
const isPreviewButton = computed(() => !href.value && props.interactive)
const frameAttrs = computed(() => {
  if (href.value) return { href: href.value, target: '_blank', rel: 'noopener noreferrer' }
  if (isPreviewButton.value) return { type: 'button', 'aria-label': `Preview ${isVideo.value ? 'video' : 'image'}: ${alt.value}` }
  return {}
})
</script>

<template>
  <figure class="post-media" :class="[variant === 'solo' ? 'post-media-solo' : 'post-gallery-item', active ? 'is-active' : '']">
    <component
      :is="frameTag"
      class="post-media-frame"
      :class="{ 'is-interactive': isPreviewButton }"
      v-bind="frameAttrs"
      @click="isPreviewButton ? emit('open') : undefined"
    >
      <video
        v-if="isVideo && !failed"
        ref="videoElement"
        :autoplay="shouldPlay"
        muted
        loop
        playsinline
        preload="metadata"
        :aria-label="alt"
        @error="failed = true"
      >
        <source :src="item.url" />
      </video>

      <img
        v-else-if="!failed"
        :src="item.url"
        :alt="alt"
        loading="lazy"
        decoding="async"
        @error="failed = true"
      />

      <div v-else class="post-media-fallback">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
        <span>{{ fallbackLabel || host || 'Media unavailable' }}</span>
      </div>

      <span v-if="isVideo && !failed" class="post-media-badge">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-2.5" aria-hidden="true">
          <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
        </svg>
        Video
      </span>

      <span v-if="isPreviewButton && !failed" class="post-media-zoom" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="size-3.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
        </svg>
      </span>
    </component>

    <figcaption v-if="caption" class="post-media-caption" v-html="caption" />
  </figure>
</template>
