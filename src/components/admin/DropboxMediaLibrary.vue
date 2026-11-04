<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { dropboxApi } from '@/api/dropbox.js'
const props = defineProps({ picker: Boolean, mediaType: { type: String, default: 'image' } })
const emit = defineEmits(['select'])
const path = ref(''), entries = ref([]), cursor = ref(null), loading = ref(false), error = ref(''), notice = ref(''), usage = ref(null), connected = ref(false), input = ref(null)
const imagePattern = /\.(jpe?g|png|gif|webp)$/i, videoPattern = /\.(mp4|webm)$/i
const allowed = /\.(jpe?g|png|gif|webp|mp4|webm)$/i
const previewDialog = ref(null), previewIndex = ref(0), previewTrigger = ref(null), failedThumbs = ref({}), failedFull = ref({})
const previewItems = computed(() => entries.value.filter(item => item.type === 'file' && allowed.test(item.name)))
const previewItem = computed(() => previewItems.value[previewIndex.value])
const selectable = item => (props.mediaType === 'video' ? videoPattern : imagePattern).test(item.name)
const previewUrl = (item, full = false) => `${import.meta.env.VITE_API_BASE_URL || '/api'}/admin/dropbox/preview?id=${encodeURIComponent(item.id)}${full ? '&full=1' : ''}&rev=${encodeURIComponent(item.rev || '')}`
function openPreview(item, event) { previewIndex.value = previewItems.value.findIndex(entry => entry.id === item.id); previewTrigger.value = event.currentTarget; previewDialog.value?.showModal() }
function closePreview() { previewDialog.value?.close() }
function restoreFocus() { nextTick(() => previewTrigger.value?.focus()) }
function movePreview(step) { previewIndex.value = (previewIndex.value + step + previewItems.value.length) % previewItems.value.length }

function bytes(n) { if (n == null) return 'Unknown'; const units = ['B','KB','MB','GB','TB']; let i = 0; while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ } return `${n.toFixed(i ? 1 : 0)} ${units[i]}` }
async function load(folder = path.value) { if (loading.value) return; loading.value = true; error.value = ''; try { const result = await dropboxApi.list(folder); path.value = folder; entries.value = result.data.entries; cursor.value = result.data.cursor } catch(e) { error.value = e.message } finally { loading.value = false } }
async function more() { if (loading.value || !cursor.value) return; loading.value = true; try { const result = await dropboxApi.more(cursor.value); entries.value.push(...result.data.entries); cursor.value = result.data.cursor } catch(e) { error.value = e.message } finally { loading.value = false } }
async function refreshUsage() { try { usage.value = (await dropboxApi.usage()).data } catch (e) { error.value = e.message } }
async function upload(event) {
  const file = event.target.files?.[0]; event.target.value = ''
  if (!file) return
  if (file.size > 4 * 1024 * 1024 || !allowed.test(file.name)) { error.value = 'Choose a JPEG, PNG, GIF, WebP, MP4 or WebM file up to 4 MB.'; return }
  loading.value = true; error.value = ''; notice.value = ''
  try {
    const result = await dropboxApi.upload(path.value, file)
    notice.value = result.data?.path
      ? `Uploaded ${result.data.path} (${bytes(result.data.size)}).`
      : 'Upload completed, but file details were unavailable. Check the library before retrying.'
    loading.value = false; await load(); await refreshUsage()
  } catch (e) {
    error.value = `${e.message} Check the library before retrying; Dropbox may have received the file.`
    loading.value = false
    // A network failure can happen after Dropbox has already accepted the upload.
    // Refresh without automatically repeating the potentially successful write.
    const uploadError = error.value
    await load()
    if (!error.value) error.value = uploadError
  } finally { loading.value = false }
}
async function share(item) { if (!window.confirm(`Make or reuse a public link for ${item.path}? Anyone with the link can view this file, even if content is still a draft.`)) return; loading.value = true; error.value = ''; try { const r = await dropboxApi.link(item.id); if (props.picker) emit('select', r.data.url); else { try { await navigator.clipboard.writeText(r.data.url); notice.value = `Public link copied for ${item.path}.` } catch { notice.value = `Public link: ${r.data.url}` } } } catch(e) { error.value = e.message } finally { loading.value = false } }
async function remove(item) { if (!window.confirm(`Delete ${item.path}? Published content using this file may break. Dropbox deletion is recoverable for a limited time depending on your account. Confirm deletion?`)) return; loading.value = true; error.value = ''; try { const r = await dropboxApi.remove(item); notice.value = `Deleted ${r.data.path}. Recovery may be available in Dropbox history.`; loading.value = false; await load(); await refreshUsage() } catch(e) { error.value = e.message } finally { loading.value = false } }
function up() { load(path.value.slice(0, path.value.lastIndexOf('/'))) }
onMounted(async () => { try { connected.value = (await dropboxApi.connection()).data.connected; if (connected.value) { await load(''); await refreshUsage() } } catch(e) { error.value = e.message } })
</script>
<template>
  <div class="min-w-0">
    <p v-if="error" role="alert" class="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p><p v-if="notice" role="status" class="mb-4 break-all rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">{{ notice }}</p>
    <div v-if="!connected && !error" class="rounded-2xl bg-gray-50 p-5 text-sm text-gray-500">Connect Dropbox in <router-link to="/admin/settings" class="font-bold text-[#17A6E3]">Settings</router-link> to manage your media.</div>
    <template v-if="connected">
      <div v-if="usage" class="mb-5 rounded-2xl bg-gray-50 p-4 text-sm text-gray-500"><span class="font-semibold text-gray-900">Storage</span> · {{ bytes(usage.used) }} used <template v-if="usage.allocated != null && usage.remaining != null">of {{ bytes(usage.allocated) }} · {{ bytes(usage.remaining) }} remaining<span v-if="usage.allocationType === 'team'"> (team allocation)</span></template><template v-else> · allocation unavailable</template></div>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3"><div class="min-w-0 text-sm text-gray-500"><button v-if="path" type="button" class="mr-2 font-semibold text-[#17A6E3]" :disabled="loading" @click="up">← Back</button><span class="break-all">{{ path || 'Dropbox /' }}</span></div><div class="flex flex-wrap gap-2"><button type="button" class="admin-button-secondary" :disabled="loading" @click="load()">Refresh</button><button type="button" class="admin-button-primary" :disabled="loading" @click="input.click()">Upload media</button><input ref="input" class="hidden" type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm" @change="upload" /></div></div>
      <p class="mb-3 text-xs text-gray-400">JPEG, PNG, GIF, WebP, MP4 or WebM · up to 4 MB. Uploading does not make a file public.</p>
      <div v-if="loading && !entries.length" class="rounded-2xl bg-gray-50 p-5 text-sm text-gray-500">Loading…</div><div v-else-if="!entries.length" class="rounded-2xl bg-gray-50 p-5 text-sm text-gray-500">This folder is empty.</div>
      <ul v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <li v-for="item in entries" :key="item.id" class="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <button v-if="item.type === 'folder'" type="button" class="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-gray-50 text-gray-500 hover:bg-gray-100" :disabled="loading" :aria-label="`Open folder ${item.name}`" @click="load(item.path)"><span class="text-3xl" aria-hidden="true">▰</span><span class="text-xs font-semibold">Open folder</span></button>
          <button v-else-if="allowed.test(item.name)" type="button" class="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-gray-100 text-gray-400" :aria-label="`Preview ${item.name}`" @click="openPreview(item, $event)">
            <img v-if="!failedThumbs[item.id]" :src="previewUrl(item)" :alt="''" loading="lazy" class="size-full object-cover" @error="failedThumbs[item.id] = true" />
            <span v-else class="px-3 text-center text-xs">Preview unavailable</span><span v-if="videoPattern.test(item.name)" class="absolute rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">▶ Video</span>
          </button>
          <div v-else class="flex aspect-[4/3] items-center justify-center bg-gray-50 text-xs text-gray-400">File</div>
          <div class="p-3"><p class="truncate text-sm font-semibold text-gray-800" :title="item.name">{{ item.name }}</p><p v-if="item.type === 'file'" class="mt-1 text-xs text-gray-400">{{ bytes(item.size) }}</p>
            <div v-if="item.type === 'file'" class="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs font-semibold"><button v-if="allowed.test(item.name) && (!picker || selectable(item))" type="button" class="text-[#17A6E3] hover:underline" :disabled="loading" @click="share(item)">{{ picker ? 'Select' : 'Copy public link' }}</button><button type="button" class="text-red-500 hover:underline" :disabled="loading" @click="remove(item)">Delete</button></div>
          </div>
        </li>
      </ul>
      <dialog ref="previewDialog" aria-labelledby="media-preview-title" class="m-auto max-h-[94vh] w-[min(96vw,1000px)] overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl backdrop:bg-black/70 sm:p-6" @close="restoreFocus">
        <template v-if="previewItem"><div class="mb-4 flex items-center justify-between gap-3"><div class="min-w-0"><p class="admin-eyebrow">Media preview</p><h2 id="media-preview-title" class="truncate text-lg font-semibold text-gray-900">{{ previewItem.name }}</h2><p class="mt-1 text-xs text-gray-400">{{ bytes(previewItem.size) }} · {{ previewIndex + 1 }} / {{ previewItems.length }}</p></div><button type="button" class="admin-button-secondary" @click="closePreview">Close</button></div>
          <div class="flex min-h-[240px] items-center justify-center overflow-hidden rounded-2xl bg-gray-900 sm:min-h-[420px]">
            <video v-if="videoPattern.test(previewItem.name) && previewItem.size <= 4 * 1024 * 1024" :key="previewItem.id" :src="previewUrl(previewItem, true)" controls playsinline class="max-h-[60vh] max-w-full" />
            <p v-else-if="videoPattern.test(previewItem.name)" class="p-6 text-center text-sm text-white/70">Video preview is limited to 4 MB. You can still select this file.</p>
            <p v-else-if="failedFull[previewItem.id]" class="p-6 text-center text-sm text-white/70">Dropbox could not generate a preview for this file.</p>
            <img v-else :key="previewItem.id" :src="previewUrl(previewItem, true)" :alt="previewItem.name" class="max-h-[60vh] max-w-full object-contain" @error="failedFull[previewItem.id] = true" />
          </div>
          <div class="mt-4 flex flex-wrap items-center justify-between gap-3"><div class="flex gap-2"><button type="button" class="admin-button-secondary" :disabled="previewItems.length < 2" @click="movePreview(-1)">← Previous</button><button type="button" class="admin-button-secondary" :disabled="previewItems.length < 2" @click="movePreview(1)">Next →</button></div><button v-if="!picker || selectable(previewItem)" type="button" class="admin-button-primary" :disabled="loading" @click="share(previewItem)">{{ picker ? 'Select media' : 'Copy public link' }}</button></div>
        </template>
      </dialog>
      <button v-if="cursor" type="button" class="admin-button-secondary mt-4" :disabled="loading" @click="more">Load more</button>
    </template>
  </div>
</template>
