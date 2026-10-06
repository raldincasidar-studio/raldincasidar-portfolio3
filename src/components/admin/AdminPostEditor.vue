<script setup>
import { computed, onMounted, ref } from 'vue'
import AdminRichInput from './AdminRichInput.vue'
import AdminMediaItem from './AdminMediaItem.vue'
import {
  BLOCK_LIBRARY,
  blockLabel,
  blockSummary,
  blocksFromMarkdown,
  createBlock,
  createMediaItem,
  postStats,
} from '@/utils/postBlocks.js'

/**
 * AdminPostEditor — WordPress-style block editor for case study chapter 03.
 *
 * The `post` object is owned by the parent draft and mutated in place (it is
 * part of the parent's `reactive` draft, so edits stay in sync with the
 * unsaved-changes indicator and the local draft backup).
 */
const props = defineProps({
  post: { type: Object, required: true },
  title: { type: String, default: 'The Story' },
})

const stats = computed(() => postStats(props.post))
const blocks = computed(() => (Array.isArray(props.post?.blocks) ? props.post.blocks : []))
const showImporter = ref(false)
const markdownInput = ref('')
const importNotes = ref([])

const groups = [
  { label: 'Headings', items: BLOCK_LIBRARY.filter((block) => block.type === 'heading') },
  { label: 'Text', items: BLOCK_LIBRARY.filter((block) => ['paragraph', 'quote', 'divider'].includes(block.type)) },
  { label: 'Lists', items: BLOCK_LIBRARY.filter((block) => block.type === 'list') },
  { label: 'Media', items: BLOCK_LIBRARY.filter((block) => ['image', 'gallery'].includes(block.type)) },
]

function ensurePost() {
  if (!Array.isArray(props.post.blocks)) props.post.blocks = []
  if (typeof props.post.intro !== 'string') props.post.intro = ''
}

onMounted(ensurePost)

function addBlock(entry) {
  ensurePost()
  props.post.blocks.push(createBlock(entry.type, entry.level, entry.ordered))
}

function moveBlock(index, delta) {
  const list = props.post.blocks
  const next = index + delta
  if (next < 0 || next >= list.length) return
  const [block] = list.splice(index, 1)
  list.splice(next, 0, block)
}

function duplicateBlock(index) {
  props.post.blocks.splice(index + 1, 0, JSON.parse(JSON.stringify(props.post.blocks[index])))
}

function removeBlock(index) {
  props.post.blocks.splice(index, 1)
}

/* Lists are authored one item per line — fast to type, easy on mobile. */
function listText(block) {
  return (block.items || []).join('\n')
}

function setListText(block, value) {
  block.items = value.split('\n')
}

function addGalleryItem(block) {
  if (!Array.isArray(block.galleryItems)) block.galleryItems = []
  block.galleryItems.push(createMediaItem())
}

function moveGalleryItem(block, index, delta) {
  const next = index + delta
  if (next < 0 || next >= block.galleryItems.length) return
  const [item] = block.galleryItems.splice(index, 1)
  block.galleryItems.splice(next, 0, item)
}

function removeGalleryItem(block, index) {
  block.galleryItems.splice(index, 1)
}

function convertMarkdown(replace) {
  const { blocks: imported, notes } = blocksFromMarkdown(markdownInput.value)
  importNotes.value = notes
  if (!imported.length) return
  ensurePost()
  if (replace) props.post.blocks = imported
  else props.post.blocks.push(...imported)
  markdownInput.value = ''
}
</script>

<template>
  <div class="admin-editor-card">
    <div class="admin-editor-heading flex-wrap">
      <div>
        <p class="admin-eyebrow">Case study page · chapter 03</p>
        <h2 class="admin-section-title">{{ title }} — post content</h2>
        <p class="mt-2 max-w-2xl text-sm text-gray-500">
          Blocks render in order on the public case study page. Text fields accept inline
          <strong class="font-semibold">Markdown</strong> (bold, italic, links, code); images and videos are
          added by URL — a single visual fills the column, several become a captioned gallery.
        </p>
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <span class="admin-post-stat">{{ stats.blocks }} blocks</span>
        <span class="admin-post-stat">{{ stats.words }} words</span>
        <span class="admin-post-stat">~{{ stats.minutes }} min read</span>
      </div>
    </div>

    <!-- Intro -->
    <label class="admin-label">
      Intro paragraph <span class="font-normal text-gray-400">(optional lead-in, shown larger)</span>
      <AdminRichInput v-model="post.intro" class="mt-2" :rows="3" placeholder="One or two sentences that frame the chapter." />
    </label>

    <!-- Insert toolbar -->
    <div class="admin-post-insert">
      <div v-for="group in groups" :key="group.label" class="admin-post-group">
        <p class="admin-post-group-label">{{ group.label }}</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="entry in group.items"
            :key="`${entry.type}-${entry.level ?? entry.ordered ?? ''}`"
            type="button"
            class="admin-post-insert-button"
            :title="entry.hint"
            @click="addBlock(entry)"
          >
            <span class="admin-post-insert-icon">{{ entry.icon }}</span>
            {{ entry.label }}
          </button>
        </div>
      </div>
      <div class="admin-post-group">
        <p class="admin-post-group-label">Import</p>
        <button type="button" class="admin-post-insert-button" @click="showImporter = !showImporter">
          <span class="admin-post-insert-icon">↓</span>
          Paste Markdown
        </button>
      </div>
    </div>

    <!-- Markdown importer -->
    <div v-if="showImporter" class="admin-post-importer">
      <label class="admin-label">
        Paste a Markdown draft
        <textarea
          v-model="markdownInput"
          rows="7"
          class="admin-input mt-2 font-mono text-xs"
          placeholder="# Heading&#10;&#10;A paragraph with **bold** text.&#10;&#10;- a bullet&#10;- another bullet&#10;&#10;> A quote&#10;&#10;![Caption](https://cdn.example.com/shot.jpg)"
        />
      </label>
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="button" class="admin-button-primary" :disabled="!markdownInput.trim()" @click="convertMarkdown(false)">
          Convert &amp; append
        </button>
        <button type="button" class="admin-button-secondary" :disabled="!markdownInput.trim()" @click="convertMarkdown(true)">
          Replace all blocks
        </button>
        <button type="button" class="admin-button-secondary" @click="showImporter = false">Close</button>
      </div>
      <ul v-if="importNotes.length" class="mt-3 space-y-1 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
        <li v-for="(note, index) in importNotes" :key="index">• {{ note }}</li>
      </ul>
    </div>

    <!-- Empty state -->
    <div v-if="!blocks.length" class="admin-subtle-empty mt-5">
      No post content yet — add a heading, paragraph, list, quote or image above. The chapter is hidden on the
      public page until you add something.
    </div>

    <!-- Blocks -->
    <div v-else class="mt-5 space-y-4">
      <div v-for="(block, index) in blocks" :key="index" class="admin-post-block">
        <header class="admin-post-block-head">
          <span class="admin-post-block-badge">{{ blockLabel(block) }}</span>
          <span class="admin-post-block-summary">{{ blockSummary(block) }}</span>
          <div class="admin-post-block-actions">
            <button type="button" class="admin-icon-button" :disabled="index === 0" aria-label="Move block up" title="Move up" @click="moveBlock(index, -1)">↑</button>
            <button type="button" class="admin-icon-button" :disabled="index === blocks.length - 1" aria-label="Move block down" title="Move down" @click="moveBlock(index, 1)">↓</button>
            <button type="button" class="admin-icon-button" aria-label="Duplicate block" title="Duplicate" @click="duplicateBlock(index)">⧉</button>
            <button type="button" class="admin-icon-button admin-icon-button-danger" aria-label="Delete block" title="Delete" @click="removeBlock(index)">×</button>
          </div>
        </header>

        <!-- Heading -->
        <div v-if="block.type === 'heading'" class="admin-post-block-body">
          <div class="admin-segmented" role="group" aria-label="Heading level">
            <button v-for="level in [1, 2, 3]" :key="level" type="button" :class="block.level === level ? 'is-on' : ''" @click="block.level = level">
              H{{ level }}
            </button>
          </div>
          <AdminRichInput v-model="block.text" class="mt-3" :rows="2" placeholder="Section heading" />
        </div>

        <!-- Paragraph -->
        <div v-else-if="block.type === 'paragraph'" class="admin-post-block-body">
          <AdminRichInput v-model="block.text" :rows="5" placeholder="Write the story…" />
        </div>

        <!-- List -->
        <div v-else-if="block.type === 'list'" class="admin-post-block-body">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="admin-segmented" role="group" aria-label="List style">
              <button type="button" :class="!block.ordered ? 'is-on' : ''" @click="block.ordered = false">• Bulleted</button>
              <button type="button" :class="block.ordered ? 'is-on' : ''" @click="block.ordered = true">1. Numbered</button>
            </div>
            <span class="text-xs text-gray-400">One item per line</span>
          </div>
          <AdminRichInput
            class="mt-3"
            :model-value="listText(block)"
            :rows="Math.min(Math.max((block.items || []).length + 1, 4), 14)"
            placeholder="First item&#10;Second item"
            @update:model-value="setListText(block, $event)"
          />
        </div>

        <!-- Quote -->
        <div v-else-if="block.type === 'quote'" class="admin-post-block-body">
          <AdminRichInput v-model="block.text" :rows="3" placeholder="A line worth pulling out" />
          <label class="admin-label mt-3">
            Attribution <span class="font-normal text-gray-400">(optional)</span>
            <input v-model="block.cite" type="text" class="admin-input mt-1.5" placeholder="Client, stakeholder, user" />
          </label>
        </div>

        <!-- Image / video -->
        <div v-else-if="block.type === 'image'" class="admin-post-block-body">
          <AdminMediaItem :item="block" :removable="false" />
        </div>

        <!-- Gallery -->
        <div v-else-if="block.type === 'gallery'" class="admin-post-block-body">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs text-gray-500">
              {{ (block.galleryItems || []).length }} visual(s) · shown in a scrollable captioned row
            </span>
            <button type="button" class="admin-button-secondary" @click="addGalleryItem(block)">+ Add visual</button>
          </div>
          <div v-if="!(block.galleryItems || []).length" class="admin-subtle-empty">Add at least one image or video.</div>
          <div v-else class="space-y-3">
            <AdminMediaItem
              v-for="(item, itemIndex) in block.galleryItems"
              :key="itemIndex"
              :item="item"
              :index="itemIndex"
              variant="tile"
              movers
              :first="itemIndex === 0"
              :last="itemIndex === block.galleryItems.length - 1"
              @move="moveGalleryItem(block, itemIndex, $event)"
              @remove="removeGalleryItem(block, itemIndex)"
            />
          </div>
        </div>

        <!-- Divider -->
        <div v-else-if="block.type === 'divider'" class="admin-post-block-body">
          <div class="admin-post-divider-preview"><span /></div>
          <p class="mt-2 text-xs text-gray-400">A subtle rule that separates two parts of the story.</p>
        </div>
      </div>
    </div>
  </div>
</template>
