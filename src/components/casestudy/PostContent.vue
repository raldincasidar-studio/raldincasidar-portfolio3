<script setup>
import { computed, ref } from 'vue'
import MediaGallery from './MediaGallery.vue'
import MediaLightbox from './MediaLightbox.vue'
import { renderInline, toPlainText } from '@/utils/richText.js'
import { buildPostHeadings, normalizePost } from '@/utils/postBlocks.js'

/**
 * PostContent — renders the structured "The Story" chapter of a case study.
 *
 * Text supports inline Markdown only; everything is sanitised before it is
 * bound, so authored content can never inject markup. Visuals render as a
 * solo figure or a captioned gallery row, and both open a full-screen preview.
 */
const props = defineProps({
  post: { type: Object, default: () => ({}) },
})

const content = computed(() => normalizePost(props.post))

// Anchors come from the same index the "on this page" rail builds, so the ids
// on the rendered headings always match the links.
const headingIds = computed(() => {
  const map = new Map()
  for (const heading of buildPostHeadings(props.post)) map.set(heading.blockIndex, heading.id)
  return map
})

// Heading levels render as h3–h5 so the page keeps a single h2 section title.
function headingTag(level) {
  return `h${Math.min(Math.max(Number(level) || 1, 1) + 2, 5)}`
}

/* A heading written as markup only (`<img …>`) would render as an empty block
   with an orphan anchor — the TOC already skips those, so skip them here too. */
function hasText(block) {
  return Boolean(toPlainText(block.text).trim())
}

function mediaItems(block) {
  if (block.type === 'gallery') return block.galleryItems
  return [{ mediaType: block.mediaType, url: block.url, alt: block.alt, caption: block.caption, href: block.href }]
}

/* ── Full-screen preview ───────────────────────────────────────────────── */
const lightbox = ref({ open: false, items: [], index: 0, label: 'Project gallery' })

function openLightbox(items, index, label) {
  const usable = (items || []).filter((item) => item?.url)
  if (!usable.length) return
  lightbox.value = { open: true, items: usable, index: Math.min(index, usable.length - 1), label }
}

function closeLightbox() {
  lightbox.value = { ...lightbox.value, open: false }
}

function setLightboxIndex(index) {
  lightbox.value = { ...lightbox.value, index }
}
</script>

<template>
  <article class="post-content">
    <p v-if="content.intro" class="post-intro" v-html="renderInline(content.intro)" />

    <template v-for="(block, index) in content.blocks" :key="index">
      <component
        :is="headingTag(block.level)"
        v-if="block.type === 'heading' && hasText(block)"
        :id="headingIds.get(index)"
        class="post-heading"
        :class="`post-heading-${Math.min(Math.max(block.level, 1), 3)}`"
        v-html="renderInline(block.text)"
      />

      <p v-else-if="block.type === 'paragraph'" class="post-p" v-html="renderInline(block.text)" />

      <component
        :is="block.ordered ? 'ol' : 'ul'"
        v-else-if="block.type === 'list'"
        class="post-list"
        :class="block.ordered ? 'post-list-ordered' : 'post-list-bulleted'"
      >
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex" v-html="renderInline(item)" />
      </component>

      <blockquote v-else-if="block.type === 'quote'" class="post-quote">
        <p v-html="renderInline(block.text)" />
        <cite v-if="block.cite">{{ block.cite }}</cite>
      </blockquote>

      <MediaGallery
        v-else-if="block.type === 'image' || block.type === 'gallery'"
        :items="mediaItems(block)"
        :label="block.type === 'gallery' ? 'Project gallery' : 'Project visual'"
        @open="openLightbox(mediaItems(block), $event, block.type === 'gallery' ? 'Project gallery' : 'Project visual')"
      />

      <div v-else-if="block.type === 'divider'" class="post-divider" role="separator" />
    </template>

    <MediaLightbox
      :open="lightbox.open"
      :items="lightbox.items"
      :index="lightbox.index"
      :label="lightbox.label"
      @update:open="closeLightbox"
      @update:index="setLightboxIndex"
    />
  </article>
</template>
