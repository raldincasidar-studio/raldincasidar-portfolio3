<script setup>
import { ref } from 'vue'
const toasts = ref([])
let id = 0
function push(message, type = 'success') {
  const toast = { id: ++id, message, type }
  toasts.value.push(toast)
  setTimeout(() => remove(toast.id), type === 'error' ? 7000 : 4000)
}
function remove(toastId) { toasts.value = toasts.value.filter((toast) => toast.id !== toastId) }
defineExpose({ push })
</script>
<template>
  <div class="fixed right-4 top-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-3" aria-live="polite">
    <div v-for="toast in toasts" :key="toast.id" class="flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl" :class="toast.type === 'error' ? 'border-red-200' : 'border-cyan-200'">
      <span class="mt-1 size-2 rounded-full" :class="toast.type === 'error' ? 'bg-red-500' : 'bg-[#17A6E3]'" />
      <p class="flex-1 text-sm text-gray-800">{{ toast.message }}</p>
      <button class="text-gray-400" aria-label="Dismiss notification" @click="remove(toast.id)">×</button>
    </div>
  </div>
</template>
