<script setup>
import { computed, ref, watch } from 'vue'
import { createMediaItem } from '@/utils/postBlocks.js'

/**
 * AdminMediaItem — one image or video inside post content.
 *
 * Reads like the published figure: the visual fills the column and the caption
 * is written right underneath it. Everything else (type, URL, alt text, link,
 * clear) lives in a small settings panel that opens from the ⚙ button, so the
 * canvas stays clean. Mutates the passed `item` directly (same contract as
 * before) and reports structural actions through `remove` / `move`.
 */
const props = defineProps({
  item: { type: Object, required: true },
  index: { type: Number, default: 0 },
  removable: { type: Boolean, default: true },
  movers: { type: Boolean, default: false },
  first: { type: Boolean, default: false },
  last: { type: Boolean, default: false },
  /** 'tile' → compact card used inside a gallery row. */
  variant: { type: String, default: 'solo' },
})
defineEmits(['remove', 'move'])

const failed = ref(false)
const panelOpen = ref(false)
const isVideo = computed(() => props.item.mediaType === 'video')
const hasMedia = computed(() => !!props.item.url && !failed.value)
const isTile = computed(() => props.variant === 'tile')

function setType(type) {
  props.item.mediaType = type
  failed.value = false
}

watch(
  () => props.item.url,
  () => {
    failed.value = false
  },
)

function replaceMedia() {
  props.item.url = ''
  failed.value = false
  panelOpen.value = false
}

function reset() {
  Object.assign(props.item, createMediaItem())
  failed.value = false
  panelOpen.value = false
}
</script>

<template>
  <div class="pm-item" :class="[isTile ? 'is-tile' : 'is-solo', { 'is-open': panelOpen }]">
    <figure class="pm-figure">
      <div class="pm-stage" :class="{ 'has-media': hasMedia }">
        <video
          v-if="isVideo && hasMedia"
          :src="item.url"
          class="pm-media"
          muted
          playsinline
          preload="metadata"
          :controls="!isTile"
          @error="failed = true"
        />
        <img v-else-if="hasMedia" :src="item.url" :alt="item.alt || ''" class="pm-media" loading="lazy" @error="failed = true" />

        <!-- Empty / broken state: paste a URL right where the visual will appear -->
        <div v-else class="pm-empty">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="pm-empty-icon" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z" />
          </svg>
          <div class="pm-segmented" role="group" aria-label="Media type">
            <button type="button" :class="!isVideo ? 'is-on' : ''" @click="setType('image')">Image</button>
            <button type="button" :class="isVideo ? 'is-on' : ''" @click="setType('video')">Video</button>
          </div>
          <input
            v-model="item.url"
            type="text"
            inputmode="url"
            class="pm-url"
            :placeholder="isVideo ? 'Paste a video URL — https://cdn.example.com/clip.mp4' : 'Paste an image URL — https://cdn.example.com/shot.jpg'"
            :aria-label="isVideo ? 'Video URL' : 'Image URL'"
            @keydown.enter.prevent
          />
          <p v-if="item.url" class="pm-error">That URL couldn’t be loaded — check the link.</p>
        </div>

        <span v-if="isVideo && hasMedia" class="pm-flag">video</span>
        <span v-if="isTile" class="pm-badge">{{ index + 1 }}</span>

        <!-- Controls appear on hover / focus / touch -->
        <div class="pm-actions">
          <template v-if="movers">
            <button type="button" class="pm-act" :disabled="first" aria-label="Move earlier" title="Move earlier" @click="$emit('move', -1)">←</button>
            <button type="button" class="pm-act" :disabled="last" aria-label="Move later" title="Move later" @click="$emit('move', 1)">→</button>
          </template>
          <button type="button" class="pm-act" :aria-expanded="panelOpen" aria-label="Media settings" title="Media settings" @click="panelOpen = !panelOpen">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="pm-act-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
          </button>
          <button v-if="hasMedia" type="button" class="pm-act" aria-label="Replace media" title="Replace" @click="replaceMedia">↻</button>
          <button v-if="removable" type="button" class="pm-act pm-act-danger" aria-label="Remove item" title="Remove" @click="$emit('remove')">×</button>
        </div>
      </div>

      <figcaption class="pm-caption-wrap">
        <input v-model="item.caption" type="text" class="pm-caption" placeholder="Write caption…" aria-label="Caption" />
      </figcaption>
    </figure>

    <!-- Settings panel -->
    <div v-if="panelOpen" class="pm-panel">
      <div class="pm-row">
        <div class="pm-segmented" role="group" aria-label="Media type">
          <button type="button" :class="!isVideo ? 'is-on' : ''" @click="setType('image')">Image</button>
          <button type="button" :class="isVideo ? 'is-on' : ''" @click="setType('video')">Video</button>
        </div>
        <button type="button" class="pm-link-danger" @click="reset">Clear this media</button>
      </div>
      <label class="pm-label">
        {{ isVideo ? 'Video URL' : 'Image URL' }}
        <input v-model="item.url" type="text" inputmode="url" class="pm-field" :placeholder="isVideo ? 'https://cdn.example.com/clip.mp4' : 'https://cdn.example.com/shot.jpg'" />
      </label>
      <div class="pm-grid">
        <label class="pm-label">
          Alt text <span class="pm-muted">(accessibility)</span>
          <input v-model="item.alt" type="text" class="pm-field" placeholder="Describe the visual" />
        </label>
        <label class="pm-label">
          Link to <span class="pm-muted">(optional)</span>
          <input v-model="item.href" type="text" inputmode="url" class="pm-field" placeholder="https://…" />
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pm-item {
  position: relative;
  min-width: 0;
}

.pm-figure {
  margin: 0;
}

.pm-stage {
  position: relative;
  overflow: hidden;
  border-radius: 0.75rem;
  background: #f3f4f6;
}

.pm-stage.has-media {
  background: #0f172a08;
}

.pm-media {
  display: block;
  width: 100%;
  max-height: 32rem;
  object-fit: contain;
  background: #f3f4f6;
}

.is-tile .pm-media {
  height: 10.5rem;
  object-fit: cover;
}

.pm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  min-height: 11rem;
  padding: 1.25rem;
  border: 1.5px dashed #d1d5db;
  border-radius: 0.75rem;
  color: #6b7280;
  text-align: center;
}

.is-tile .pm-empty {
  min-height: 10.5rem;
  padding: 0.75rem;
}

.pm-empty-icon {
  width: 1.75rem;
  height: 1.75rem;
  color: #9ca3af;
}

.pm-url {
  width: 100%;
  max-width: 28rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.625rem;
  background: #fff;
  color: #111827;
  font-size: 0.8125rem;
  outline: none;
}

.pm-url:focus,
.pm-field:focus {
  border-color: #17a6e3;
  box-shadow: 0 0 0 3px rgba(23, 166, 227, 0.15);
}

.pm-error {
  margin: 0;
  font-size: 0.75rem;
  color: #dc2626;
}

.pm-flag,
.pm-badge {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.72);
  color: #fff;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.pm-badge {
  left: 0.5rem;
}

.pm-flag + .pm-badge {
  left: 3.25rem;
}

.pm-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.25rem;
  padding: 0.1875rem;
  border-radius: 0.625rem;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.18);
  opacity: 0;
  transition: opacity 0.15s;
}

.pm-item:hover .pm-actions,
.pm-item:focus-within .pm-actions,
.pm-item.is-open .pm-actions {
  opacity: 1;
}

@media (hover: none) {
  .pm-actions {
    opacity: 1;
  }
}

.pm-act {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 0;
  border-radius: 0.4rem;
  background: transparent;
  color: #374151;
  font-size: 0.875rem;
  line-height: 1;
  cursor: pointer;
}

.pm-act:hover:not(:disabled) {
  background: #f3f4f6;
  color: #17a6e3;
}

.pm-act:disabled {
  opacity: 0.35;
  cursor: default;
}

.pm-act-danger:hover:not(:disabled) {
  background: #fef2f2;
  color: #dc2626;
}

.pm-act-icon {
  width: 1rem;
  height: 1rem;
}

.pm-caption-wrap {
  margin-top: 0.5rem;
}

.pm-caption {
  width: 100%;
  padding: 0.25rem 0.25rem;
  border: 0;
  border-bottom: 1px solid transparent;
  background: transparent;
  color: #6b7280;
  font-size: 0.8125rem;
  text-align: center;
  outline: none;
}

.pm-caption::placeholder {
  color: #c3c8d0;
}

.pm-caption:hover {
  border-bottom-color: #e5e7eb;
}

.pm-caption:focus {
  border-bottom-color: #17a6e3;
  color: #111827;
}

.pm-segmented {
  display: inline-flex;
  padding: 2px;
  border-radius: 0.625rem;
  background: #f3f4f6;
}

.pm-segmented button {
  padding: 0.25rem 0.75rem;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.pm-segmented button.is-on {
  background: #fff;
  color: #111827;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
}

.pm-panel {
  margin-top: 0.75rem;
  padding: 0.875rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #fff;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.08);
}

.pm-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.pm-label {
  display: block;
  margin-top: 0.75rem;
  color: #374151;
  font-size: 0.75rem;
  font-weight: 600;
}

.pm-muted {
  font-weight: 400;
  color: #9ca3af;
}

.pm-field {
  display: block;
  width: 100%;
  margin-top: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.625rem;
  color: #111827;
  font-size: 0.8125rem;
  font-weight: 400;
  outline: none;
}

.pm-grid {
  display: grid;
  gap: 0 0.75rem;
}

@media (min-width: 640px) {
  .is-solo .pm-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.pm-link-danger {
  border: 0;
  background: none;
  color: #9ca3af;
  font-size: 0.75rem;
  cursor: pointer;
}

.pm-link-danger:hover {
  color: #dc2626;
}
</style>