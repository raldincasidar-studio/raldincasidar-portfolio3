<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, toRaw, watch } from 'vue'
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
 * One continuous writing canvas instead of a stack of form cards:
 *  - every text block is edited in place (WYSIWYG), formatting controls
 *    appear on selection, a block toolbar appears on the active block;
 *  - Enter splits a block, Backspace at the start merges / un-styles it,
 *    arrow keys travel between blocks;
 *  - type "/" for the block menu, or "# ", "- ", "1. ", "> ", "---" shortcuts;
 *  - blocks reorder by dragging the grip (or ↑/↓, Ctrl/⌘+Shift+↑/↓);
 *  - a "+" appears between blocks on hover, plus an Outline and Markdown import.
 *
 * Data contract is unchanged: `post.intro` (string) and `post.blocks`
 * (heading / paragraph / quote / list / image / gallery / divider objects with
 * inline-Markdown text). The `post` object is mutated in place.
 */
const props = defineProps({
  post: { type: Object, required: true },
  title: { type: String, default: 'The Story' },
})

const TEXT_TYPES = new Set(['paragraph', 'heading', 'quote'])
const stats = computed(() => postStats(props.post))
const blocks = computed(() => (Array.isArray(props.post?.blocks) ? props.post.blocks : []))

const root = ref(null)
const listEl = ref(null)
const menuSearch = ref(null)
const importerField = ref(null)

const selectedKey = ref(null)
const toolbarMenu = ref(null) // 'type' | 'more' | null
const outlineOpen = ref(false)
const showImporter = ref(false)
const markdownInput = ref('')
const importNotes = ref([])
const dragKey = ref(null)
const dropIndex = ref(null)
const tileDrag = reactive({ block: null, from: -1, to: -1 })
const undoState = ref(null)
const menu = reactive({ open: false, mode: 'inserter', index: 0, query: '', active: 0, replaceKey: null, anchor: null, top: 0, left: 0, width: 320 })

let undoTimer = null

/* ------------------------------------------------------------------ */
/* Identity & data helpers                                              */
/* ------------------------------------------------------------------ */

/* Stable per-object keys without writing anything into the saved data. */
const keys = new WeakMap()
let keySeq = 0
function keyOf(obj) {
  const raw = toRaw(obj)
  let key = keys.get(raw)
  if (!key) {
    key = `b${++keySeq}`
    keys.set(raw, key)
  }
  return key
}

function ensurePost() {
  if (!Array.isArray(props.post.blocks)) props.post.blocks = []
  if (typeof props.post.intro !== 'string') props.post.intro = ''
}

/* Only fills in fields that are missing, so valid saved data is never touched. */
function normalizeBlock(block) {
  if (!block) return block
  switch (block.type) {
    case 'heading':
      if (typeof block.text !== 'string') block.text = ''
      if (typeof block.level !== 'number') block.level = 2
      break
    case 'paragraph':
      if (typeof block.text !== 'string') block.text = ''
      break
    case 'quote':
      if (typeof block.text !== 'string') block.text = ''
      if (typeof block.cite !== 'string') block.cite = ''
      break
    case 'list':
      if (!Array.isArray(block.items) || !block.items.length) block.items = ['']
      if (typeof block.ordered !== 'boolean') block.ordered = false
      break
    case 'image': {
      const defaults = createMediaItem()
      Object.keys(defaults).forEach((field) => {
        if (block[field] === undefined) block[field] = defaults[field]
      })
      break
    }
    case 'gallery':
      if (!Array.isArray(block.galleryItems)) block.galleryItems = []
      break
    default:
      break
  }
  return block
}

function makeBlock(type, level, ordered) {
  return normalizeBlock(createBlock(type, level, ordered))
}

function makeParagraph(text = '') {
  const block = makeBlock('paragraph')
  block.text = text
  return block
}

function indexOfKey(key) {
  return blocks.value.findIndex((block) => keyOf(block) === key)
}

function blockEl(key) {
  return root.value ? root.value.querySelector(`[data-block="${key}"]`) : null
}

function isSelected(block) {
  return selectedKey.value === keyOf(block)
}

function snapshot(value) {
  return JSON.parse(JSON.stringify(value))
}

/* ------------------------------------------------------------------ */
/* Field registry & focus                                               */
/* ------------------------------------------------------------------ */

const fields = new Map()
function setField(key, sub, inst) {
  const id = `${key}:${sub}`
  if (inst) fields.set(id, inst)
  else fields.delete(id)
}

async function focusField(key, sub = 0, pos = 'end') {
  await nextTick()
  const inst = fields.get(`${key}:${sub}`)
  if (inst) inst.focus(pos)
}

function focusBlock(key, pos = 'end') {
  const block = blocks.value[indexOfKey(key)]
  if (!block) return
  if (TEXT_TYPES.has(block.type)) focusField(key, 0, pos)
  else if (block.type === 'list') focusField(key, pos === 'start' ? 0 : Math.max(0, block.items.length - 1), pos)
  else nextTick(() => blockEl(key) && blockEl(key).focus())
}

function fieldTextLength(key, sub = 0) {
  const inst = fields.get(`${key}:${sub}`)
  return inst && inst.el ? inst.el.textContent.replace(/\u200b/g, '').length : 0
}

function select(key) {
  if (selectedKey.value !== key) {
    selectedKey.value = key
    toolbarMenu.value = null
  }
}

function afterInsert(block) {
  const key = keyOf(block)
  selectedKey.value = key
  if (TEXT_TYPES.has(block.type) || block.type === 'list') focusField(key, 0, 'start')
  else if (block.type === 'image') {
    nextTick(() => {
      const input = blockEl(key) && blockEl(key).querySelector('input')
      if (input) input.focus()
      else blockEl(key) && blockEl(key).focus()
    })
  } else nextTick(() => blockEl(key) && blockEl(key).focus())
}

/* Reading order of everything that can hold the caret. */
function stops() {
  const out = [{ key: 'intro', sub: 0 }]
  blocks.value.forEach((block) => {
    const key = keyOf(block)
    if (block.type === 'list') (block.items || []).forEach((_, i) => out.push({ key, sub: i }))
    else if (TEXT_TYPES.has(block.type)) out.push({ key, sub: 0 })
    else out.push({ key, sub: -1 })
  })
  return out
}

function moveFocus(key, sub, dir, event) {
  const list = stops()
  const at = list.findIndex((stop) => stop.key === key && stop.sub === sub)
  const target = list[at + dir]
  if (!target) return
  if (event) event.preventDefault()
  if (target.sub === -1) {
    selectedKey.value = target.key
    nextTick(() => blockEl(target.key) && blockEl(target.key).focus())
  } else {
    if (target.key !== 'intro') selectedKey.value = target.key
    focusField(target.key, target.sub, dir < 0 ? 'end' : 'start')
  }
}

/* ------------------------------------------------------------------ */
/* Undo toast                                                           */
/* ------------------------------------------------------------------ */

function offerUndo(label, restore) {
  clearTimeout(undoTimer)
  undoState.value = { label, restore }
  undoTimer = setTimeout(() => {
    undoState.value = null
  }, 7000)
}

function runUndo() {
  if (undoState.value) undoState.value.restore()
  undoState.value = null
  clearTimeout(undoTimer)
}

/* ------------------------------------------------------------------ */
/* Block operations                                                     */
/* ------------------------------------------------------------------ */

function moveBlock(index, delta) {
  const list = props.post.blocks
  const next = index + delta
  if (next < 0 || next >= list.length) return
  const key = keyOf(list[index])
  const [block] = list.splice(index, 1)
  list.splice(next, 0, block)
  toolbarMenu.value = null
  focusBlock(key)
}

function duplicateBlock(index) {
  const copy = snapshot(props.post.blocks[index])
  props.post.blocks.splice(index + 1, 0, copy)
  toolbarMenu.value = null
  afterInsert(props.post.blocks[index + 1])
}

function removeBlock(index) {
  const list = props.post.blocks
  const saved = snapshot(list[index])
  list.splice(index, 1)
  toolbarMenu.value = null
  const neighbour = list[Math.min(index, list.length - 1)]
  if (neighbour) {
    selectedKey.value = keyOf(neighbour)
    focusBlock(keyOf(neighbour), index >= list.length ? 'end' : 'start')
  } else selectedKey.value = null
  offerUndo('Block deleted', () => {
    const current = props.post.blocks
    current.splice(Math.min(index, current.length), 0, saved)
  })
}

function insertParagraphAfter(index) {
  const block = makeParagraph()
  props.post.blocks.splice(index + 1, 0, block)
  afterInsert(block)
}

function insertParagraphBefore(index) {
  const block = makeParagraph()
  props.post.blocks.splice(index, 0, block)
  toolbarMenu.value = null
  afterInsert(block)
}

function convert(block, type, opts = {}) {
  const key = keyOf(block)
  if (type === 'heading') {
    block.type = 'heading'
    block.level = opts.level || 2
    block.text = ''
  } else if (type === 'quote') {
    block.type = 'quote'
    block.text = ''
    block.cite = block.cite || ''
  } else if (type === 'list') {
    block.type = 'list'
    block.ordered = !!opts.ordered
    block.items = ['']
    delete block.text
  }
  normalizeBlock(block)
  selectedKey.value = key
  focusField(key, 0, 'start')
}

/* Toolbar "transform" menu: keeps the text when changing block type. */
function transformBlock(block, entry) {
  toolbarMenu.value = null
  const key = keyOf(block)
  const index = indexOfKey(key)
  if (block.type === 'list') {
    if (entry.type === 'list') {
      block.ordered = !!entry.ordered
      return
    }
    const texts = block.items && block.items.length ? block.items : ['']
    if (entry.type === 'paragraph') {
      const made = texts.map((text) => makeParagraph(text))
      props.post.blocks.splice(index, 1, ...made)
      afterInsert(made[0])
      return
    }
    block.type = entry.type
    block.text = entry.type === 'heading' ? texts.join(' ') : texts.join('\n')
    delete block.items
    delete block.ordered
    if (entry.type === 'heading') block.level = entry.level || 2
    normalizeBlock(block)
    focusField(key, 0, 'end')
    return
  }
  if (entry.type === 'list') {
    const lines = String(block.text || '').split('\n')
    block.type = 'list'
    block.ordered = !!entry.ordered
    block.items = lines.length ? lines : ['']
    delete block.text
    delete block.level
    delete block.cite
    normalizeBlock(block)
    focusField(key, block.items.length - 1, 'end')
    return
  }
  block.type = entry.type
  if (entry.type === 'heading') block.level = entry.level || 2
  else delete block.level
  if (entry.type !== 'quote') delete block.cite
  normalizeBlock(block)
  focusField(key, 0, 'end')
}

const transformTargets = computed(() =>
  BLOCK_LIBRARY.filter((entry) => ['paragraph', 'heading', 'quote', 'list'].includes(entry.type)),
)

function entryActive(block, entry) {
  if (block.type !== entry.type) return false
  if (entry.type === 'heading') return block.level === (entry.level || 2)
  if (entry.type === 'list') return !!block.ordered === !!entry.ordered
  return true
}

function entryId(entry) {
  return `${entry.type}-${entry.level ?? entry.ordered ?? ''}`
}

function formatActive(kind) {
  const key = selectedKey.value
  const row = key ? blockEl(key) : null
  if (!row) return
  let el = document.activeElement && document.activeElement.closest && document.activeElement.closest('[contenteditable="true"]')
  if (!el || !row.contains(el)) {
    const inst = fields.get(`${key}:0`)
    el = inst && inst.el
    if (el) el.focus()
  }
  if (el) el.dispatchEvent(new CustomEvent('pe-format', { detail: kind }))
}

/* ------------------------------------------------------------------ */
/* Typing behaviour: shortcuts, split, merge                            */
/* ------------------------------------------------------------------ */

function onText(block, value) {
  block.text = value
  const key = keyOf(block)
  if (block.type === 'paragraph') {
    const heading = /^(#{1,3}) $/.exec(value)
    if (heading) return convert(block, 'heading', { level: heading[1].length })
    if (/^[-*] $/.test(value)) return convert(block, 'list', { ordered: false })
    if (/^1[.)] $/.test(value)) return convert(block, 'list', { ordered: true })
    if (/^> $/.test(value)) return convert(block, 'quote')
    const slash = /^\/([\w -]{0,24})$/.exec(value)
    if (slash) return openSlash(block, slash[1])
  }
  if (menu.open && menu.mode === 'slash' && menu.replaceKey === key) closeMenu()
  return undefined
}

function onSplit(block, parts) {
  const index = indexOfKey(keyOf(block))
  if (index < 0) return
  if (block.type === 'paragraph' && parts.before.trim() === '---' && !parts.after) {
    block.type = 'divider'
    delete block.text
    insertParagraphAfter(index)
    return
  }
  if (block.type !== 'paragraph' && !parts.before && !parts.after) {
    block.type = 'paragraph'
    delete block.level
    delete block.cite
    normalizeBlock(block)
    return
  }
  const next = makeParagraph(parts.after)
  block.text = parts.before
  props.post.blocks.splice(index + 1, 0, next)
  selectedKey.value = keyOf(next)
  focusField(keyOf(next), 0, 'start')
}

function onBackspaceStart(block, event) {
  const key = keyOf(block)
  const index = indexOfKey(key)
  if (block.type !== 'paragraph') {
    event.preventDefault()
    block.type = 'paragraph'
    delete block.level
    delete block.cite
    normalizeBlock(block)
    return
  }
  if (index === 0) {
    if (!block.text && blocks.value.length > 1) {
      event.preventDefault()
      props.post.blocks.splice(0, 1)
      const first = props.post.blocks[0]
      selectedKey.value = keyOf(first)
      focusBlock(keyOf(first), 'start')
    }
    return
  }
  const previous = props.post.blocks[index - 1]
  const previousKey = keyOf(previous)
  if (TEXT_TYPES.has(previous.type)) {
    event.preventDefault()
    const offset = fieldTextLength(previousKey)
    previous.text = (previous.text || '') + (block.text || '')
    props.post.blocks.splice(index, 1)
    selectedKey.value = previousKey
    focusField(previousKey, 0, offset)
  } else if (previous.type === 'list') {
    event.preventDefault()
    const last = previous.items.length - 1
    const offset = fieldTextLength(previousKey, last)
    previous.items[last] = (previous.items[last] || '') + (block.text || '')
    props.post.blocks.splice(index, 1)
    selectedKey.value = previousKey
    focusField(previousKey, last, offset)
  } else {
    event.preventDefault()
    if (!block.text) props.post.blocks.splice(index, 1)
    selectedKey.value = previousKey
    nextTick(() => blockEl(previousKey) && blockEl(previousKey).focus())
  }
}

/* Lists: every item is its own inline field, so Enter / Backspace feel native. */
function setItem(block, i, value) {
  block.items[i] = value
}

function onItemSplit(block, i, parts) {
  const key = keyOf(block)
  const empty = !parts.before && !parts.after
  if (empty && i === block.items.length - 1) {
    const index = indexOfKey(key)
    if (block.items.length === 1) {
      block.type = 'paragraph'
      block.text = ''
      delete block.items
      delete block.ordered
      normalizeBlock(block)
      focusField(key, 0, 'start')
    } else {
      block.items.splice(i, 1)
      insertParagraphAfter(index)
    }
    return
  }
  block.items.splice(i, 1, parts.before, parts.after)
  focusField(key, i + 1, 'start')
}

function onItemBackspace(block, i, event) {
  event.preventDefault()
  const key = keyOf(block)
  if (i > 0) {
    const offset = fieldTextLength(key, i - 1)
    block.items[i - 1] = (block.items[i - 1] || '') + (block.items[i] || '')
    block.items.splice(i, 1)
    focusField(key, i - 1, offset)
    return
  }
  const index = indexOfKey(key)
  if (block.items.length === 1) {
    block.type = 'paragraph'
    block.text = block.items[0] || ''
    delete block.items
    delete block.ordered
    normalizeBlock(block)
    focusField(key, 0, 'start')
    return
  }
  const lifted = makeParagraph(block.items[0] || '')
  block.items.splice(0, 1)
  props.post.blocks.splice(index, 0, lifted)
  selectedKey.value = keyOf(lifted)
  focusField(keyOf(lifted), 0, 'start')
}

/* Intro (the lead-in above the blocks) */
function onIntroSplit(parts) {
  props.post.intro = parts.before
  const block = makeParagraph(parts.after)
  props.post.blocks.splice(0, 0, block)
  afterInsert(block)
}

/* Multi-line paste → blocks (uses the same Markdown importer as before). */
function pasteIntoBlocks(index, payload, replaceKey) {
  const { blocks: imported } = blocksFromMarkdown(payload.text)
  if (!imported.length || (imported.length === 1 && imported[0].type === 'paragraph')) return
  payload.handled = true
  ensurePost()
  imported.forEach(normalizeBlock)
  if (replaceKey) {
    const at = indexOfKey(replaceKey)
    if (at > -1) props.post.blocks.splice(at, 1)
  }
  props.post.blocks.splice(index, 0, ...imported)
  afterInsert(imported[imported.length - 1])
}

function onPasteBlocks(block, payload) {
  const key = keyOf(block)
  const index = indexOfKey(key)
  pasteIntoBlocks(block.text ? index + 1 : index, payload, block.text ? null : key)
}

function onIntroPaste(payload) {
  pasteIntoBlocks(0, payload, null)
}

/* ------------------------------------------------------------------ */
/* Row-level interaction (media / divider blocks, pointer, keyboard)    */
/* ------------------------------------------------------------------ */

function onRowPointerDown(event, block) {
  if (event.target === event.currentTarget && (TEXT_TYPES.has(block.type) || block.type === 'list')) {
    event.preventDefault()
    const key = keyOf(block)
    selectedKey.value = key
    focusBlock(key)
  }
}

function onRowKeydown(event, block, index) {
  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault()
    removeBlock(index)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    insertParagraphAfter(index)
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    moveFocus(keyOf(block), -1, event.key === 'ArrowUp' ? -1 : 1, event)
  }
}

function onRootKeydown(event) {
  const mod = event.metaKey || event.ctrlKey
  if (mod && event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
    const index = selectedKey.value ? indexOfKey(selectedKey.value) : -1
    if (index > -1) {
      event.preventDefault()
      moveBlock(index, event.key === 'ArrowUp' ? -1 : 1)
    }
  } else if (event.key === 'Escape') {
    toolbarMenu.value = null
    outlineOpen.value = false
  }
}

function onTailClick() {
  ensurePost()
  const last = props.post.blocks[props.post.blocks.length - 1]
  if (last && last.type === 'paragraph' && !last.text) {
    focusBlock(keyOf(last))
    return
  }
  const block = makeParagraph()
  props.post.blocks.push(block)
  afterInsert(block)
}

function placeholderFor(block, index) {
  if (block.type === 'heading') return 'Heading'
  if (block.type === 'quote') return 'A line worth pulling out'
  return index === 0 && blocks.value.length === 1 ? 'Type / to choose a block, or just start writing' : 'Type / for blocks'
}

function textClass(block) {
  if (block.type === 'heading') return ['pe-heading', `pe-h${block.level || 2}`]
  if (block.type === 'quote') return 'pe-quote-text'
  return 'pe-paragraph'
}

function rowClass(block) {
  return [`is-${block.type}`, { 'is-selected': isSelected(block), 'is-dragging': dragKey.value === keyOf(block) }]
}

/* ------------------------------------------------------------------ */
/* Block menu (inserter + slash)                                        */
/* ------------------------------------------------------------------ */

const menuItems = computed(() => {
  const q = menu.query.trim().toLowerCase()
  const list = BLOCK_LIBRARY.filter(
    (entry) => !q || `${entry.label} ${entry.type} ${entry.hint || ''}`.toLowerCase().includes(q),
  ).map((entry) => ({ id: entryId(entry), entry, label: entry.label, icon: entry.icon || '+', hint: entry.hint }))
  if (menu.mode === 'inserter' && (!q || ['markdown', 'import', 'paste'].some((word) => word.startsWith(q) || q.includes(word)))) {
    list.push({ id: 'import', import: true, label: 'Paste Markdown', icon: '↓', hint: 'Turn a Markdown draft into blocks' })
  }
  return list
})

watch(
  () => menu.query,
  () => {
    menu.active = 0
  },
)

function positionMenu() {
  const anchor = menu.anchor
  if (!anchor || !anchor.getBoundingClientRect) return
  const rect = anchor.getBoundingClientRect()
  const width = Math.min(320, window.innerWidth - 16)
  const height = Math.min(360, window.innerHeight * 0.6)
  let top = rect.bottom + 6
  if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6)
  menu.top = top
  menu.left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
  menu.width = width
}

function openMenu(mode, index, anchor, replaceKey = null) {
  menu.open = true
  menu.mode = mode
  menu.index = index
  menu.query = ''
  menu.active = 0
  menu.replaceKey = replaceKey
  menu.anchor = anchor
  positionMenu()
  if (mode === 'inserter') nextTick(() => menuSearch.value && menuSearch.value.focus())
}

function closeMenu() {
  menu.open = false
  menu.anchor = null
  menu.replaceKey = null
}

function openSlash(block, query) {
  const key = keyOf(block)
  if (!(menu.open && menu.mode === 'slash' && menu.replaceKey === key)) {
    const inst = fields.get(`${key}:0`)
    openMenu('slash', indexOfKey(key), inst ? inst.el : null, key)
  }
  menu.query = query
}

function openFromSeam(index, event) {
  if (menu.open && menu.mode === 'inserter' && menu.index === index) return closeMenu()
  return openMenu('inserter', index, event.currentTarget)
}

function openFromBar(event) {
  if (menu.open && menu.mode === 'inserter') return closeMenu()
  const at = selectedKey.value && selectedKey.value !== 'intro' ? indexOfKey(selectedKey.value) + 1 : blocks.value.length
  return openMenu('inserter', at, event.currentTarget)
}

function chooseMenuItem(item) {
  if (!item) return
  const { index, replaceKey } = menu
  closeMenu()
  if (item.import) {
    showImporter.value = true
    nextTick(() => importerField.value && importerField.value.focus())
    return
  }
  ensurePost()
  const block = makeBlock(item.entry.type, item.entry.level, item.entry.ordered)
  const at = replaceKey ? indexOfKey(replaceKey) : -1
  if (at > -1) props.post.blocks.splice(at, 1, block)
  else props.post.blocks.splice(Math.max(0, Math.min(index, props.post.blocks.length)), 0, block)
  afterInsert(block)
}

function stepMenu(event) {
  const count = menuItems.value.length
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMenu()
    return true
  }
  if (!count) return false
  if (event.key === 'ArrowDown') menu.active = (menu.active + 1) % count
  else if (event.key === 'ArrowUp') menu.active = (menu.active - 1 + count) % count
  else if (event.key === 'Enter' || (event.key === 'Tab' && menu.mode === 'slash')) chooseMenuItem(menuItems.value[menu.active])
  else return false
  event.preventDefault()
  return true
}

function onMenuKeydown(event) {
  stepMenu(event)
}

function onFieldKeydown(block, event) {
  if (menu.open && menu.mode === 'slash' && menu.replaceKey === keyOf(block)) stepMenu(event)
}

/* ------------------------------------------------------------------ */
/* Drag & drop reordering                                               */
/* ------------------------------------------------------------------ */

function onGripDragStart(event, block) {
  const key = keyOf(block)
  selectedKey.value = key
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', 'block')
  const row = blockEl(key)
  if (row) event.dataTransfer.setDragImage(row, 16, 16)
  dragKey.value = key
}

function clearDrag() {
  dragKey.value = null
  dropIndex.value = null
}

function onListDragOver(event) {
  if (!dragKey.value || !listEl.value) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  if (event.clientY < 90) window.scrollBy(0, -14)
  else if (event.clientY > window.innerHeight - 90) window.scrollBy(0, 14)
  const rows = Array.from(listEl.value.children).filter((el) => el.classList.contains('pe-row'))
  let at = rows.length
  for (let i = 0; i < rows.length; i += 1) {
    const rect = rows[i].getBoundingClientRect()
    if (event.clientY < rect.top + rect.height / 2) {
      at = i
      break
    }
  }
  dropIndex.value = at
}

function onListDragLeave(event) {
  if (!dragKey.value) return
  if (!listEl.value || !listEl.value.contains(event.relatedTarget)) dropIndex.value = null
}

function onListDrop(event) {
  if (!dragKey.value) return
  event.preventDefault()
  const from = indexOfKey(dragKey.value)
  let to = dropIndex.value
  const key = dragKey.value
  clearDrag()
  if (from < 0 || to === null) return
  if (to > from) to -= 1
  if (to === from) return
  const list = props.post.blocks
  const [block] = list.splice(from, 1)
  list.splice(to, 0, block)
  focusBlock(key)
}

/* Gallery tiles */
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
  const saved = snapshot(block.galleryItems[index])
  block.galleryItems.splice(index, 1)
  offerUndo('Visual removed', () => {
    block.galleryItems.splice(Math.min(index, block.galleryItems.length), 0, saved)
  })
}

function onTileDragStart(event, block, index) {
  tileDrag.block = toRaw(block)
  tileDrag.from = index
  tileDrag.to = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', 'tile')
  const wrap = event.currentTarget.closest('.pe-tile-wrap')
  if (wrap) event.dataTransfer.setDragImage(wrap, 20, 20)
}

function onTileDragOver(event, block, index) {
  if (tileDrag.block !== toRaw(block)) return
  event.preventDefault()
  const rect = event.currentTarget.getBoundingClientRect()
  tileDrag.to = event.clientX > rect.left + rect.width / 2 ? index + 1 : index
}

function clearTileDrag() {
  tileDrag.block = null
  tileDrag.from = -1
  tileDrag.to = -1
}

function onTileDrop(event, block) {
  if (tileDrag.block !== toRaw(block)) return
  event.preventDefault()
  event.stopPropagation()
  const from = tileDrag.from
  let to = tileDrag.to
  clearTileDrag()
  if (to > from) to -= 1
  if (to < 0 || to === from) return
  const [item] = block.galleryItems.splice(from, 1)
  block.galleryItems.splice(to, 0, item)
}

function tileDropClass(block, index) {
  if (tileDrag.block !== toRaw(block)) return null
  const total = block.galleryItems.length
  return {
    'is-drop-before': tileDrag.to === index,
    'is-drop-after': tileDrag.to === total && index === total - 1,
  }
}

/* ------------------------------------------------------------------ */
/* Markdown importer & outline                                          */
/* ------------------------------------------------------------------ */

function convertMarkdown(replace) {
  const { blocks: imported, notes } = blocksFromMarkdown(markdownInput.value)
  importNotes.value = notes
  if (!imported.length) return
  ensurePost()
  imported.forEach(normalizeBlock)
  if (replace) {
    const saved = snapshot(props.post.blocks)
    props.post.blocks = imported
    offerUndo('All blocks replaced', () => {
      props.post.blocks = saved
    })
  } else props.post.blocks.push(...imported)
  markdownInput.value = ''
}

function jumpTo(block) {
  const key = keyOf(block)
  outlineOpen.value = false
  selectedKey.value = key
  const row = blockEl(key)
  if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' })
  focusBlock(key, 'start')
}

/* ------------------------------------------------------------------ */
/* Lifecycle                                                            */
/* ------------------------------------------------------------------ */

function onDocPointerDown(event) {
  const target = event.target
  if (!target || !target.closest) return
  const inUi = target.closest('[data-pe-ui]')
  if (!inUi && root.value && !root.value.contains(target)) selectedKey.value = null
  if (!target.closest('[data-pe-menu],[data-pe-menu-trigger]')) closeMenu()
  if (!target.closest('.pe-btoolbar')) toolbarMenu.value = null
  if (!target.closest('.pe-outline-wrap')) outlineOpen.value = false
}

function onViewportChange() {
  if (menu.open) positionMenu()
}

/* Empty paragraphs are scaffolding — drop them when the caret leaves. */
watch(selectedKey, (_next, previous) => {
  if (!previous || previous === 'intro') return
  nextTick(() => {
    if (selectedKey.value === previous) return
    const index = blocks.value.findIndex((block) => keyOf(block) === previous)
    if (index < 0) return
    const block = blocks.value[index]
    if (block.type === 'paragraph' && !block.text) props.post.blocks.splice(index, 1)
  })
})

onMounted(() => {
  ensurePost()
  props.post.blocks.forEach(normalizeBlock)
  document.addEventListener('pointerdown', onDocPointerDown)
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('resize', onViewportChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
  clearTimeout(undoTimer)
})
</script>

<template>
  <div ref="root" class="admin-editor-card pe-editor" @keydown="onRootKeydown">
    <div class="admin-editor-heading flex-wrap">
      <div>
        <p class="admin-eyebrow">Case study page · chapter 03</p>
        <h2 class="admin-section-title">{{ title }} — post content</h2>
        <p class="pe-lede">
          Write straight on the page. Select text to format it, press <kbd>/</kbd> for blocks, and drag the
          <span class="pe-lede-grip" aria-hidden="true">⠿</span> handle to reorder. The chapter stays hidden on the public
          page until you add something.
        </p>
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <span class="admin-post-stat">{{ stats.blocks }} blocks</span>
        <span class="admin-post-stat">{{ stats.words }} words</span>
        <span class="admin-post-stat">~{{ stats.minutes }} min read</span>
      </div>
    </div>

    <!-- Top bar -->
    <div class="pe-bar" data-pe-ui role="toolbar" aria-label="Editor tools">
      <button type="button" class="pe-bar-btn is-primary" data-pe-menu-trigger aria-haspopup="menu" :aria-expanded="menu.open && menu.mode === 'inserter'" @click="openFromBar">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="pe-bar-icon" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        <span>Add block</span>
      </button>

      <div class="pe-outline-wrap">
        <button type="button" class="pe-bar-btn" :aria-expanded="outlineOpen" aria-haspopup="true" @click="outlineOpen = !outlineOpen">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="pe-bar-icon" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" /></svg>
          <span>Outline</span>
        </button>
        <div v-if="outlineOpen" class="pe-outline" role="menu">
          <p v-if="!blocks.length" class="pe-outline-empty">No blocks yet.</p>
          <button v-for="(block, index) in blocks" :key="keyOf(block)" type="button" class="pe-outline-item" role="menuitem" @click="jumpTo(block)">
            <span class="pe-outline-num">{{ index + 1 }}</span>
            <span class="pe-outline-label">{{ blockLabel(block) }}</span>
            <span class="pe-outline-summary">{{ blockSummary(block) }}</span>
          </button>
        </div>
      </div>

      <button type="button" class="pe-bar-btn" :aria-expanded="showImporter" @click="showImporter = !showImporter">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="pe-bar-icon" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
        <span>Paste Markdown</span>
      </button>
    </div>

    <!-- Markdown importer -->
    <div v-if="showImporter" class="pe-importer">
      <label class="admin-label">
        Paste a Markdown draft
        <textarea
          ref="importerField"
          v-model="markdownInput"
          rows="7"
          class="admin-input mt-2 font-mono text-xs"
          placeholder="# Heading&#10;&#10;A paragraph with **bold** text.&#10;&#10;- a bullet&#10;- another bullet&#10;&#10;> A quote&#10;&#10;![Caption](https://cdn.example.com/shot.jpg)"
        />
      </label>
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="button" class="admin-button-primary" :disabled="!markdownInput.trim()" @click="convertMarkdown(false)">Convert &amp; append</button>
        <button type="button" class="admin-button-secondary" :disabled="!markdownInput.trim()" @click="convertMarkdown(true)">Replace all blocks</button>
        <button type="button" class="admin-button-secondary" @click="showImporter = false">Close</button>
      </div>
      <ul v-if="importNotes.length" class="mt-3 space-y-1 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
        <li v-for="(note, index) in importNotes" :key="index">• {{ note }}</li>
      </ul>
    </div>

    <!-- Writing canvas -->
    <div class="pe-canvas">
      <!-- Intro -->
      <div class="pe-intro-wrap" :class="{ 'is-selected': selectedKey === 'intro' }">
        <span class="pe-intro-tag">Intro</span>
        <AdminRichInput
          :ref="(inst) => setField('intro', 0, inst)"
          v-model="post.intro"
          bare
          split-on-enter
          field-class="pe-intro"
          placeholder="Intro — an optional lead-in that frames the chapter"
          label="Intro paragraph"
          @focus="select('intro')"
          @split="onIntroSplit"
          @navigate="(dir, e) => moveFocus('intro', 0, dir === 'prev' ? -1 : 1, e)"
          @paste-blocks="onIntroPaste"
        />
      </div>

      <!-- Empty state -->
      <button v-if="!blocks.length" type="button" class="pe-start" @click="onTailClick">
        Type <kbd>/</kbd> to choose a block, or click here and start writing…
      </button>

      <!-- Blocks -->
      <div
        v-else
        ref="listEl"
        class="pe-blocks"
        @dragover="onListDragOver"
        @dragleave="onListDragLeave"
        @drop="onListDrop"
      >
        <template v-for="(block, index) in blocks" :key="keyOf(block)">
          <div class="pe-gap" :class="{ 'is-drop': dropIndex === index }">
            <button type="button" class="pe-seam" data-pe-menu-trigger aria-label="Add block here" title="Add block here" @click="openFromSeam(index, $event)">+</button>
          </div>

          <div
            class="pe-row"
            :class="rowClass(block)"
            :data-block="keyOf(block)"
            tabindex="-1"
            role="group"
            :aria-label="blockLabel(block)"
            @focusin="select(keyOf(block))"
            @pointerdown="onRowPointerDown($event, block)"
            @keydown.self="onRowKeydown($event, block, index)"
          >
            <!-- Margin grip (drag to reorder) -->
            <button
              type="button"
              class="pe-grip"
              draggable="true"
              aria-label="Drag to reorder block"
              title="Drag to reorder"
              tabindex="-1"
              @dragstart="onGripDragStart($event, block)"
              @dragend="clearDrag"
            >
              <svg viewBox="0 0 12 18" class="pe-grip-icon" aria-hidden="true"><circle cx="3" cy="3" r="1.4" /><circle cx="9" cy="3" r="1.4" /><circle cx="3" cy="9" r="1.4" /><circle cx="9" cy="9" r="1.4" /><circle cx="3" cy="15" r="1.4" /><circle cx="9" cy="15" r="1.4" /></svg>
            </button>

            <!-- Block toolbar -->
            <div v-if="isSelected(block)" class="pe-btoolbar" data-pe-ui role="toolbar" :aria-label="`${blockLabel(block)} tools`">
              <button
                type="button"
                class="pe-tb pe-tb-grip"
                draggable="true"
                aria-label="Drag to reorder block"
                title="Drag to reorder"
                @dragstart="onGripDragStart($event, block)"
                @dragend="clearDrag"
              >
                <svg viewBox="0 0 12 18" class="pe-grip-icon" aria-hidden="true"><circle cx="3" cy="3" r="1.4" /><circle cx="9" cy="3" r="1.4" /><circle cx="3" cy="9" r="1.4" /><circle cx="9" cy="9" r="1.4" /><circle cx="3" cy="15" r="1.4" /><circle cx="9" cy="15" r="1.4" /></svg>
              </button>
              <span class="pe-tb-sep" />
              <button type="button" class="pe-tb" :disabled="index === 0" aria-label="Move block up" title="Move up (Ctrl/⌘+Shift+↑)" @mousedown.prevent @click="moveBlock(index, -1)">↑</button>
              <button type="button" class="pe-tb" :disabled="index === blocks.length - 1" aria-label="Move block down" title="Move down (Ctrl/⌘+Shift+↓)" @mousedown.prevent @click="moveBlock(index, 1)">↓</button>
              <span class="pe-tb-sep" />

              <!-- Block type (transform) -->
              <div v-if="TEXT_TYPES.has(block.type) || block.type === 'list'" class="pe-tb-menu">
                <button type="button" class="pe-tb pe-tb-wide" aria-haspopup="menu" :aria-expanded="toolbarMenu === 'type'" title="Change block type" @mousedown.prevent @click="toolbarMenu = toolbarMenu === 'type' ? null : 'type'">
                  {{ blockLabel(block) }} <span class="pe-caret">▾</span>
                </button>
                <ul v-if="toolbarMenu === 'type'" class="pe-dropdown" role="menu">
                  <li v-for="entry in transformTargets" :key="entryId(entry)">
                    <button type="button" role="menuitemradio" :aria-checked="entryActive(block, entry)" class="pe-dd-item" :class="{ 'is-on': entryActive(block, entry) }" @mousedown.prevent @click="transformBlock(block, entry)">
                      <span class="pe-dd-icon">{{ entry.icon }}</span>{{ entry.label }}
                    </button>
                  </li>
                </ul>
              </div>
              <span v-else class="pe-tb-label">{{ blockLabel(block) }}</span>

              <!-- Heading levels -->
              <template v-if="block.type === 'heading'">
                <span class="pe-tb-sep" />
                <button v-for="level in [1, 2, 3]" :key="level" type="button" class="pe-tb" :class="{ 'is-on': block.level === level }" :aria-label="`Heading level ${level}`" :aria-pressed="block.level === level" @mousedown.prevent @click="block.level = level">H{{ level }}</button>
              </template>

              <!-- List style -->
              <template v-if="block.type === 'list'">
                <span class="pe-tb-sep" />
                <button type="button" class="pe-tb pe-tb-wide" :class="{ 'is-on': !block.ordered }" :aria-pressed="!block.ordered" @mousedown.prevent @click="block.ordered = false">• List</button>
                <button type="button" class="pe-tb pe-tb-wide" :class="{ 'is-on': block.ordered }" :aria-pressed="!!block.ordered" @mousedown.prevent @click="block.ordered = true">1. List</button>
              </template>

              <!-- Inline format shortcuts -->
              <template v-if="TEXT_TYPES.has(block.type) || block.type === 'list'">
                <span class="pe-tb-sep" />
                <button type="button" class="pe-tb pe-tb-bold" aria-label="Bold" title="Bold (Ctrl/⌘+B)" @mousedown.prevent @click="formatActive('bold')">B</button>
                <button type="button" class="pe-tb pe-tb-italic" aria-label="Italic" title="Italic (Ctrl/⌘+I)" @mousedown.prevent @click="formatActive('italic')">I</button>
                <button type="button" class="pe-tb" aria-label="Link" title="Link (select text first · Ctrl/⌘+K)" @mousedown.prevent @click="formatActive('link')">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="pe-tb-icon" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>
                </button>
              </template>

              <span class="pe-tb-sep" />
              <button type="button" class="pe-tb pe-tb-danger" aria-label="Delete block" title="Delete block" @mousedown.prevent @click="removeBlock(index)">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="pe-tb-icon" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
              </button>
              <div class="pe-tb-menu">
                <button type="button" class="pe-tb" aria-haspopup="menu" :aria-expanded="toolbarMenu === 'more'" aria-label="More options" title="More options" @mousedown.prevent @click="toolbarMenu = toolbarMenu === 'more' ? null : 'more'">⋯</button>
                <ul v-if="toolbarMenu === 'more'" class="pe-dropdown is-right" role="menu">
                  <li><button type="button" class="pe-dd-item" role="menuitem" @mousedown.prevent @click="insertParagraphBefore(index)"><span class="pe-dd-icon">↑</span>Insert before</button></li>
                  <li><button type="button" class="pe-dd-item" role="menuitem" @mousedown.prevent @click="toolbarMenu = null; insertParagraphAfter(index)"><span class="pe-dd-icon">↓</span>Insert after</button></li>
                  <li><button type="button" class="pe-dd-item" role="menuitem" @mousedown.prevent @click="duplicateBlock(index)"><span class="pe-dd-icon">⧉</span>Duplicate</button></li>
                  <li><button type="button" class="pe-dd-item is-danger" role="menuitem" @mousedown.prevent @click="removeBlock(index)"><span class="pe-dd-icon">×</span>Delete block</button></li>
                </ul>
              </div>
            </div>

            <!-- Heading / paragraph / quote: one field, class decides the look -->
            <template v-if="TEXT_TYPES.has(block.type)">
              <AdminRichInput
                :ref="(inst) => setField(keyOf(block), 0, inst)"
                :model-value="block.text"
                bare
                split-on-enter
                :field-class="textClass(block)"
                :placeholder="placeholderFor(block, index)"
                :label="blockLabel(block)"
                @update:model-value="onText(block, $event)"
                @split="onSplit(block, $event)"
                @backspace-start="onBackspaceStart(block, $event)"
                @navigate="(dir, e) => moveFocus(keyOf(block), 0, dir === 'prev' ? -1 : 1, e)"
                @keydown="onFieldKeydown(block, $event)"
                @paste-blocks="onPasteBlocks(block, $event)"
              />
              <input
                v-if="block.type === 'quote' && (isSelected(block) || block.cite)"
                v-model="block.cite"
                type="text"
                class="pe-cite"
                placeholder="— Attribution (client, stakeholder, user)"
                aria-label="Quote attribution"
              />
            </template>

            <!-- List: every item is an inline field -->
            <component :is="block.ordered ? 'ol' : 'ul'" v-else-if="block.type === 'list'" class="pe-list">
              <li v-for="(item, i) in block.items" :key="i">
                <AdminRichInput
                  :ref="(inst) => setField(keyOf(block), i, inst)"
                  :model-value="item"
                  bare
                  split-on-enter
                  field-class="pe-list-text"
                  placeholder="List item"
                  :label="`List item ${i + 1}`"
                  @update:model-value="setItem(block, i, $event)"
                  @split="onItemSplit(block, i, $event)"
                  @backspace-start="onItemBackspace(block, i, $event)"
                  @navigate="(dir, e) => moveFocus(keyOf(block), i, dir === 'prev' ? -1 : 1, e)"
                />
              </li>
            </component>

            <!-- Image / video -->
            <AdminMediaItem v-else-if="block.type === 'image'" :item="block" :removable="false" />

            <!-- Gallery -->
            <div v-else-if="block.type === 'gallery'" class="pe-gallery">
              <div class="pe-gallery-row">
                <div
                  v-for="(item, itemIndex) in block.galleryItems"
                  :key="keyOf(item)"
                  class="pe-tile-wrap"
                  :class="tileDropClass(block, itemIndex)"
                  @dragover="onTileDragOver($event, block, itemIndex)"
                  @drop="onTileDrop($event, block)"
                >
                  <button type="button" class="pe-tile-grip" draggable="true" aria-label="Drag to reorder visual" title="Drag to reorder" @dragstart="onTileDragStart($event, block, itemIndex)" @dragend="clearTileDrag">
                    <svg viewBox="0 0 12 18" class="pe-grip-icon" aria-hidden="true"><circle cx="3" cy="3" r="1.4" /><circle cx="9" cy="3" r="1.4" /><circle cx="3" cy="9" r="1.4" /><circle cx="9" cy="9" r="1.4" /><circle cx="3" cy="15" r="1.4" /><circle cx="9" cy="15" r="1.4" /></svg>
                  </button>
                  <AdminMediaItem
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
                <button type="button" class="pe-tile-add" @click="addGalleryItem(block)">
                  <span class="pe-tile-plus">+</span>
                  {{ (block.galleryItems || []).length ? 'Add visual' : 'Add your first image or video' }}
                </button>
              </div>
              <p class="pe-hint">{{ (block.galleryItems || []).length }} visual(s) · shown in a scrollable captioned row</p>
            </div>

            <!-- Divider -->
            <div v-else-if="block.type === 'divider'" class="pe-divider" aria-label="Divider"><span /></div>
          </div>
        </template>

        <div class="pe-gap" :class="{ 'is-drop': dropIndex === blocks.length }">
          <button type="button" class="pe-seam" data-pe-menu-trigger aria-label="Add block at the end" title="Add block at the end" @click="openFromSeam(blocks.length, $event)">+</button>
        </div>
      </div>

      <div v-if="blocks.length" class="pe-tail" role="button" tabindex="0" aria-label="Continue writing" @click="onTailClick" @keydown.enter.prevent="onTailClick" />
    </div>

    <!-- Block menu: "+" inserter and "/" slash command -->
    <Teleport to="body">
      <div
        v-if="menu.open"
        class="pe-menu"
        data-pe-ui
        data-pe-menu
        role="listbox"
        aria-label="Choose a block"
        :style="{ top: menu.top + 'px', left: menu.left + 'px', width: menu.width + 'px' }"
      >
        <input
          v-if="menu.mode === 'inserter'"
          ref="menuSearch"
          v-model="menu.query"
          type="text"
          class="pe-menu-search"
          placeholder="Search for a block"
          aria-label="Search blocks"
          @keydown="onMenuKeydown"
        />
        <p v-else class="pe-menu-title">Blocks</p>
        <ul class="pe-menu-list">
          <li v-for="(item, i) in menuItems" :key="item.id">
            <button
              type="button"
              role="option"
              class="pe-menu-item"
              :class="{ 'is-active': i === menu.active }"
              :aria-selected="i === menu.active"
              @mousedown.prevent
              @mouseenter="menu.active = i"
              @click="chooseMenuItem(item)"
            >
              <span class="pe-menu-icon">{{ item.icon }}</span>
              <span class="pe-menu-text">
                <strong>{{ item.label }}</strong>
                <small v-if="item.hint">{{ item.hint }}</small>
              </span>
            </button>
          </li>
          <li v-if="!menuItems.length" class="pe-menu-empty">No blocks match “{{ menu.query }}”</li>
        </ul>
      </div>

      <div v-if="undoState" class="pe-toast" data-pe-ui role="status">
        <span>{{ undoState.label }}</span>
        <button type="button" @click="runUndo">Undo</button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.pe-editor {
  --pe-accent: #17a6e3;
  --pe-ink: #111827;
  --pe-muted: #6b7280;
  --pe-line: #e5e7eb;
}

.pe-lede {
  margin: 0.5rem 0 0;
  max-width: 40rem;
  color: var(--pe-muted);
  font-size: 0.875rem;
  line-height: 1.55;
}

.pe-lede kbd,
.pe-start kbd {
  padding: 0 0.35rem;
  border: 1px solid var(--pe-line);
  border-bottom-width: 2px;
  border-radius: 0.3rem;
  background: #f9fafb;
  color: var(--pe-ink);
  font-family: ui-monospace, Menlo, monospace;
  font-size: 0.75rem;
}

.pe-lede-grip {
  color: var(--pe-ink);
  letter-spacing: -1px;
}

/* Top bar ---------------------------------------------------------- */
.pe-bar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  margin: 1.25rem 0 0;
  padding: 0.375rem;
  border: 1px solid var(--pe-line);
  border-radius: 0.875rem;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
}

.pe-bar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 2.125rem;
  padding: 0 0.75rem;
  border: 0;
  border-radius: 0.625rem;
  background: transparent;
  color: #374151;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.pe-bar-btn:hover,
.pe-bar-btn[aria-expanded='true'] {
  background: #f3f4f6;
}

.pe-bar-btn.is-primary {
  background: var(--pe-ink);
  color: #fff;
}

.pe-bar-btn.is-primary:hover {
  background: #1f2937;
}

.pe-bar-icon {
  width: 1rem;
  height: 1rem;
}

.pe-outline-wrap {
  position: relative;
}

.pe-outline {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 40;
  width: min(22rem, 86vw);
  max-height: 20rem;
  overflow-y: auto;
  padding: 0.375rem;
  border: 1px solid var(--pe-line);
  border-radius: 0.875rem;
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14);
}

.pe-outline-empty {
  margin: 0;
  padding: 0.75rem;
  color: var(--pe-muted);
  font-size: 0.8125rem;
}

.pe-outline-item {
  display: grid;
  grid-template-columns: 1.5rem auto 1fr;
  align-items: baseline;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.pe-outline-item:hover {
  background: #f3f4f6;
}

.pe-outline-num {
  color: #9ca3af;
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
}

.pe-outline-label {
  color: var(--pe-ink);
  font-size: 0.75rem;
  font-weight: 700;
}

.pe-outline-summary {
  overflow: hidden;
  color: var(--pe-muted);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pe-importer {
  margin-top: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--pe-line);
  border-radius: 0.875rem;
  background: #f9fafb;
}

/* Canvas ------------------------------------------------------------ */
.pe-canvas {
  max-width: 46rem;
  margin: 0 auto;
  padding: 1.75rem 0.25rem 2rem;
  color: var(--pe-ink);
}

@media (min-width: 768px) {
  .pe-canvas {
    padding: 2rem 2rem 2.5rem;
  }
}

.pe-intro-wrap {
  position: relative;
  margin-bottom: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
}

.pe-intro-wrap :deep(.pe-intro) {
  color: #4b5563;
  font-size: 1.25rem;
  line-height: 1.65;
}

.pe-intro-tag {
  display: block;
  margin-bottom: 0.125rem;
  color: #9ca3af;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.pe-start {
  display: block;
  width: 100%;
  padding: 0.5rem;
  border: 0;
  background: transparent;
  color: #9ca3af;
  font-size: 1.0625rem;
  text-align: left;
  cursor: text;
}

.pe-blocks {
  position: relative;
}

.pe-tail {
  min-height: 4rem;
  cursor: text;
}

.pe-gap {
  position: relative;
  height: 0.5rem;
}

.pe-gap.is-drop::after {
  content: '';
  position: absolute;
  inset: 50% 0 auto;
  height: 3px;
  margin-top: -1.5px;
  border-radius: 2px;
  background: var(--pe-accent);
  box-shadow: 0 0 0 3px rgba(23, 166, 227, 0.18);
  pointer-events: none;
}

.pe-seam {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  margin: -0.75rem 0 0 -0.75rem;
  border: 0;
  border-radius: 999px;
  background: var(--pe-accent);
  color: #fff;
  font-size: 1rem;
  line-height: 1;
  opacity: 0;
  transform: scale(0.8);
  transition: opacity 0.12s, transform 0.12s;
  cursor: pointer;
}

.pe-gap:hover .pe-seam,
.pe-seam:focus-visible {
  opacity: 1;
  transform: scale(1);
}

@media (hover: none) {
  .pe-seam {
    display: none;
  }
}

/* Row ---------------------------------------------------------------- */
.pe-row {
  position: relative;
  padding: 0.125rem 0.5rem;
  border-radius: 0.5rem;
  outline: none;
  transition: box-shadow 0.12s, background-color 0.12s, opacity 0.12s;
}

.pe-row:hover {
  box-shadow: 0 0 0 1px rgba(23, 166, 227, 0.28);
}

.pe-row.is-selected {
  box-shadow: 0 0 0 1.5px var(--pe-accent);
}

.pe-row.is-dragging {
  opacity: 0.4;
}

.pe-row:focus-visible {
  box-shadow: 0 0 0 2px var(--pe-accent);
}

.pe-grip {
  position: absolute;
  top: 0.375rem;
  left: -1.75rem;
  display: none;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.75rem;
  padding: 0;
  border: 0;
  border-radius: 0.375rem;
  background: transparent;
  color: #9ca3af;
  cursor: grab;
}

.pe-grip:hover {
  background: #f3f4f6;
  color: var(--pe-ink);
}

.pe-grip:active {
  cursor: grabbing;
}

@media (min-width: 768px) {
  .pe-grip {
    display: flex;
    opacity: 0;
  }

  .pe-row:hover .pe-grip,
  .pe-row.is-selected .pe-grip {
    opacity: 1;
  }
}

.pe-grip-icon {
  width: 0.6875rem;
  height: 1rem;
  fill: currentColor;
}

/* Block toolbar ------------------------------------------------------- */
.pe-btoolbar {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  z-index: 25;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  max-width: 100%;
  padding: 3px;
  /* Must stay overflow: visible — the type / ⋯ dropdowns are absolutely
     positioned children and would be clipped by any overflow value. */
  overflow: visible;
  border: 1px solid var(--pe-line);
  border-radius: 0.75rem;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
}

.pe-tb-danger:hover:not(:disabled) {
  background: #fef2f2;
  color: #dc2626;
}

.pe-tb {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  min-width: 1.875rem;
  height: 1.875rem;
  padding: 0 0.375rem;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: #374151;
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.pe-tb:hover:not(:disabled) {
  background: #f3f4f6;
}

.pe-tb:disabled {
  opacity: 0.35;
  cursor: default;
}

.pe-tb.is-on {
  background: var(--pe-ink);
  color: #fff;
}

.pe-tb-grip {
  cursor: grab;
  color: #6b7280;
}

.pe-tb-wide {
  padding: 0 0.625rem;
}

.pe-tb-bold {
  font-weight: 800;
}

.pe-tb-italic {
  font-family: Georgia, serif;
  font-style: italic;
}

.pe-tb-icon {
  width: 1rem;
  height: 1rem;
}

.pe-tb-label {
  padding: 0 0.625rem;
  color: #374151;
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
}

.pe-tb-sep {
  flex: none;
  align-self: stretch;
  width: 1px;
  margin: 4px 3px;
  background: var(--pe-line);
}

.pe-caret {
  margin-left: 0.25rem;
  font-size: 0.625rem;
}

.pe-tb-menu {
  position: relative;
  flex: none;
}

.pe-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 40;
  min-width: 11rem;
  margin: 0;
  padding: 0.25rem;
  list-style: none;
  border: 1px solid var(--pe-line);
  border-radius: 0.75rem;
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
}

.pe-dropdown.is-right {
  right: 0;
  left: auto;
}

.pe-dd-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: #374151;
  font-size: 0.8125rem;
  text-align: left;
  cursor: pointer;
}

.pe-dd-item:hover {
  background: #f3f4f6;
}

.pe-dd-item.is-on {
  background: #eaf7fd;
  color: #0b7bab;
  font-weight: 600;
}

.pe-dd-item.is-danger {
  color: #dc2626;
}

.pe-dd-item.is-danger:hover {
  background: #fef2f2;
}

.pe-dd-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.375rem;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 700;
}

/* Typography (what you write is what the page looks like) ------------- */
.pe-row :deep(.pe-paragraph) {
  padding: 0.25rem 0;
  font-size: 1.0625rem;
  line-height: 1.75;
}

.pe-row :deep(.pe-heading) {
  padding: 0.375rem 0 0.125rem;
  color: var(--pe-ink);
  font-weight: 700;
  letter-spacing: -0.015em;
}

.pe-row :deep(.pe-h1) {
  font-size: 2rem;
  line-height: 1.2;
}

.pe-row :deep(.pe-h2) {
  font-size: 1.5rem;
  line-height: 1.3;
}

.pe-row :deep(.pe-h3) {
  font-size: 1.25rem;
  line-height: 1.35;
}

.pe-row.is-quote {
  margin-left: 0.25rem;
  padding-left: 1.125rem;
}

.pe-row.is-quote::before {
  content: '';
  position: absolute;
  top: 0.5rem;
  bottom: 0.5rem;
  left: 0.5rem;
  width: 3px;
  border-radius: 2px;
  background: var(--pe-accent);
}

.pe-row :deep(.pe-quote-text) {
  padding: 0.25rem 0;
  color: #374151;
  font-size: 1.1875rem;
  font-style: italic;
  line-height: 1.65;
}

.pe-cite {
  display: block;
  width: 100%;
  padding: 0.125rem 0 0.375rem;
  border: 0;
  background: transparent;
  color: var(--pe-muted);
  font-size: 0.8125rem;
  outline: none;
}

.pe-cite::placeholder {
  color: #c3c8d0;
}

.pe-list {
  margin: 0;
  padding: 0.25rem 0 0.25rem 1.5rem;
}

.pe-list li {
  padding-left: 0.25rem;
}

.pe-list li::marker {
  color: var(--pe-accent);
  font-weight: 700;
}

ul.pe-list {
  list-style: disc;
}

ol.pe-list {
  list-style: decimal;
}

.pe-row :deep(.pe-list-text) {
  padding: 0.125rem 0;
  font-size: 1.0625rem;
  line-height: 1.7;
}

.pe-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem 0;
}

.pe-divider span {
  display: block;
  width: 6rem;
  height: 2px;
  border-radius: 2px;
  background: #d1d5db;
}

/* Gallery -------------------------------------------------------------- */
.pe-gallery {
  padding: 0.25rem 0;
}

.pe-gallery-row {
  display: flex;
  gap: 0.875rem;
  padding: 0.25rem 0 0.5rem;
  overflow-x: auto;
  scroll-snap-type: x proximity;
}

.pe-tile-wrap {
  position: relative;
  flex: none;
  width: 15rem;
  scroll-snap-align: start;
}

.pe-tile-wrap.is-drop-before::before,
.pe-tile-wrap.is-drop-after::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 6;
  width: 3px;
  border-radius: 2px;
  background: var(--pe-accent);
}

.pe-tile-wrap.is-drop-before::before {
  left: -0.5rem;
}

.pe-tile-wrap.is-drop-after::after {
  right: -0.5rem;
}

.pe-tile-grip {
  position: absolute;
  top: 0.5rem;
  left: 2.25rem;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.5rem;
  padding: 0;
  border: 0;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.18);
  color: #6b7280;
  cursor: grab;
  opacity: 0;
  transition: opacity 0.15s;
}

.pe-tile-wrap:hover .pe-tile-grip,
.pe-tile-wrap:focus-within .pe-tile-grip {
  opacity: 1;
}

@media (hover: none) {
  .pe-tile-grip {
    display: none;
  }
}

.pe-tile-add {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  align-self: flex-start;
  width: 10rem;
  height: 10.5rem;
  border: 1.5px dashed #d1d5db;
  border-radius: 0.75rem;
  background: transparent;
  color: var(--pe-muted);
  font-size: 0.8125rem;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
}

.pe-tile-add:hover {
  border-color: var(--pe-accent);
  color: var(--pe-accent);
}

.pe-tile-plus {
  font-size: 1.5rem;
  line-height: 1;
}

.pe-hint {
  margin: 0.25rem 0 0;
  color: #9ca3af;
  font-size: 0.75rem;
}

/* Menus & toast (teleported) -------------------------------------------- */
.pe-menu {
  position: fixed;
  z-index: 95;
  max-height: min(22.5rem, 60vh);
  overflow-y: auto;
  padding: 0.375rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.875rem;
  background: #fff;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.2);
}

.pe-menu-search {
  display: block;
  width: 100%;
  margin-bottom: 0.25rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.625rem;
  color: #111827;
  font-size: 0.8125rem;
  outline: none;
}

.pe-menu-search:focus {
  border-color: #17a6e3;
  box-shadow: 0 0 0 3px rgba(23, 166, 227, 0.15);
}

.pe-menu-title {
  margin: 0;
  padding: 0.375rem 0.625rem 0.25rem;
  color: #9ca3af;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.pe-menu-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.pe-menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: 0;
  border-radius: 0.625rem;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.pe-menu-item.is-active {
  background: #eaf7fd;
}

.pe-menu-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: #f3f4f6;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 700;
}

.pe-menu-item.is-active .pe-menu-icon {
  background: #17a6e3;
  color: #fff;
}

.pe-menu-text {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.pe-menu-text strong {
  color: #111827;
  font-size: 0.8125rem;
  font-weight: 600;
}

.pe-menu-text small {
  overflow: hidden;
  color: #6b7280;
  font-size: 0.6875rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pe-menu-empty {
  padding: 0.75rem;
  color: #6b7280;
  font-size: 0.8125rem;
}

.pe-toast {
  position: fixed;
  bottom: 1.25rem;
  left: 50%;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.625rem 0.75rem 0.625rem 1rem;
  border-radius: 0.75rem;
  background: #111827;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.3);
  color: #fff;
  font-size: 0.8125rem;
  transform: translateX(-50%);
}

.pe-toast button {
  padding: 0.25rem 0.625rem;
  border: 0;
  border-radius: 0.5rem;
  background: #17a6e3;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .pe-row,
  .pe-seam {
    transition: none;
  }
}
</style>