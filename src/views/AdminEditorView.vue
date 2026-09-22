<script setup>
import { computed, inject, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi } from '@/api/admin.js'

const props = defineProps({ type: { type: String, required: true } })
const route = useRoute()
const router = useRouter()
const toast = inject('adminToast')
const type = computed(() => props.type)
const isWorks = computed(() => type.value === 'works')
const isNew = computed(() => route.name === `admin-${type.value.slice(0, -1)}-new`)
const loading = ref(!isNew.value)
const saving = ref(false)
const error = ref('')
const fieldErrors = ref({})
const savedSnapshot = ref('')

const emptyCaseStudy = () => ({
  clientName: '', year: '', type: '', caseTitle: '', caseDescription: '', story: '',
  hero: { type: 'phone', videoUrl: '', imageUrl: '' },
  contribution: { role: '', client: '', year: '', discipline: '', scope: [] },
  numbers: [],
  visualIdentity: { colorsTitle: '', colors: [], fontsTitle: '', fonts: [] },
  solutionsOverview: { description: '', slides: [] },
})

const draft = reactive({
  slug: '', title: '', description: '', tags: [], categories: [], category: '', year: '',
  device: 'phone', previewVideoUrl: '', previewImageUrl: '', videoUrl: '', imageUrl: '', externalUrl: '',
  status: 'draft', sortOrder: 0, caseStudy: emptyCaseStudy(), _tagInput: '', _scopeInput: '',
})

const dirty = computed(() => JSON.stringify(draft) !== savedSnapshot.value)
const localDraftKey = computed(() => `portfolio-admin-draft:${type.value}`)
const localDraftSavedAt = ref('')
let localDraftTimer
const mediaVideoUrl = computed({ get: () => isWorks.value ? draft.previewVideoUrl : draft.videoUrl, set: (value) => { if (isWorks.value) draft.previewVideoUrl = value; else draft.videoUrl = value } })
const mediaImageUrl = computed({ get: () => isWorks.value ? draft.previewImageUrl : draft.imageUrl, set: (value) => { if (isWorks.value) draft.previewImageUrl = value; else draft.imageUrl = value } })
function resetSnapshot() { savedSnapshot.value = JSON.stringify(draft) }
function restoreLocalDraft() {
  try {
    const raw = localStorage.getItem(localDraftKey.value)
    if (!raw) return
    const stored = JSON.parse(raw)
    Object.assign(draft, stored)
    draft.caseStudy = { ...emptyCaseStudy(), ...(stored.caseStudy || {}) }
    draft.caseStudy.hero = { ...emptyCaseStudy().hero, ...(stored.caseStudy?.hero || {}) }
    draft.caseStudy.contribution = { ...emptyCaseStudy().contribution, ...(stored.caseStudy?.contribution || {}) }
    draft.caseStudy.visualIdentity = { ...emptyCaseStudy().visualIdentity, ...(stored.caseStudy?.visualIdentity || {}) }
    draft.caseStudy.solutionsOverview = { ...emptyCaseStudy().solutionsOverview, ...(stored.caseStudy?.solutionsOverview || {}) }
    localDraftSavedAt.value = stored._localDraftSavedAt || ''
  } catch {
    localStorage.removeItem(localDraftKey.value)
  }
}
function persistLocalDraft() {
  if (!isNew.value || typeof localStorage === 'undefined') return
  clearTimeout(localDraftTimer)
  localDraftTimer = setTimeout(() => {
    const snapshot = JSON.parse(JSON.stringify(draft))
    const savedAt = new Date().toISOString()
    snapshot._localDraftSavedAt = savedAt
    localStorage.setItem(localDraftKey.value, JSON.stringify(snapshot))
    localDraftSavedAt.value = savedAt
  }, 350)
}
function clearLocalDraft() {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(localDraftKey.value)
  localDraftSavedAt.value = ''
}
function fieldClass(name) { return fieldErrors.value[name] ? 'admin-input-error' : '' }
function cleanUrl(value) {
  const match = String(value || '').match(/^\[.*?\]\((https?:\/\/[^)]+)\)$/)
  return match ? match[1] : String(value || '').trim()
}
function validateDraft() {
  const errors = {}
  if (!draft.slug) errors.slug = 'Slug is required.'
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) errors.slug = 'Use lowercase letters, numbers, and hyphens only.'
  if (!draft.title.trim()) errors.title = 'Title is required.'
  if (!draft.description.trim()) errors.description = 'Description is required.'
  const mediaUrl = isWorks.value ? draft.previewVideoUrl : draft.videoUrl
  if (!mediaUrl && !(isWorks.value ? draft.previewImageUrl : draft.imageUrl)) errors.media = 'Add a video URL or image fallback.'
  for (const [key, value] of [['previewVideoUrl', draft.previewVideoUrl], ['previewImageUrl', draft.previewImageUrl], ['videoUrl', draft.videoUrl], ['imageUrl', draft.imageUrl]]) { if (value && !/^https?:\/\//.test(cleanUrl(value))) errors[key] = 'Enter a valid URL starting with http:// or https://.' }
  fieldErrors.value = errors
  return !Object.keys(errors).length
}
function listFor(kind) { return isWorks.value ? draft.tags : draft.categories }
function addTag() { const value = (draft._tagInput || '').trim(); if (value && !listFor().includes(value)) listFor().push(value); draft._tagInput = '' }
function removeTag(index) { listFor().splice(index, 1) }
function addScope() { const value = (draft._scopeInput || '').trim(); const scope = draft.caseStudy.contribution.scope; if (value && !scope.includes(value)) scope.push(value); draft._scopeInput = '' }
function removeScope(index) { draft.caseStudy.contribution.scope.splice(index, 1) }
function addNumber() { draft.caseStudy.numbers.push({ label: '', value: '' }) }
function removeNumber(index) { draft.caseStudy.numbers.splice(index, 1) }
function addColor() { draft.caseStudy.visualIdentity.colors.push({ name: '', hex: '#17A6E3' }) }
function removeColor(index) { draft.caseStudy.visualIdentity.colors.splice(index, 1) }
function addFont() { draft.caseStudy.visualIdentity.fonts.push({ label: '', name: '' }) }
function removeFont(index) { draft.caseStudy.visualIdentity.fonts.splice(index, 1) }
function addSlide() { draft.caseStudy.solutionsOverview.slides.push({ videoUrl: '', imageUrl: '', videoType: 'phone', description: '', sortOrder: draft.caseStudy.solutionsOverview.slides.length }) }
function removeSlide(index) { draft.caseStudy.solutionsOverview.slides.splice(index, 1) }
function moveSlide(index, direction) { const next = index + direction; const slides = draft.caseStudy.solutionsOverview.slides; if (next < 0 || next >= slides.length) return; [slides[index], slides[next]] = [slides[next], slides[index]] }

function normalize() {
  const data = JSON.parse(JSON.stringify(draft))
  data.previewVideoUrl = cleanUrl(data.previewVideoUrl); data.previewImageUrl = cleanUrl(data.previewImageUrl); data.videoUrl = cleanUrl(data.videoUrl); data.imageUrl = cleanUrl(data.imageUrl)
  if (data.caseStudy?.hero) { data.caseStudy.hero.videoUrl = cleanUrl(data.caseStudy.hero.videoUrl); data.caseStudy.hero.imageUrl = cleanUrl(data.caseStudy.hero.imageUrl) }
  if (data.caseStudy?.solutionsOverview?.slides) data.caseStudy.solutionsOverview.slides.forEach((slide) => { slide.videoUrl = cleanUrl(slide.videoUrl); slide.imageUrl = cleanUrl(slide.imageUrl) })
  delete data._tagInput; delete data._scopeInput; delete data._localDraftSavedAt
  if (isWorks.value) {
    delete data.videoUrl; delete data.imageUrl; delete data.category; delete data.categories
    data.caseStudy.hero = data.caseStudy.hero || { type: data.device, videoUrl: '', imageUrl: '' }
  } else {
    delete data.previewVideoUrl; delete data.previewImageUrl; delete data.tags; delete data.year; delete data.caseStudy
  }
  return data
}

async function load() {
  if (isNew.value) { restoreLocalDraft(); loading.value = false; return }
  loading.value = true
  try {
    const item = (await adminApi.get(type.value, route.params.id)).data
    Object.assign(draft, item)
    draft.caseStudy = { ...emptyCaseStudy(), ...(item.caseStudy || {}) }
    draft.caseStudy.hero = { ...emptyCaseStudy().hero, ...(item.caseStudy?.hero || {}) }
    draft.caseStudy.contribution = { ...emptyCaseStudy().contribution, ...(item.caseStudy?.contribution || {}) }
    draft.caseStudy.visualIdentity = { ...emptyCaseStudy().visualIdentity, ...(item.caseStudy?.visualIdentity || {}) }
    draft.caseStudy.solutionsOverview = { ...emptyCaseStudy().solutionsOverview, ...(item.caseStudy?.solutionsOverview || {}) }
    resetSnapshot()
  } catch (e) { error.value = e.message } finally { loading.value = false }
}

async function save(statusOverride) {
  saving.value = true; error.value = ''
  try {
    const body = normalize()
    if (statusOverride) body.status = statusOverride
    const response = isNew.value ? await adminApi.create(type.value, body) : await adminApi.update(type.value, route.params.id, body)
    toast?.success(statusOverride === 'published' ? 'Published successfully' : 'Saved successfully')
    Object.assign(draft, response.data)
    if (isNew.value) clearLocalDraft()
    resetSnapshot()
    if (isNew.value) router.replace(`/admin/${type.value}/${response.data.id}/edit`)
  } catch (e) { fieldErrors.value = { ...(e.fieldErrors || {}) }; error.value = e.message; toast?.error(e.message) } finally { saving.value = false }
}

function back() { if (dirty.value && !confirm('You have unsaved changes. Leave without saving?')) return; router.push(`/admin/${type.value}`) }
watch(() => [props.type, route.params.id], load, { immediate: true })
watch(draft, persistLocalDraft, { deep: true })
</script>

<template>
  <section>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <button class="mb-3 text-sm text-gray-500 hover:text-[#17A6E3]" @click="back">← Back to {{ isWorks ? 'case studies' : 'Apps Lab' }}</button>
        <h1 class="admin-title">{{ isNew ? 'New' : 'Edit' }} {{ isWorks ? 'case study' : 'App Lab' }}</h1>
        <p class="mt-2 text-gray-500">Every field below is connected to the live preview and API payload.</p><p v-if="isNew && localDraftSavedAt" class="mt-2 text-xs text-emerald-600">Draft saved on this device · {{ new Date(localDraftSavedAt).toLocaleTimeString() }} <button class="ml-2 underline" @click="clearLocalDraft">Clear local draft</button></p>
      </div>
      <div class="flex flex-wrap gap-2">
        <span class="rounded-full border px-3 py-2 text-xs" :class="dirty ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'">{{ dirty ? 'Unsaved changes' : 'Saved' }}</span>
        <button class="admin-button-secondary" @click="back">Cancel</button>
        <button class="admin-button-primary" :disabled="saving || !draft.title || !draft.description || !draft.slug" @click="save()">{{ saving ? 'Saving…' : 'Save' }}</button>
        <button class="admin-button-dark" :disabled="saving || !draft.title || !draft.description || !draft.slug" @click="save('published')">Publish</button>
      </div>
    </div>

    <div v-if="error" class="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</div><div v-if="Object.keys(fieldErrors).length" class="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p v-for="(message, field) in fieldErrors" :key="field">{{ message }}</p></div>
    <div v-if="loading" class="h-96 animate-pulse rounded-3xl bg-gray-200" />
    <div v-else class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div class="space-y-6">
        <!-- Live preview -->
        <div class="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div class="relative flex min-h-[320px] items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#17A6E3,#132132)] p-8">
            <div v-if="draft.device !== 'browser'" class="relative h-[300px] aspect-[9/19] overflow-hidden rounded-[1.4rem] border-4 border-gray-800 bg-gray-900 shadow-2xl">
              <video v-if="isWorks ? draft.previewVideoUrl : draft.videoUrl" :src="isWorks ? draft.previewVideoUrl : draft.videoUrl" :poster="isWorks ? draft.previewImageUrl : draft.imageUrl" autoplay muted loop playsinline class="size-full object-cover" />
              <img v-else-if="isWorks ? draft.previewImageUrl : draft.imageUrl" :src="isWorks ? draft.previewImageUrl : draft.imageUrl" :alt="draft.title" class="size-full object-cover" />
            </div>
            <div v-else class="relative aspect-video w-[78%] overflow-hidden rounded-xl border-4 border-gray-800 bg-gray-900 shadow-2xl">
              <video v-if="isWorks ? draft.previewVideoUrl : draft.videoUrl" :src="isWorks ? draft.previewVideoUrl : draft.videoUrl" :poster="isWorks ? draft.previewImageUrl : draft.imageUrl" autoplay muted loop playsinline class="size-full object-cover" />
              <img v-else-if="isWorks ? draft.previewImageUrl : draft.imageUrl" :src="isWorks ? draft.previewImageUrl : draft.imageUrl" :alt="draft.title" class="size-full object-cover" />
            </div>
            <span class="absolute left-5 top-5 rounded-full bg-black/50 px-3 py-1 text-xs font-bold uppercase text-white">Live preview · {{ draft.status }}</span>
          </div>
          <div class="space-y-6 p-5 sm:p-8">
            <div><label class="admin-label">Card title<input v-model="draft.title" class="admin-input mt-2 text-2xl font-bold" placeholder="Project title" /></label><p class="mt-2 text-xs text-gray-400">{{ draft.title.length }}/200 characters</p></div>
            <label class="admin-label">Card description<textarea v-model="draft.description" :class="fieldClass('description')" rows="4" class="admin-input mt-2" placeholder="Short project description" /></label>
            <div v-if="isWorks" class="space-y-5 border-t pt-6">
              <p class="admin-eyebrow">Case study page · hero and story</p>
              <label class="admin-label">Client name<input v-model="draft.caseStudy.clientName" class="admin-input mt-2" /></label>
              <div class="grid gap-4 sm:grid-cols-2"><label class="admin-label">Case study year<input v-model="draft.caseStudy.year" class="admin-input mt-2" /></label><label class="admin-label">Project type<input v-model="draft.caseStudy.type" class="admin-input mt-2" placeholder="MOBILE APP" /></label></div>
              <div class="rounded-2xl border border-gray-200 bg-gray-50 p-4"><p class="admin-eyebrow">Detail page hero media</p><div class="mt-3 grid gap-3 sm:grid-cols-3"><label class="admin-label">Device<select v-model="draft.caseStudy.hero.type" class="admin-input mt-2"><option value="phone">Phone</option><option value="browser">Browser</option></select></label><label class="admin-label sm:col-span-2">Hero video URL<input v-model="draft.caseStudy.hero.videoUrl" type="url" class="admin-input mt-2" placeholder="https://cdn…" /></label></div><label class="admin-label mt-3">Hero image fallback<input v-model="draft.caseStudy.hero.imageUrl" type="url" class="admin-input mt-2" placeholder="https://cdn…" /></label></div>
              <label class="admin-label">Hero case title<textarea v-model="draft.caseStudy.caseTitle" rows="3" class="admin-input mt-2" /></label>
              <label class="admin-label">Hero case description<textarea v-model="draft.caseStudy.caseDescription" rows="5" class="admin-input mt-2" /></label>
              <label class="admin-label">The story<textarea v-model="draft.caseStudy.story" rows="7" class="admin-input mt-2" /></label>
            </div>
            <div v-else class="space-y-5 border-t pt-6"><p class="admin-eyebrow">App details</p><label class="admin-label">Category<input v-model="draft.category" class="admin-input mt-2" placeholder="Mobile App, Education" /></label><label class="admin-label">External demo URL<input v-model="draft.externalUrl" type="url" class="admin-input mt-2" placeholder="https://…" /></label></div>
          </div>
        </div>

        <!-- Case study dynamic sections -->
        <template v-if="isWorks">
          <div class="admin-editor-card"><div class="admin-editor-heading"><div><p class="admin-eyebrow">Case study page · contribution</p><h2 class="admin-section-title">Role and scope</h2></div></div><div class="grid gap-4 sm:grid-cols-2"><label class="admin-label">Role<input v-model="draft.caseStudy.contribution.role" class="admin-input mt-2" /></label><label class="admin-label">Client<input v-model="draft.caseStudy.contribution.client" class="admin-input mt-2" /></label><label class="admin-label">Year<input v-model="draft.caseStudy.contribution.year" class="admin-input mt-2" /></label><label class="admin-label">Discipline<input v-model="draft.caseStudy.contribution.discipline" class="admin-input mt-2" /></label></div><div class="mt-4"><label class="admin-label">Scope</label><div class="mt-2 flex gap-2"><input v-model="draft._scopeInput" class="admin-input" placeholder="Frontend, Backend, UX…" @keyup.enter="addScope" /><button class="admin-button-secondary" @click="addScope">Add</button></div><div class="mt-3 flex flex-wrap gap-2"><span v-for="(scope, index) in draft.caseStudy.contribution.scope" :key="scope" class="rounded-full bg-[#BBE6F6] px-3 py-1 text-sm text-[#132132]">{{ scope }} <button class="ml-1" @click="removeScope(index)">×</button></span></div></div></div>

          <div class="admin-editor-card"><div class="admin-editor-heading"><div><p class="admin-eyebrow">Case study page · numbers</p><h2 class="admin-section-title">Results and statistics</h2></div><button class="admin-button-secondary" @click="addNumber">+ Add stat</button></div><div v-if="!draft.caseStudy.numbers.length" class="admin-subtle-empty">Add the metrics shown in the public numbers section.</div><div v-for="(stat, index) in draft.caseStudy.numbers" :key="index" class="mb-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input v-model="stat.label" class="admin-input" placeholder="APP SALES" /><input v-model="stat.value" class="admin-input" placeholder="+100%" /><button class="text-sm text-red-500" @click="removeNumber(index)">Remove</button></div></div>

          <div class="admin-editor-card"><div class="admin-editor-heading"><div><p class="admin-eyebrow">Case study page · visual identity</p><h2 class="admin-section-title">Colors and fonts</h2></div></div><label class="admin-label">Colors section title<input v-model="draft.caseStudy.visualIdentity.colorsTitle" class="admin-input mt-2" /></label><div class="mt-4 flex items-center justify-between"><span class="admin-label">Color palette</span><button class="admin-button-secondary" @click="addColor">+ Add color</button></div><div v-for="(color, index) in draft.caseStudy.visualIdentity.colors" :key="index" class="mt-3 grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto]"><input v-model="color.hex" type="color" class="h-11 w-14 rounded-lg border p-1" /><input v-model="color.name" class="admin-input" placeholder="Lemon Orange" /><input v-model="color.hex" class="admin-input" placeholder="#FAD81E" /><button class="text-sm text-red-500" @click="removeColor(index)">Remove</button></div><label class="admin-label mt-6">Fonts section title<input v-model="draft.caseStudy.visualIdentity.fontsTitle" class="admin-input mt-2" /></label><div class="mt-4 flex items-center justify-between"><span class="admin-label">Fonts</span><button class="admin-button-secondary" @click="addFont">+ Add font</button></div><div v-for="(font, index) in draft.caseStudy.visualIdentity.fonts" :key="index" class="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input v-model="font.label" class="admin-input" placeholder="PRIMARY" /><input v-model="font.name" class="admin-input" placeholder="POPPINS FONT" /><button class="text-sm text-red-500" @click="removeFont(index)">Remove</button></div></div>

          <div class="admin-editor-card"><div class="admin-editor-heading"><div><p class="admin-eyebrow">Case study page · solutions</p><h2 class="admin-section-title">Solutions overview</h2></div><button class="admin-button-secondary" @click="addSlide">+ Add slide</button></div><label class="admin-label">Section description<textarea v-model="draft.caseStudy.solutionsOverview.description" rows="4" class="admin-input mt-2" /></label><div v-for="(slide, index) in draft.caseStudy.solutionsOverview.slides" :key="index" class="mt-5 rounded-2xl border border-gray-200 p-4"><div class="mb-3 flex items-center justify-between"><strong>Slide {{ index + 1 }}</strong><div class="flex gap-3 text-sm"><button :disabled="index === 0" @click="moveSlide(index, -1)">↑</button><button :disabled="index === draft.caseStudy.solutionsOverview.slides.length - 1" @click="moveSlide(index, 1)">↓</button><button class="text-red-500" @click="removeSlide(index)">Remove</button></div></div><div class="grid gap-3 sm:grid-cols-2"><label class="admin-label">Video URL<input v-model="slide.videoUrl" type="url" class="admin-input mt-2" placeholder="https://cdn…" /></label><label class="admin-label">Image fallback<input v-model="slide.imageUrl" type="url" class="admin-input mt-2" placeholder="https://cdn…" /></label><label class="admin-label">Video type<select v-model="slide.videoType" class="admin-input mt-2"><option value="phone">Phone</option><option value="web">Browser</option></select></label><label class="admin-label">Order<input v-model.number="slide.sortOrder" type="number" min="0" class="admin-input mt-2" /></label></div><label class="admin-label mt-3">Slide description<textarea v-model="slide.description" rows="3" class="admin-input mt-2" /></label></div></div>
        </template>
      </div>

      <!-- Floating metadata inspector -->
      <aside class="h-fit space-y-5 rounded-3xl bg-[#0E1722] p-5 text-white shadow-xl xl:sticky xl:top-24"><div class="flex items-center justify-between"><h2 class="font-bricolage text-xl font-semibold">Details</h2><span class="text-xs text-white/40">Inspector</span></div><label class="admin-label-dark">Slug<input v-model="draft.slug" :class="fieldClass('slug')" class="admin-input-dark mt-2" placeholder="project-slug" /></label><label class="admin-label-dark">Status<select v-model="draft.status" class="admin-input-dark mt-2"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label><label class="admin-label-dark">Device<select v-model="draft.device" class="admin-input-dark mt-2"><option value="phone">Phone mockup</option><option value="browser">Browser mockup</option></select></label><label v-if="isWorks" class="admin-label-dark">Card year<input v-model="draft.year" class="admin-input-dark mt-2" /></label><label class="admin-label-dark">Sort order<input v-model.number="draft.sortOrder" type="number" min="0" class="admin-input-dark mt-2" /></label><div class="border-t border-white/10 pt-5"><p class="admin-eyebrow !text-white/40">{{ isWorks ? 'Card tags' : 'Lab categories' }}</p><div class="mt-3 flex gap-2"><input v-model="draft._tagInput" class="admin-input-dark" placeholder="Add tag" @keyup.enter="addTag" /><button class="rounded-xl bg-white/10 px-3 text-sm" @click="addTag">+</button></div><div class="mt-3 flex flex-wrap gap-2"><span v-for="(tag, index) in listFor()" :key="tag" class="rounded-full bg-white/10 px-2 py-1 text-xs">{{ tag }} <button @click="removeTag(index)">×</button></span></div></div><div class="border-t border-white/10 pt-5"><p class="admin-eyebrow !text-white/40">{{ isWorks ? 'Card preview media' : 'Preview media' }}</p><label class="admin-label-dark mt-4">Video URL<input v-model="mediaVideoUrl" :class="fieldClass(isWorks ? 'previewVideoUrl' : 'videoUrl')" type="url" class="admin-input-dark mt-2" placeholder="https://cdn…" /></label><label class="admin-label-dark mt-4">Image fallback<input v-model="mediaImageUrl" :class="fieldClass(isWorks ? 'previewImageUrl' : 'imageUrl')" type="url" class="admin-input-dark mt-2" placeholder="https://cdn…" /></label></div><button class="w-full rounded-xl border border-white/15 px-4 py-3 text-sm text-red-300 hover:border-red-300" @click="back">Discard changes</button></aside>
    </div>
  </section>
</template>

<style scoped>
.admin-editor-card { border: 1px solid #e5e7eb; border-radius: 1.5rem; background: white; padding: 1.25rem; box-shadow: 0 1px 2px rgba(16,24,40,.04); }
@media (min-width: 640px) { .admin-editor-card { padding: 1.75rem; } }
.admin-editor-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
.admin-subtle-empty { border-radius: 1rem; background: #f7f8fa; padding: 1rem; font-size: .875rem; color: #667085; }
</style>
