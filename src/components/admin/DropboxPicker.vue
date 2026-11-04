<script setup>
import { nextTick, onBeforeUnmount, ref } from 'vue'
import DropboxMediaLibrary from './DropboxMediaLibrary.vue'
defineProps({ mediaType: { type: String, default: 'image' } })
const emit = defineEmits(['select'])
const dialog = ref(null), trigger = ref(null), opened = ref(false)
function open() { opened.value = true; dialog.value?.showModal() }
function close() { dialog.value?.close(); nextTick(() => trigger.value?.focus()) }
function select(url) { emit('select', url); close() }
onBeforeUnmount(() => dialog.value?.close())
</script>
<template>
  <button ref="trigger" type="button" class="mt-2 text-xs font-semibold text-[#17A6E3] hover:underline" @click="open">Choose or upload from Dropbox</button>
  <dialog ref="dialog" aria-labelledby="dropbox-picker-title" class="m-auto max-h-[90vh] w-[min(95vw,760px)] overflow-y-auto rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl backdrop:bg-black/60 sm:p-7" @close="opened = false; trigger?.focus()">
    <div class="mb-5 flex items-center justify-between gap-4"><div><p class="admin-eyebrow">Media library</p><h2 id="dropbox-picker-title" class="admin-section-title">Choose {{ mediaType === 'video' ? 'a video' : 'an image' }}</h2></div><button type="button" class="admin-button-secondary" @click="close">Close</button></div>
    <DropboxMediaLibrary v-if="opened" picker :media-type="mediaType" @select="select" />
  </dialog>
</template>
