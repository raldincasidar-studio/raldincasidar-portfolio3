<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

/**
 * AdminRichInput — inline WYSIWYG text field.
 *
 * It is the editing primitive behind AdminPostEditor, but it also works on its
 * own as a drop-in replacement for the old textarea version (same
 * `modelValue` / `multiline` / `rows` / `placeholder` / `hint` props).
 *
 * The value stays a plain Markdown string (**bold**, *italic*, ~~strike~~,
 * `code`, [link](url)) so the public renderer and saved data don't change.
 * While editing, the Markdown is shown as real formatting; controls appear in a
 * floating toolbar only when text is selected (or via Ctrl/Cmd + B / I / K).
 *
 * Block-editor hooks (only active when `splitOnEnter` is set):
 *   @split            Enter pressed → { before, after } Markdown halves
 *   @backspace-start  Backspace with the caret at the very start
 *   @navigate         ArrowUp/Down on the first/last line → ('prev' | 'next', event)
 *   @paste-blocks     multi-line paste → payload { text, handled }
 *   @keydown          raw keydown, call preventDefault() to take over a key
 */
const props = defineProps({
  modelValue: { type: String, default: '' },
  multiline: { type: Boolean, default: true },
  rows: { type: Number, default: 4 },
  placeholder: { type: String, default: '' },
  /** Small helper line under the field (standalone mode only). */
  hint: { type: String, default: 'Select text to format · Ctrl/⌘ + B, I, K' },
  /** Borderless, chrome-free mode used inside the block editor canvas. */
  bare: { type: Boolean, default: false },
  splitOnEnter: { type: Boolean, default: false },
  /** Classes applied to the editable element itself (typography etc.). */
  fieldClass: { type: [String, Array, Object], default: '' },
  label: { type: String, default: '' },
})
const emit = defineEmits([
  'update:modelValue',
  'split',
  'backspace-start',
  'navigate',
  'paste-blocks',
  'keydown',
  'focus',
  'blur',
])

const FORMATS = [
  { kind: 'bold', label: 'Bold (Ctrl+B)', glyph: 'B', className: 'is-bold' },
  { kind: 'italic', label: 'Italic (Ctrl+I)', glyph: 'I', className: 'is-italic' },
  { kind: 'strike', label: 'Strikethrough', glyph: 'S', className: 'is-strike' },
  { kind: 'code', label: 'Inline code', glyph: '</>', className: 'is-code' },
  { kind: 'link', label: 'Link (Ctrl+K)', glyph: '', className: '' },
]

const root = ref(null)
const linkInput = ref(null)
const focused = ref(false)
const active = reactive({ bold: false, italic: false, strike: false, code: false, link: false })
const bar = reactive({ visible: false, top: 0, left: 0, below: false, linking: false, url: '', hadLink: false })

let lastEmitted = ''
let savedRange = null
let selecting = false

/* ------------------------------------------------------------------ */
/* Markdown  <->  HTML (inline only)                                    */
/* ------------------------------------------------------------------ */

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/|#)/i

function mdToHtml(md) {
  const stash = []
  const keep = (html) => `\u0000${stash.push(html) - 1}\u0000`
  let out = String(md ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  out = out.replace(/`([^`\n]+)`/g, (_, code) => keep(`<code>${code}</code>`))
  out = out.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, label, url) =>
    SAFE_URL.test(url) ? `<a href="${url.replace(/"/g, '&quot;')}">${label}</a>` : match,
  )
  out = out.replace(/\*\*(?!\s)(.+?)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^\w])__(?!\s)(.+?)__(?!\w)/g, '$1<strong>$2</strong>')
  out = out.replace(/\*(?!\s)([^*\n]*[^*\s\n])\*/g, '<em>$1</em>')
  out = out.replace(/(^|[^\w])_(?!\s)([^_\n]*[^_\s\n])_(?!\w)/g, '$1<em>$2</em>')
  out = out.replace(/~~(?!\s)(.+?)~~/g, '<s>$1</s>')
  out = out.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[Number(i)])
  return out.replace(/\n/g, '<br>')
}

function wrapMark(mark, inner) {
  if (!inner.trim()) return inner
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner)
  return m[1] + mark + m[2] + mark + m[3]
}

function nodeToMd(parent) {
  let out = ''
  for (const child of parent.childNodes) {
    if (child.nodeType === 3) {
      out += child.nodeValue.replace(/\u00a0/g, ' ').replace(/[\u200b\ufeff]/g, '')
      continue
    }
    if (child.nodeType !== 1) continue
    const tag = child.tagName
    if (tag === 'BR') {
      out += '\n'
      continue
    }
    let inner = nodeToMd(child)
    const style = child.style || {}
    const weight = String(style.fontWeight || '')
    const deco = String(style.textDecorationLine || style.textDecoration || '')
    if (tag === 'STRONG' || tag === 'B' || weight === 'bold' || /^[6-9]00$/.test(weight)) inner = wrapMark('**', inner)
    if (tag === 'EM' || tag === 'I' || style.fontStyle === 'italic') inner = wrapMark('*', inner)
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || /line-through/.test(deco)) inner = wrapMark('~~', inner)
    if (tag === 'CODE') inner = wrapMark('`', inner)
    if (tag === 'A' && child.getAttribute('href') && inner.trim()) {
      const href = child.getAttribute('href').replace(/ /g, '%20').replace(/\)/g, '%29')
      inner = `[${inner}](${href})`
    }
    if ((tag === 'DIV' || tag === 'P') && out && !out.endsWith('\n')) out += '\n'
    out += inner
  }
  return out
}

const toMd = (node) => nodeToMd(node).replace(/\n+$/, '')

function renderValue(md) {
  if (root.value) root.value.innerHTML = mdToHtml(md)
}

function syncFromDom() {
  const el = root.value
  if (!el) return
  if (el.textContent === '' && el.innerHTML !== '') el.innerHTML = ''
  const md = toMd(el)
  if (md === lastEmitted) return
  lastEmitted = md
  emit('update:modelValue', md)
}

/* ------------------------------------------------------------------ */
/* Caret helpers                                                        */
/* ------------------------------------------------------------------ */

function selectionInside() {
  const sel = window.getSelection()
  const el = root.value
  if (!sel || !sel.rangeCount || !el || !el.contains(sel.anchorNode)) return null
  return sel
}

function fragmentMd(range) {
  const holder = document.createElement('div')
  holder.appendChild(range.cloneContents())
  return nodeToMd(holder)
}

function caretAtStart() {
  const sel = selectionInside()
  if (!sel || !sel.isCollapsed) return false
  const r = document.createRange()
  r.selectNodeContents(root.value)
  r.setEnd(sel.anchorNode, sel.anchorOffset)
  return fragmentMd(r) === ''
}

function caretAtEnd() {
  const sel = selectionInside()
  if (!sel || !sel.isCollapsed) return false
  const r = document.createRange()
  r.selectNodeContents(root.value)
  r.setStart(sel.anchorNode, sel.anchorOffset)
  return fragmentMd(r).replace(/\n+$/, '') === ''
}

/** Is the caret on the first / last visual line? (falls back to start/end). */
function caretEdge() {
  const sel = selectionInside()
  if (!sel || !sel.isCollapsed) return { first: false, last: false }
  const rect = sel.getRangeAt(0).getClientRects()[0]
  if (!rect || (!rect.height && !rect.top)) return { first: caretAtStart(), last: caretAtEnd() }
  const box = root.value.getBoundingClientRect()
  const lh = parseFloat(window.getComputedStyle(root.value).lineHeight) || rect.height || 20
  return {
    first: rect.top - box.top < lh * 0.6,
    last: box.bottom - rect.bottom < lh * 0.6,
  }
}

function splitAtCaret() {
  const sel = selectionInside()
  if (!sel) return null
  const range = sel.getRangeAt(0)
  if (!range.collapsed) range.deleteContents()
  const before = document.createRange()
  before.selectNodeContents(root.value)
  before.setEnd(range.startContainer, range.startOffset)
  const after = document.createRange()
  after.selectNodeContents(root.value)
  after.setStart(range.startContainer, range.startOffset)
  const strip = (md) => md.replace(/\n+$/, '')
  return { before: strip(fragmentMd(before)), after: strip(fragmentMd(after)) }
}

function setRangeAtTextOffset(range, el, offset) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let remaining = offset
  let node = walker.nextNode()
  while (node) {
    const len = node.nodeValue.length
    if (remaining <= len) {
      range.setStart(node, remaining)
      range.collapse(true)
      return
    }
    remaining -= len
    node = walker.nextNode()
  }
  range.selectNodeContents(el)
  range.collapse(false)
}

/** pos: 'start' | 'end' | number (plain-text character offset). */
function focus(pos = 'end') {
  const el = root.value
  if (!el) return
  el.focus()
  const sel = window.getSelection()
  const range = document.createRange()
  if (typeof pos === 'number') setRangeAtTextOffset(range, el, pos)
  else {
    range.selectNodeContents(el)
    range.collapse(pos === 'start')
  }
  sel.removeAllRanges()
  sel.addRange(range)
}

function closestIn(node, tag) {
  let el = node && node.nodeType === 3 ? node.parentElement : node
  while (el && el !== root.value) {
    if (el.tagName === tag) return el
    el = el.parentElement
  }
  return null
}

/* ------------------------------------------------------------------ */
/* Formatting                                                           */
/* ------------------------------------------------------------------ */

function toggleCode() {
  const sel = selectionInside()
  if (!sel) return
  const range = sel.getRangeAt(0)
  const existing = closestIn(range.commonAncestorContainer, 'CODE')
  if (existing) {
    const parent = existing.parentNode
    while (existing.firstChild) parent.insertBefore(existing.firstChild, existing)
    parent.removeChild(existing)
    parent.normalize()
    return
  }
  if (range.collapsed) return
  const code = document.createElement('code')
  code.appendChild(range.extractContents())
  range.insertNode(code)
  sel.removeAllRanges()
  const next = document.createRange()
  next.selectNodeContents(code)
  sel.addRange(next)
}

function format(kind) {
  const el = root.value
  if (!el) return
  if (document.activeElement !== el) el.focus()
  if (kind === 'link') return startLink()
  try {
    document.execCommand('styleWithCSS', false, false)
  } catch {
    /* not supported — harmless */
  }
  if (kind === 'code') toggleCode()
  else document.execCommand(kind === 'strike' ? 'strikeThrough' : kind)
  syncFromDom()
  updateActive()
}

function startLink() {
  const sel = selectionInside()
  if (!sel) return
  const anchor = closestIn(sel.anchorNode, 'A')
  if (sel.isCollapsed && !anchor) return
  savedRange = sel.getRangeAt(0).cloneRange()
  bar.url = anchor ? anchor.getAttribute('href') || '' : ''
  bar.hadLink = !!anchor
  bar.linking = true
  bar.visible = true
  placeBar(savedRange.getBoundingClientRect())
  nextTick(() => linkInput.value && linkInput.value.focus())
}

function restoreRange() {
  const el = root.value
  if (!el || !savedRange) return
  el.focus()
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(savedRange)
}

function applyLink() {
  let url = bar.url.trim()
  restoreRange()
  if (!url) {
    document.execCommand('unlink')
  } else {
    if (!/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(url)) url = `https://${url}`
    if (!SAFE_URL.test(url)) return cancelLink()
    document.execCommand('createLink', false, url)
  }
  closeBar()
  syncFromDom()
}

function removeLink() {
  bar.url = ''
  applyLink()
}

function cancelLink() {
  restoreRange()
  closeBar()
}

function closeBar() {
  bar.linking = false
  bar.visible = false
  savedRange = null
}

function updateActive() {
  const sel = selectionInside()
  const state = (cmd) => {
    try {
      return document.queryCommandState(cmd)
    } catch {
      return false
    }
  }
  active.bold = state('bold')
  active.italic = state('italic')
  active.strike = state('strikeThrough')
  active.code = !!(sel && closestIn(sel.anchorNode, 'CODE'))
  active.link = !!(sel && closestIn(sel.anchorNode, 'A'))
}

function placeBar(rect) {
  const half = 110
  bar.left = Math.min(Math.max(rect.left + rect.width / 2, half + 8), Math.max(window.innerWidth - half - 8, half + 8))
  bar.below = rect.top <= 56
  bar.top = bar.below ? rect.bottom + 8 : rect.top - 8
}

function onSelectionChange() {
  const el = root.value
  if (!el || bar.linking || selecting) return
  const sel = window.getSelection()
  if (
    !sel || !sel.rangeCount || sel.isCollapsed ||
    !el.contains(sel.anchorNode) || !el.contains(sel.focusNode) ||
    !sel.toString().trim()
  ) {
    bar.visible = false
    return
  }
  const rect = sel.getRangeAt(0).getBoundingClientRect()
  if (!rect.width && !rect.height) {
    bar.visible = false
    return
  }
  placeBar(rect)
  updateActive()
  bar.visible = true
}

function onDocMouseUp() {
  if (!selecting) return
  selecting = false
  setTimeout(onSelectionChange, 0)
}

function onViewportChange() {
  if (bar.visible && !bar.linking) onSelectionChange()
}

/* Live Markdown typing: `**bold**`, `*italic*`, `~~strike~~`, `code`. */
function autoMark() {
  const sel = selectionInside()
  if (!sel || !sel.isCollapsed || !sel.anchorNode || sel.anchorNode.nodeType !== 3) return false
  const node = sel.anchorNode
  if (closestIn(node, 'CODE')) return false
  const before = node.nodeValue.slice(0, sel.anchorOffset)
  const m = /(\*\*|~~|`|\*)(?=\S)([^*`~]*?\S)\1$/.exec(before)
  if (!m) return false
  if (m[1] === '*' && before[m.index - 1] === '*') return false
  const tags = { '**': 'strong', '*': 'em', '~~': 's', '`': 'code' }
  const range = document.createRange()
  range.setStart(node, m.index)
  range.setEnd(node, sel.anchorOffset)
  range.deleteContents()
  const el = document.createElement(tags[m[1]])
  el.textContent = m[2]
  range.insertNode(el)
  const tail = document.createTextNode('\u200b')
  el.after(tail)
  const caret = document.createRange()
  caret.setStart(tail, 1)
  caret.collapse(true)
  sel.removeAllRanges()
  sel.addRange(caret)
  return true
}

/* ------------------------------------------------------------------ */
/* Events                                                               */
/* ------------------------------------------------------------------ */

function onInput(event) {
  if (event && event.inputType === 'insertText' && ['*', '~', '`'].includes(event.data)) autoMark()
  syncFromDom()
}

function insertPlain(text) {
  let value = text
  if (!props.multiline) value = value.replace(/\s*\n\s*/g, ' ')
  value.split('\n').forEach((line, i) => {
    if (i) document.execCommand('insertLineBreak')
    if (line) document.execCommand('insertText', false, line)
  })
  syncFromDom()
}

function onPaste(event) {
  event.preventDefault()
  const data = event.clipboardData || window.clipboardData
  const text = ((data && data.getData('text/plain')) || '').replace(/\r\n?/g, '\n')
  if (!text) return
  if (props.splitOnEnter && /\n/.test(text.trim())) {
    const payload = { text, handled: false }
    emit('paste-blocks', payload)
    if (payload.handled) return
  }
  insertPlain(text)
}

function onKeydown(event) {
  if (event.isComposing) return
  emit('keydown', event)
  if (event.defaultPrevented) return

  const mod = event.metaKey || event.ctrlKey
  if (mod && !event.shiftKey && !event.altKey) {
    const key = event.key.toLowerCase()
    if (key === 'b' || key === 'i' || key === 'k') {
      event.preventDefault()
      format(key === 'b' ? 'bold' : key === 'i' ? 'italic' : 'link')
      return
    }
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    if (event.shiftKey && props.multiline) {
      document.execCommand('insertLineBreak')
      syncFromDom()
      return
    }
    if (props.splitOnEnter) {
      const parts = splitAtCaret()
      if (parts) emit('split', parts)
      return
    }
    if (props.multiline) {
      document.execCommand('insertLineBreak')
      syncFromDom()
    }
    return
  }

  if (event.key === 'Backspace' && props.splitOnEnter && caretAtStart()) {
    emit('backspace-start', event)
    return
  }

  if (props.splitOnEnter && !event.shiftKey && !event.altKey && !mod) {
    if (event.key === 'ArrowUp' && caretEdge().first) emit('navigate', 'prev', event)
    else if (event.key === 'ArrowDown' && caretEdge().last) emit('navigate', 'next', event)
  }
}

function onFocus(event) {
  focused.value = true
  emit('focus', event)
}

function onBlur(event) {
  focused.value = false
  if (!bar.linking) bar.visible = false
  emit('blur', event)
}

function onFormatEvent(event) {
  format(event.detail)
}

function onMouseDown() {
  selecting = true
}

watch(
  () => props.modelValue,
  (value) => {
    const next = value ?? ''
    if (next === lastEmitted) return
    lastEmitted = next
    renderValue(next)
  },
)

onMounted(() => {
  lastEmitted = props.modelValue ?? ''
  renderValue(lastEmitted)
  root.value.addEventListener('pe-format', onFormatEvent)
  document.addEventListener('selectionchange', onSelectionChange)
  document.addEventListener('mouseup', onDocMouseUp)
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('resize', onViewportChange)
})

onBeforeUnmount(() => {
  if (root.value) root.value.removeEventListener('pe-format', onFormatEvent)
  document.removeEventListener('selectionchange', onSelectionChange)
  document.removeEventListener('mouseup', onDocMouseUp)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
})

const minHeightStyle = computed(() =>
  !props.bare && props.multiline && props.rows > 0 ? { minHeight: `${props.rows * 1.6 + 1.5}em` } : null,
)

defineExpose({ focus, el: root })
</script>

<template>
  <div class="pe-rich" :class="{ 'is-bare': bare, 'is-focused': focused }">
    <div
      ref="root"
      class="pe-rich-field"
      :class="fieldClass"
      contenteditable="true"
      role="textbox"
      spellcheck="true"
      :aria-multiline="multiline"
      :aria-label="label || placeholder || 'Text'"
      :data-placeholder="placeholder"
      :style="minHeightStyle"
      @input="onInput"
      @keydown="onKeydown"
      @paste="onPaste"
      @focus="onFocus"
      @blur="onBlur"
      @mousedown="onMouseDown"
    />
    <p v-if="!bare && hint" class="pe-rich-hint">{{ hint }}</p>

    <Teleport to="body">
      <div
        v-if="bar.visible"
        class="pe-sel-bar"
        :class="{ 'is-below': bar.below }"
        data-pe-ui
        role="toolbar"
        aria-label="Text formatting"
        :style="{ top: bar.top + 'px', left: bar.left + 'px' }"
      >
        <template v-if="!bar.linking">
          <button
            v-for="f in FORMATS"
            :key="f.kind"
            type="button"
            class="pe-sel-btn"
            :class="[f.className, { 'is-on': active[f.kind] }]"
            :title="f.label"
            :aria-label="f.label"
            :aria-pressed="!!active[f.kind]"
            @mousedown.prevent
            @click="format(f.kind)"
          >
            <svg v-if="f.kind === 'link'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="pe-sel-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
            <template v-else>{{ f.glyph }}</template>
          </button>
        </template>
        <form v-else class="pe-link-form" @submit.prevent="applyLink">
          <input
            ref="linkInput"
            v-model="bar.url"
            type="text"
            class="pe-link-input"
            placeholder="Paste or type a link"
            aria-label="Link URL"
            @keydown.esc.prevent="cancelLink"
          />
          <button type="submit" class="pe-link-apply">Apply</button>
          <button v-if="bar.hadLink" type="button" class="pe-link-remove" @click="removeLink">Remove</button>
        </form>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.pe-rich {
  position: relative;
}

.pe-rich-field {
  outline: none;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  min-height: 1.6em;
  caret-color: #17a6e3;
}

.pe-rich-field:empty::before {
  content: attr(data-placeholder);
  color: #9ca3af;
  pointer-events: none;
}

.pe-rich-field :deep(strong),
.pe-rich-field :deep(b) {
  font-weight: 700;
}

.pe-rich-field :deep(em),
.pe-rich-field :deep(i) {
  font-style: italic;
}

.pe-rich-field :deep(s),
.pe-rich-field :deep(strike),
.pe-rich-field :deep(del) {
  text-decoration: line-through;
}

.pe-rich-field :deep(code) {
  padding: 0.1em 0.35em;
  border-radius: 0.3rem;
  background: #f3f4f6;
  color: #be185d;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.88em;
}

.pe-rich-field :deep(a) {
  color: #17a6e3;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: text;
}

/* Standalone (non-bare) look: behaves like a normal admin input. */
.pe-rich:not(.is-bare) .pe-rich-field {
  padding: 0.625rem 0.875rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #fff;
  color: #111827;
  font-size: 0.875rem;
  line-height: 1.6;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.pe-rich:not(.is-bare).is-focused .pe-rich-field {
  border-color: #17a6e3;
  box-shadow: 0 0 0 3px rgba(23, 166, 227, 0.15);
}

.pe-rich-hint {
  margin: 0.375rem 0 0;
  font-size: 0.6875rem;
  color: #9ca3af;
  opacity: 0;
  transition: opacity 0.15s;
}

.pe-rich.is-focused .pe-rich-hint {
  opacity: 1;
}

/* Floating selection toolbar */
.pe-sel-bar {
  position: fixed;
  z-index: 90;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: 0.625rem;
  background: #111827;
  box-shadow: 0 8px 24px rgba(17, 24, 39, 0.28);
  transform: translate(-50%, -100%);
  animation: pe-pop 0.12s ease-out;
}

.pe-sel-bar.is-below {
  transform: translate(-50%, 0);
}

.pe-sel-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  padding: 0 0.5rem;
  border: 0;
  border-radius: 0.4rem;
  background: transparent;
  color: #e5e7eb;
  font-size: 0.8125rem;
  cursor: pointer;
}

.pe-sel-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.pe-sel-btn.is-on {
  background: #17a6e3;
  color: #fff;
}

.pe-sel-btn.is-bold {
  font-weight: 800;
}

.pe-sel-btn.is-italic {
  font-style: italic;
  font-family: Georgia, serif;
}

.pe-sel-btn.is-strike {
  text-decoration: line-through;
}

.pe-sel-btn.is-code {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 0.6875rem;
}

.pe-sel-icon {
  width: 1rem;
  height: 1rem;
}

.pe-link-form {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pe-link-input {
  width: min(15rem, 62vw);
  height: 2rem;
  padding: 0 0.625rem;
  border: 0;
  border-radius: 0.4rem;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 0.8125rem;
  outline: none;
}

.pe-link-input::placeholder {
  color: #9ca3af;
}

.pe-link-apply,
.pe-link-remove {
  height: 2rem;
  padding: 0 0.625rem;
  border: 0;
  border-radius: 0.4rem;
  background: #17a6e3;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.pe-link-remove {
  background: rgba(255, 255, 255, 0.12);
  color: #fecaca;
}

@keyframes pe-pop {
  from {
    opacity: 0;
    margin-top: 3px;
  }
  to {
    opacity: 1;
    margin-top: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pe-sel-bar {
    animation: none;
  }
}
</style>