<script setup>
import { computed, ref, watch } from 'vue'
import { createMediaItem } from '@/utils/postBlocks.js'

/**
 * AdminMediaItem — editor row for one image or video inside post content.
 * Mutates the passed `item` object directly and reports structural actions.
 */
const props = defineProps({
  item: { type: Object, required: true },
  index: { type: Number, default: 0 },
  removable: { type: Boolean, default: true },
  movers: { type: Boolean, default: false },
  first: { type: Boolean, default: false },
  last: { type: Boolean, default: false },
  /** 'tile' → compact row used inside a gallery list. */
  variant: { type: String, default: 'solo' },
})
defineEmits(['remove', 'move'])

const failed = ref(false)
const isVideo = computed(() => props.item.mediaType === 'video')

function setType(type) {
  props.item.mediaType = type
  failed.value = false
}

watch(() => props.item.url, () => { failed.value = false })

function reset() {
  Object.assign(props.item, createMediaItem())
}
</script>

<template>
  <div class="admin-media-item" :class="variant === 'tile' ? 'admin-media-item-tile' : ''">
    <!-- Live preview -->
    <div class="admin-media-preview">
      <video v-if="isVideo && item.url && !failed" :src="item.url" muted playsinline preload="metadata" @error="failed = true" />
      <img v-else-if="item.url && !failed" :src="item.url" alt="" loading="lazy" @error="failed = true" />
      <div v-else class="admin-media-preview-empty">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z" />
        </svg>
        <span>{{ item.url ? 'Cannot load' : 'No media' }}</span>
      </div>
      <span v-if="isVideo && item.url" class="admin-media-flag">video</span>
    </div>

    <!-- Fields -->
    <div class="admin-media-fields">
      <div class="flex flex-wrap items-center gap-2">
        <div class="admin-segmented" role="group" aria-label="Media type">
          <button type="button" :class="!isVideo ? 'is-on' : ''" @click="setType('image')">Image</button>
          <button type="button" :class="isVideo ? 'is-on' : ''" @click="setType('video')">Video</button>
        </div>
        <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Item {{ index + 1 }}</span>
        <div class="ml-auto flex items-center gap-1">
          <template v-if="movers">
            <button type="button" class="admin-icon-button" :disabled="first" aria-label="Move item up" @click="$emit('move', -1)">↑</button>
            <button type="button" class="admin-icon-button" :disabled="last" aria-label="Move item down" @click="$emit('move', 1)">↓</button>
          </template>
          <button v-if="removable" type="button" class="admin-icon-button admin-icon-button-danger" aria-label="Remove item" @click="$emit('remove')">×</button>
        </div>
      </div>

      <label class="admin-label mt-3">
        {{ isVideo ? 'Video URL' : 'Image URL' }}
        <input v-model="item.url" type="url" class="admin-input mt-1.5" :placeholder="isVideo ? 'https://cdn.example.com/clip.mp4' : 'https://cdn.example.com/shot.jpg'" />
      </label>

      <label class="admin-label mt-3">
        Caption
        <input v-model="item.caption" type="text" class="admin-input mt-1.5" placeholder="What the reader should notice" />
      </label>

      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <label class="admin-label">
          Alt text <span class="font-normal text-gray-400">(accessibility)</span>
          <input v-model="item.alt" type="text" class="admin-input mt-1.5" placeholder="Describe the visual" />
        </label>
        <label class="admin-label">
          Link to <span class="font-normal text-gray-400">(optional)</span>
          <input v-model="item.href" type="url" class="admin-input mt-1.5" placeholder="https://…" />
        </label>
      </div>

      <button type="button" class="mt-3 text-xs text-gray-400 hover:text-[#17A6E3]" @click="reset">Clear this media</button>
    </div>
  </div>
</template>
