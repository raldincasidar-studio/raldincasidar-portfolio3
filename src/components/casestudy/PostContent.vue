<script setup>
import { computed } from 'vue'
import MediaGallery from './MediaGallery.vue'
import { renderInline } from '@/utils/richText.js'
import { normalizePost } from '@/utils/postBlocks.js'

/**
 * PostContent — renders the structured "The Story" chapter of a case study.
 *
 * Text supports inline Markdown only; everything is sanitised before it is
 * bound, so authored content can never inject markup. Visuals render as a
 * solo figure or a captioned gallery row.
 */
const props = defineProps({
  post: { type: Object, default: () => ({}) },
})

const content = computed(() => normalizePost(props.post))

// Heading levels render as h3–h5 so the page keeps a single h2 section title.
function headingTag(level) {
  return `h${Math.min(Math.max(Number(level) || 1, 1) + 2, 5)}`
}

function mediaItems(block) {
  if (block.type === 'gallery') return block.galleryItems
  return [{ mediaType: block.mediaType, url: block.url, alt: block.alt, caption: block.caption, href: block.href }]
}
</script>

<template>
  <article class="post-content">
    <p v-if="content.intro" class="post-intro" v-html="renderInline(content.intro)" />

    <template v-for="(block, index) in content.blocks" :key="index">
      <component
        :is="headingTag(block.level)"
        v-if="block.type === 'heading'"
        class="post-heading"
        :class="`post-heading-${Math.min(Math.max(block.level, 1), 3)}`"
        v-html="renderInline(block.text)"
      />

      <p v-else-if="block.type === 'paragraph'" class="post-p" v-html="renderInline(block.text)" />

      <component
        v-else-if="block.type === 'list'"
        :is="block.ordered ? 'ol' : 'ul'"
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
      />

      <div v-else-if="block.type === 'divider'" class="post-divider" role="separator" />
    </template>
  </article>
</template>
