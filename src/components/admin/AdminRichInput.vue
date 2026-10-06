<script setup>
import { nextTick, ref } from 'vue'
import { applyInlineFormat } from '@/utils/richText.js'

/**
 * AdminRichInput — text field for post content with a small formatting
 * toolbar (bold, italic, link, code, strikethrough). Buttons wrap the current
 * selection in Markdown, which is what the public renderer understands.
 */
const props = defineProps({
  modelValue: { type: String, default: '' },
  multiline: { type: Boolean, default: true },
  rows: { type: Number, default: 4 },
  placeholder: { type: String, default: '' },
  /** Hides the toolbar hint on very small screens. */
  hint: { type: String, default: 'Markdown: **bold** · *italic* · [link](url) · `code`' },
})
const emit = defineEmits(['update:modelValue'])

const field = ref(null)
const formats = [
  { kind: 'bold', label: 'Bold', glyph: 'B', className: 'font-bold' },
  { kind: 'italic', label: 'Italic', glyph: 'I', className: 'italic' },
  { kind: 'strike', label: 'Strikethrough', glyph: 'S', className: 'line-through' },
  { kind: 'code', label: 'Inline code', glyph: '</>', className: 'font-mono text-[10px]' },
  { kind: 'link', label: 'Insert link', glyph: '↗', className: '' },
]

function onInput(event) {
  emit('update:modelValue', event.target.value)
}

function apply(kind) {
  const element = field.value
  if (!element) return
  const result = applyInlineFormat(props.modelValue, element.selectionStart, element.selectionEnd, kind)
  emit('update:modelValue', result.value)
  nextTick(() => {
    element.focus()
    try {
      element.setSelectionRange(result.selectionStart, result.selectionEnd)
    } catch {
      /* some input types do not support selection ranges */
    }
  })
}
</script>

<template>
  <div class="admin-rich">
    <div class="admin-rich-toolbar">
      <button
        v-for="format in formats"
        :key="format.kind"
        type="button"
        class="admin-rich-button"
        :class="format.className"
        :title="format.label"
        :aria-label="format.label"
        @mousedown.prevent
        @click="apply(format.kind)"
      >
        {{ format.glyph }}
      </button>
      <span class="admin-rich-hint">{{ hint }}</span>
    </div>
    <textarea
      v-if="multiline"
      ref="field"
      class="admin-rich-field"
      :rows="rows"
      :value="modelValue"
      :placeholder="placeholder"
      @input="onInput"
    />
    <input
      v-else
      ref="field"
      type="text"
      class="admin-rich-field"
      :value="modelValue"
      :placeholder="placeholder"
      @input="onInput"
    />
  </div>
</template>
