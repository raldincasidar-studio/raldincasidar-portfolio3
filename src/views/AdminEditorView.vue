<script setup>
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi } from '@/api/admin.js'
import AdminPostEditor from '@/components/admin/AdminPostEditor.vue'
import { prunePost } from '@/utils/postBlocks.js'

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
const activeTab = ref('card')

const emptyPost = () => ({ intro: '', blocks: [] })
const emptyCaseStudy = () => ({
  clientName: '', year: '', type: '', caseTitle: '', caseDescription: '', story: '',
  hero: { type: 'phone', videoUrl: '', imageUrl: '' },
  contribution: { role: '', client: '', year: '', discipline: '', scope: [] },
  numbers: [],
  visualIdentity: { colorsTitle: '', colors: [], fontsTitle: '', fonts: [] },
  solutionsOverview: { description: '', slides: [] },
  post: emptyPost(),
})

const draft = reactive({
  slug: '', title: '', description: '', tags: [], categories: [], category: '', year: '',
  device: 'phone', previewVideoUrl: '', previewImageUrl: '', videoUrl: '', imageUrl: '', externalUrl: '',
  status: 'draft', sortOrder: 0, caseStudy: emptyCaseStudy(), _tagInput: '', _scopeInput: '',
})

const dirty = computed(() => JSON.stringify(draft) !== savedSnapshot.value)
const completion = computed(() => {
  const checks = [
    draft.slug,
    draft.title.trim(),
    draft.description.trim(),
    isWorks.value ? draft.previewVideoUrl || draft.previewImageUrl : draft.videoUrl || draft.imageUrl
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
})

const localDraftKey = computed(() => `portfolio-admin-draft:${type.value}`)
const localDraftSavedAt = ref('')
let localDraftTimer

const mediaVideoUrl = computed({
  get: () => isWorks.value ? draft.previewVideoUrl : draft.videoUrl,
  set: (val) => { if (isWorks.value) draft.previewVideoUrl = val; else draft.videoUrl = val }
})
const mediaImageUrl = computed({
  get: () => isWorks.value ? draft.previewImageUrl : draft.imageUrl,
  set: (val) => { if (isWorks.value) draft.previewImageUrl = val; else draft.imageUrl = val }
})

// Tab configuration
const tabs = computed(() => {
  if (isWorks.value) {
    return [
      {
        id: 'card',
        label: 'Card & Preview',
        description: 'Listing card & metadata',
        hasError: !!(fieldErrors.value.slug || fieldErrors.value.title || fieldErrors.value.description || fieldErrors.value.media),
        badge: null
      },
      {
        id: 'hero',
        label: 'Hero & Story',
        description: 'Intro headline & media',
        hasError: false,
        badge: null
      },
      {
        id: 'role',
        label: 'Role & Stats',
        description: 'Contribution & numbers',
        hasError: false,
        badge: draft.caseStudy.numbers.length ? `${draft.caseStudy.numbers.length}` : null
      },
      {
        id: 'visuals',
        label: 'Design System',
        description: 'Palette & typography',
        hasError: false,
        badge: draft.caseStudy.visualIdentity.colors.length ? `${draft.caseStudy.visualIdentity.colors.length}` : null
      },
      {
        id: 'solutions',
        label: 'Solutions',
        description: 'Interactive slides',
        hasError: false,
        badge: draft.caseStudy.solutionsOverview.slides.length ? `${draft.caseStudy.solutionsOverview.slides.length}` : null
      },
      {
        id: 'post',
        label: 'Article Content',
        description: 'Deep dive blocks',
        hasError: false,
        badge: draft.caseStudy.post.blocks?.length ? `${draft.caseStudy.post.blocks.length}` : null
      }
    ]
  }

  return [
    {
      id: 'card',
      label: 'App Details',
      description: 'Title, links & description',
      hasError: !!(fieldErrors.value.slug || fieldErrors.value.title || fieldErrors.value.description),
      badge: null
    },
    {
      id: 'media',
      label: 'Preview Media',
      description: 'Mockup device & demo asset',
      hasError: !!(fieldErrors.value.videoUrl || fieldErrors.value.imageUrl || fieldErrors.value.media),
      badge: null
    }
  ]
})

function nextTab() {
  const list = tabs.value
  const idx = list.findIndex(t => t.id === activeTab.value)
  if (idx < list.length - 1) {
    activeTab.value = list[idx + 1].id
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function prevTab() {
  const list = tabs.value
  const idx = list.findIndex(t => t.id === activeTab.value)
  if (idx > 0) {
    activeTab.value = list[idx - 1].id
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

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
    draft.caseStudy.post = { ...emptyPost(), ...(stored.caseStudy?.post || {}), blocks: Array.isArray(stored.caseStudy?.post?.blocks) ? stored.caseStudy.post.blocks : [] }
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
    try {
      localStorage.setItem(localDraftKey.value, JSON.stringify(snapshot))
    } catch {
      return
    }
    localDraftSavedAt.value = savedAt
  }, 350)
}

function clearLocalDraft() {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(localDraftKey.value)
  localDraftSavedAt.value = ''
}

function fieldClass(name) { return fieldErrors.value[name] ? 'admin-input-error ring-2 ring-red-400' : '' }

function cleanUrl(value) {
  const match = String(value || '').match(/^\[.*?\]\((https?:\/\/[^)]+)\)$/)
  return match ? match[1] : String(value || '').trim()
}

function generateSlugFromTitle() {
  if (!draft.title) return
  draft.slug = draft.title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function validateDraft() {
  const errors = {}
  if (!draft.slug) errors.slug = 'Slug is required.'
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) errors.slug = 'Use lowercase letters, numbers, and hyphens only.'
  if (!draft.title.trim()) errors.title = 'Title is required.'
  if (!draft.description.trim()) errors.description = 'Description is required.'
  const mediaUrl = isWorks.value ? draft.previewVideoUrl : draft.videoUrl
  if (!mediaUrl && !(isWorks.value ? draft.previewImageUrl : draft.imageUrl)) errors.media = 'Add a video URL or image fallback.'
  for (const [key, value] of [['previewVideoUrl', draft.previewVideoUrl], ['previewImageUrl', draft.previewImageUrl], ['videoUrl', draft.videoUrl], ['imageUrl', draft.imageUrl]]) {
    if (value && !/^https?:\/\//.test(cleanUrl(value))) errors[key] = 'Enter a valid URL starting with http:// or https://.'
  }
  fieldErrors.value = errors
  return !Object.keys(errors).length
}

function listFor() { return isWorks.value ? draft.tags : draft.categories }
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

function addSlide() {
  draft.caseStudy.solutionsOverview.slides.push({
    videoUrl: '', imageUrl: '', videoType: 'phone', description: '', sortOrder: draft.caseStudy.solutionsOverview.slides.length
  })
}
function removeSlide(index) { draft.caseStudy.solutionsOverview.slides.splice(index, 1) }
function moveSlide(index, direction) {
  const next = index + direction
  const slides = draft.caseStudy.solutionsOverview.slides
  if (next < 0 || next >= slides.length) return
  ;[slides[index], slides[next]] = [slides[next], slides[index]]
}

function normalize() {
  const data = JSON.parse(JSON.stringify(draft))
  data.previewVideoUrl = cleanUrl(data.previewVideoUrl); data.previewImageUrl = cleanUrl(data.previewImageUrl)
  data.videoUrl = cleanUrl(data.videoUrl); data.imageUrl = cleanUrl(data.imageUrl)
  if (data.caseStudy?.hero) {
    data.caseStudy.hero.videoUrl = cleanUrl(data.caseStudy.hero.videoUrl)
    data.caseStudy.hero.imageUrl = cleanUrl(data.caseStudy.hero.imageUrl)
  }
  if (data.caseStudy?.solutionsOverview?.slides) {
    data.caseStudy.solutionsOverview.slides.forEach((slide) => {
      slide.videoUrl = cleanUrl(slide.videoUrl)
      slide.imageUrl = cleanUrl(slide.imageUrl)
    })
  }
  delete data._tagInput; delete data._scopeInput; delete data._localDraftSavedAt

  if (isWorks.value) {
    data.caseStudy.clientName = data.caseStudy.contribution?.client || data.caseStudy.clientName || ''
    data.caseStudy.year = data.year || data.caseStudy.year || ''
    data.caseStudy.contribution = data.caseStudy.contribution || {}
    data.caseStudy.contribution.client = data.caseStudy.clientName
    data.caseStudy.contribution.year = data.caseStudy.year
    delete data.videoUrl; delete data.imageUrl; delete data.category; delete data.categories
    data.caseStudy.hero = data.caseStudy.hero || { type: data.device, videoUrl: '', imageUrl: '' }
    data.caseStudy.post = prunePost(data.caseStudy.post)
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
    draft.year = item.year || item.caseStudy?.year || ''
    draft.caseStudy.contribution.client = draft.caseStudy.contribution.client || item.caseStudy?.clientName || ''
    draft.caseStudy.contribution.year = draft.year
    draft.caseStudy.visualIdentity = { ...emptyCaseStudy().visualIdentity, ...(item.caseStudy?.visualIdentity || {}) }
    draft.caseStudy.solutionsOverview = { ...emptyCaseStudy().solutionsOverview, ...(item.caseStudy?.solutionsOverview || {}) }
    draft.caseStudy.post = { ...emptyPost(), ...(item.caseStudy?.post || {}), blocks: Array.isArray(item.caseStudy?.post?.blocks) ? item.caseStudy.post.blocks : [] }
    resetSnapshot()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function save(statusOverride) {
  if (!validateDraft()) {
    toast?.error?.('Please complete the required fields highlighted in red.')
    activeTab.value = 'card'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const body = normalize()
    if (statusOverride) body.status = statusOverride
    const response = isNew.value ? await adminApi.create(type.value, body) : await adminApi.update(type.value, route.params.id, body)
    toast?.success(statusOverride === 'published' ? 'Published successfully' : 'Saved successfully')
    Object.assign(draft, response.data)
    if (isNew.value) clearLocalDraft()
    resetSnapshot()
    if (isNew.value) router.replace(`/admin/${type.value}/${response.data.id}/edit`)
  } catch (e) {
    fieldErrors.value = { ...(e.fieldErrors || {}) }
    error.value = e.message
    toast?.error?.(e.message)
  } finally {
    saving.value = false
  }
}

function back() {
  if (dirty.value && !confirm('You have unsaved changes. Leave without saving?')) return
  router.push(`/admin/${type.value}`)
}

function onShortcut(event) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save() }
  if (event.key === 'Escape' && !saving.value) back()
}

onMounted(() => window.addEventListener('keydown', onShortcut))
onBeforeUnmount(() => { window.removeEventListener('keydown', onShortcut); clearTimeout(localDraftTimer) })
watch(() => [props.type, route.params.id], load, { immediate: true })
watch(draft, persistLocalDraft, { deep: true })
</script>

<template>
  <section class="max-w-7xl mx-auto pb-24">
    <!-- Top Bar: Navigation, Status & Actions -->
    <header class="sticky top-0 z-30 mb-6 border-b border-gray-200 bg-[#f7f8fa]/90 py-4 backdrop-blur-md">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button class="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#17A6E3] transition-colors" @click="back">
            <span>←</span> Back to {{ isWorks ? 'case studies' : 'Apps Lab' }}
          </button>
          <div class="mt-1 flex items-center gap-3">
            <h1 class="text-2xl font-bold tracking-tight text-[#132132]">
              {{ isNew ? 'Create New' : 'Editing' }} {{ isWorks ? 'Case Study' : 'App' }}
            </h1>
            <span
              class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="dirty ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'"
            >
              {{ dirty ? 'Unsaved' : 'Saved' }}
            </span>
          </div>
          <p v-if="isNew && localDraftSavedAt" class="mt-0.5 text-xs text-emerald-700">
            Local copy saved · {{ new Date(localDraftSavedAt).toLocaleTimeString() }}
            <button class="ml-1.5 underline hover:text-emerald-900" @click="clearLocalDraft">Clear</button>
          </p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Readiness Indicator -->
          <div class="hidden sm:flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 border border-gray-200 shadow-sm text-xs">
            <span class="text-gray-400">Readiness</span>
            <div class="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
              <div class="h-full bg-[#17A6E3] transition-all duration-300" :style="{ width: `${completion}%` }" />
            </div>
            <strong class="font-medium text-[#132132]">{{ completion }}%</strong>
          </div>

          <button class="admin-button-secondary text-sm" @click="back">Cancel</button>
          <button class="admin-button-primary text-sm shadow-sm" :disabled="saving || !draft.title || !draft.description || !draft.slug" @click="save()">
            {{ saving ? 'Saving…' : 'Save draft' }}
          </button>
          <button class="admin-button-dark text-sm shadow-sm" :disabled="saving || !draft.title || !draft.description || !draft.slug" @click="save('published')">
            Publish
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <nav class="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Editor tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="group relative flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all"
          :class="activeTab === tab.id
            ? 'bg-[#132132] text-white shadow-sm'
            : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'"
          @click="activeTab = tab.id"
        >
          <span>{{ tab.label }}</span>
          <span
            v-if="tab.badge"
            class="rounded-full px-1.5 py-0.2 text-[10px] font-bold"
            :class="activeTab === tab.id ? 'bg-[#17A6E3] text-white' : 'bg-gray-100 text-gray-600'"
          >
            {{ tab.badge }}
          </span>
          <span v-if="tab.hasError" class="size-2 rounded-full bg-red-500 animate-pulse" title="Missing required info" />
        </button>
      </nav>
    </header>

    <!-- Error Alerts -->
    <div v-if="error" class="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
      {{ error }}
    </div>
    <div v-if="Object.keys(fieldErrors).length" class="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm space-y-1">
      <p v-for="(message, field) in fieldErrors" :key="field">
        <strong>{{ field }}:</strong> {{ message }}
      </p>
    </div>

    <!-- Skeleton Loading -->
    <div v-if="loading" class="h-96 animate-pulse rounded-3xl bg-gray-200" />

    <!-- Main Tab Panes -->
    <main v-else class="space-y-6">
      <!-- ========================================== -->
      <!-- TAB 1: CARD & PREVIEW (WORKS OR APPS LAB) -->
      <!-- ========================================== -->
      <section v-show="activeTab === 'card'" class="grid gap-6 lg:grid-cols-12 items-start">
        <!-- Form Fields -->
        <div class="lg:col-span-7 space-y-6">
          <div class="admin-card">
            <h2 class="admin-section-title mb-4">Project Card Basics</h2>

            <div class="space-y-4">
              <div>
                <label class="admin-label">Card Title <span class="text-red-500">*</span></label>
                <input
                  v-model="draft.title"
                  class="admin-input mt-1.5 font-semibold text-lg"
                  placeholder="e.g. HealthTrack Companion"
                  :class="fieldClass('title')"
                />
                <div class="mt-1 flex items-center justify-between text-xs text-gray-400">
                  <span>Display title on public listing</span>
                  <span>{{ draft.title.length }}/200</span>
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between">
                  <label class="admin-label">Slug <span class="text-red-500">*</span></label>
                  <button
                    type="button"
                    class="text-xs text-[#17A6E3] hover:underline"
                    @click="generateSlugFromTitle"
                  >
                    Auto-slugify title
                  </button>
                </div>
                <input
                  v-model="draft.slug"
                  class="admin-input mt-1.5 font-mono text-sm"
                  placeholder="e.g. healthtrack-companion"
                  :class="fieldClass('slug')"
                />
              </div>

              <div class="grid gap-4 sm:grid-cols-3">
                <div>
                  <label class="admin-label">Status</label>
                  <select v-model="draft.status" class="admin-input mt-1.5">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div v-if="isWorks">
                  <label class="admin-label">Release Year</label>
                  <input v-model="draft.year" class="admin-input mt-1.5" placeholder="e.g. 2026" />
                </div>
                <div v-if="isWorks">
                  <label class="admin-label">Client</label>
                  <input v-model="draft.caseStudy.contribution.client" class="admin-input mt-1.5" placeholder="e.g. Acme Corp" />
                </div>
                <div v-else>
                  <label class="admin-label">Category</label>
                  <input v-model="draft.category" class="admin-input mt-1.5" placeholder="e.g. Mobile, AI" />
                </div>
              </div>

              <div v-if="!isWorks">
                <label class="admin-label">Live App Demo URL</label>
                <input v-model="draft.externalUrl" type="url" class="admin-input mt-1.5" placeholder="https://..." />
              </div>

              <div>
                <label class="admin-label">Card Summary Description <span class="text-red-500">*</span></label>
                <textarea
                  v-model="draft.description"
                  rows="3"
                  class="admin-input mt-1.5"
                  placeholder="Brief summary appearing on the portfolio grid..."
                  :class="fieldClass('description')"
                />
              </div>

              <div v-if="isWorks">
                <label class="admin-label">Tags</label>
                <div class="mt-1.5 flex gap-2">
                  <input
                    v-model="draft._tagInput"
                    class="admin-input text-sm"
                    placeholder="Type tag & press enter (e.g. Mobile, Healthcare)"
                    @keyup.enter.prevent="addTag"
                  />
                  <button type="button" class="admin-button-secondary text-sm" @click="addTag">Add</button>
                </div>
                <div class="mt-2.5 flex flex-wrap gap-2">
                  <span
                    v-for="(tag, index) in draft.tags"
                    :key="tag"
                    class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
                  >
                    {{ tag }}
                    <button type="button" class="text-gray-400 hover:text-red-500" @click="removeTag(index)">×</button>
                  </span>
                  <span v-if="!draft.tags.length" class="text-xs text-gray-400">No tags added yet.</span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label class="admin-label">Device Frame</label>
                  <select v-model="draft.device" class="admin-input mt-1.5">
                    <option value="phone">Phone Mockup</option>
                    <option value="browser">Browser Mockup</option>
                  </select>
                </div>
                <div>
                  <label class="admin-label">Sort Order</label>
                  <input v-model.number="draft.sortOrder" type="number" min="0" class="admin-input mt-1.5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Preview & Media Col -->
        <div class="lg:col-span-5 space-y-6">
          <div class="admin-card">
            <h2 class="admin-section-title mb-3">Card Media Asset</h2>
            <div class="space-y-4">
              <div>
                <label class="admin-label">Preview Video (MP4 / WebM)</label>
                <input
                  v-model="mediaVideoUrl"
                  type="url"
                  class="admin-input mt-1.5 text-xs font-mono"
                  placeholder="https://cdn.example.com/video.mp4"
                  :class="fieldClass(isWorks ? 'previewVideoUrl' : 'videoUrl')"
                />
              </div>
              <div>
                <label class="admin-label">Preview Image Fallback / Poster</label>
                <input
                  v-model="mediaImageUrl"
                  type="url"
                  class="admin-input mt-1.5 text-xs font-mono"
                  placeholder="https://cdn.example.com/poster.jpg"
                  :class="fieldClass(isWorks ? 'previewImageUrl' : 'imageUrl')"
                />
              </div>
            </div>
          </div>

          <!-- Live Card Frame -->
          <div class="admin-card overflow-hidden !p-0">
            <div class="border-b border-gray-100 bg-gray-50 px-5 py-3 flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-gray-500">Live Card Mockup</span>
              <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                {{ draft.status }}
              </span>
            </div>

            <div class="p-5 flex justify-center bg-[linear-gradient(135deg,#17A6E3,#132132)]">
              <!-- Phone -->
              <div
                v-if="draft.device !== 'browser'"
                class="relative h-[280px] aspect-[9/19] overflow-hidden rounded-[1.4rem] border-4 border-gray-800 bg-gray-900 shadow-2xl"
              >
                <video
                  v-if="mediaVideoUrl"
                  :src="mediaVideoUrl"
                  :poster="mediaImageUrl"
                  autoplay
                  muted
                  loop
                  playsinline
                  class="size-full object-cover"
                />
                <img
                  v-else-if="mediaImageUrl"
                  :src="mediaImageUrl"
                  :alt="draft.title"
                  class="size-full object-cover"
                />
                <div v-else class="flex size-full items-center justify-center p-4 text-center text-xs text-gray-500">
                  No preview asset provided
                </div>
              </div>

              <!-- Browser -->
              <div
                v-else
                class="relative aspect-video w-[90%] overflow-hidden rounded-xl border-4 border-gray-800 bg-gray-900 shadow-2xl"
              >
                <video
                  v-if="mediaVideoUrl"
                  :src="mediaVideoUrl"
                  :poster="mediaImageUrl"
                  autoplay
                  muted
                  loop
                  playsinline
                  class="size-full object-cover"
                />
                <img
                  v-else-if="mediaImageUrl"
                  :src="mediaImageUrl"
                  :alt="draft.title"
                  class="size-full object-cover"
                />
                <div v-else class="flex size-full items-center justify-center p-4 text-center text-xs text-gray-500">
                  No preview asset provided
                </div>
              </div>
            </div>

            <div class="p-5 bg-white space-y-2">
              <div class="flex items-center gap-2">
                <span v-for="tag in draft.tags.slice(0, 3)" :key="tag" class="text-[10px] uppercase font-bold text-[#17A6E3]">
                  {{ tag }}
                </span>
              </div>
              <h3 class="font-bold text-gray-900 leading-snug">
                {{ draft.title || 'Untitled Project' }}
              </h3>
              <p class="text-xs text-gray-500 line-clamp-2">
                {{ draft.description || 'Card description will be displayed here...' }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ========================================== -->
      <!-- TAB 2: HERO & STORY (CASE STUDIES ONLY)   -->
      <!-- ========================================== -->
      <section v-if="isWorks" v-show="activeTab === 'hero'" class="space-y-6">
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <p class="admin-eyebrow">Case study detail page</p>
              <h2 class="admin-section-title">Hero Section & Narrative</h2>
            </div>
          </div>

          <div class="grid gap-6 md:grid-cols-2">
            <div class="space-y-4">
              <div>
                <label class="admin-label">Project Eyebrow Type</label>
                <input v-model="draft.caseStudy.type" class="admin-input mt-1.5" placeholder="e.g. MOBILE APP / FINTECH" />
              </div>

              <div>
                <label class="admin-label">Detail Page Headline (Case Title)</label>
                <textarea
                  v-model="draft.caseStudy.caseTitle"
                  rows="3"
                  class="admin-input mt-1.5 text-lg font-bold"
                  placeholder="e.g. Revolutionizing personal financial tracking through intelligent micro-habits"
                />
              </div>

              <div>
                <label class="admin-label">Hero Description</label>
                <textarea
                  v-model="draft.caseStudy.caseDescription"
                  rows="4"
                  class="admin-input mt-1.5"
                  placeholder="The introductory paragraph summarizing the project goals and impact..."
                />
              </div>

              <div>
                <label class="admin-label">
                  The Overview / Background Story
                  <span class="font-normal text-gray-400">(Chapter 01 Headline)</span>
                </label>
                <textarea
                  v-model="draft.caseStudy.story"
                  rows="6"
                  class="admin-input mt-1.5"
                  placeholder="In-depth narrative introducing the problem and initial requirements..."
                />
              </div>
            </div>

            <!-- Hero Mockup Media -->
            <div class="space-y-4 rounded-2xl bg-gray-50 p-5 border border-gray-200">
              <h3 class="font-semibold text-gray-900">Hero Media Mockup</h3>
              <p class="text-xs text-gray-500">Custom asset displayed prominently at the top of the case study page.</p>

              <div>
                <label class="admin-label">Device Type</label>
                <select v-model="draft.caseStudy.hero.type" class="admin-input mt-1.5">
                  <option value="phone">Phone</option>
                  <option value="browser">Browser</option>
                </select>
              </div>

              <div>
                <label class="admin-label">Hero Video URL</label>
                <input
                  v-model="draft.caseStudy.hero.videoUrl"
                  type="url"
                  class="admin-input mt-1.5 text-xs font-mono"
                  placeholder="https://cdn..."
                />
              </div>

              <div>
                <label class="admin-label">Hero Image Fallback</label>
                <input
                  v-model="draft.caseStudy.hero.imageUrl"
                  type="url"
                  class="admin-input mt-1.5 text-xs font-mono"
                  placeholder="https://cdn..."
                />
              </div>

              <!-- Media Preview Box -->
              <div class="mt-4 rounded-xl border border-gray-200 bg-white p-3">
                <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">Asset Preview</span>
                <div class="h-44 rounded-lg bg-gray-900 flex items-center justify-center overflow-hidden">
                  <video
                    v-if="draft.caseStudy.hero.videoUrl"
                    :src="draft.caseStudy.hero.videoUrl"
                    :poster="draft.caseStudy.hero.imageUrl"
                    controls
                    playsinline
                    class="size-full object-contain"
                  />
                  <img
                    v-else-if="draft.caseStudy.hero.imageUrl"
                    :src="draft.caseStudy.hero.imageUrl"
                    alt="Hero"
                    class="size-full object-contain"
                  />
                  <span v-else class="text-xs text-gray-500">Provide a hero video or image URL to preview</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ========================================== -->
      <!-- TAB 3: ROLE & METRICS (CASE STUDIES ONLY) -->
      <!-- ========================================== -->
      <section v-if="isWorks" v-show="activeTab === 'role'" class="space-y-6">
        <!-- Contribution Card -->
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <p class="admin-eyebrow">Case study page</p>
              <h2 class="admin-section-title">Role & Contribution</h2>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="admin-label">My Role</label>
              <input v-model="draft.caseStudy.contribution.role" class="admin-input mt-1.5" placeholder="e.g. Lead Product Designer" />
            </div>
            <div>
              <label class="admin-label">Discipline</label>
              <input v-model="draft.caseStudy.contribution.discipline" class="admin-input mt-1.5" placeholder="e.g. UX/UI & Prototyping" />
            </div>
          </div>

          <div class="mt-5">
            <label class="admin-label">Scope of Work</label>
            <div class="mt-1.5 flex gap-2">
              <input
                v-model="draft._scopeInput"
                class="admin-input text-sm"
                placeholder="Type scope item (e.g. User Research) and press Enter"
                @keyup.enter.prevent="addScope"
              />
              <button type="button" class="admin-button-secondary text-sm" @click="addScope">Add item</button>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="(item, index) in draft.caseStudy.contribution.scope"
                :key="item"
                class="inline-flex items-center gap-1.5 rounded-full bg-[#BBE6F6] px-3 py-1 text-xs font-semibold text-[#132132]"
              >
                {{ item }}
                <button type="button" class="text-black/60 hover:text-red-600 font-bold" @click="removeScope(index)">×</button>
              </span>
              <span v-if="!draft.caseStudy.contribution.scope.length" class="text-xs text-gray-400">
                No scope items defined yet.
              </span>
            </div>
          </div>
        </div>

        <!-- Metrics & Stats -->
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <p class="admin-eyebrow">Case study page</p>
              <h2 class="admin-section-title">Results & Statistics</h2>
            </div>
            <button type="button" class="admin-button-secondary text-sm" @click="addNumber">+ Add Metric</button>
          </div>

          <div v-if="!draft.caseStudy.numbers.length" class="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
            No statistics added yet. Highlight measurable project outcomes like growth, conversion, or retention.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(stat, index) in draft.caseStudy.numbers"
              :key="index"
              class="flex flex-col sm:flex-row items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-3"
            >
              <div class="w-full sm:w-1/2">
                <input v-model="stat.label" class="admin-input text-sm" placeholder="METRIC LABEL (e.g. RETENTION RATE)" />
              </div>
              <div class="w-full sm:w-1/2">
                <input v-model="stat.value" class="admin-input text-sm font-semibold text-[#17A6E3]" placeholder="VALUE (e.g. +45%)" />
              </div>
              <button
                type="button"
                class="self-end sm:self-center text-xs font-semibold text-red-500 hover:text-red-700 p-2"
                @click="removeNumber(index)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ========================================== -->
      <!-- TAB 4: VISUAL IDENTITY (CASE STUDIES ONLY)-->
      <!-- ========================================== -->
      <section v-if="isWorks" v-show="activeTab === 'visuals'" class="space-y-6">
        <!-- Colors -->
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <p class="admin-eyebrow">Brand System</p>
              <h2 class="admin-section-title">Color Palette</h2>
            </div>
            <button type="button" class="admin-button-secondary text-sm" @click="addColor">+ Add Color</button>
          </div>

          <div class="mb-4">
            <label class="admin-label">Palette Section Title</label>
            <input v-model="draft.caseStudy.visualIdentity.colorsTitle" class="admin-input mt-1.5" placeholder="e.g. Color Palette & Theming" />
          </div>

          <div v-if="!draft.caseStudy.visualIdentity.colors.length" class="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No colors added. Click "+ Add Color" to register palette tokens.
          </div>

          <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="(color, index) in draft.caseStudy.visualIdentity.colors"
              :key="index"
              class="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
            >
              <input v-model="color.hex" type="color" class="h-10 w-12 cursor-pointer rounded-lg border-0 p-0" />
              <div class="flex-1 space-y-1">
                <input v-model="color.name" class="admin-input !py-1 text-xs" placeholder="Color name" />
                <input v-model="color.hex" class="admin-input !py-1 font-mono text-xs" placeholder="#17A6E3" />
              </div>
              <button type="button" class="text-xs text-red-500 hover:text-red-700" @click="removeColor(index)">×</button>
            </div>
          </div>
        </div>

        <!-- Fonts -->
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <p class="admin-eyebrow">Brand System</p>
              <h2 class="admin-section-title">Typography & Fonts</h2>
            </div>
            <button type="button" class="admin-button-secondary text-sm" @click="addFont">+ Add Font</button>
          </div>

          <div class="mb-4">
            <label class="admin-label">Typography Section Title</label>
            <input v-model="draft.caseStudy.visualIdentity.fontsTitle" class="admin-input mt-1.5" placeholder="e.g. Typography & Hierarchy" />
          </div>

          <div v-if="!draft.caseStudy.visualIdentity.fonts.length" class="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No fonts specified yet.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(font, index) in draft.caseStudy.visualIdentity.fonts"
              :key="index"
              class="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3"
            >
              <div class="w-1/3">
                <input v-model="font.label" class="admin-input text-xs" placeholder="USAGE (e.g. PRIMARY HEADLINE)" />
              </div>
              <div class="flex-1">
                <input v-model="font.name" class="admin-input text-xs font-semibold" placeholder="FONT NAME (e.g. Poppins Bold)" />
              </div>
              <button type="button" class="text-xs text-red-500 hover:text-red-700" @click="removeFont(index)">Remove</button>
            </div>
          </div>
        </div>
      </section>

      <!-- ========================================== -->
      <!-- TAB 5: SOLUTIONS (CASE STUDIES ONLY)      -->
      <!-- ========================================== -->
      <section v-if="isWorks" v-show="activeTab === 'solutions'" class="space-y-6">
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <p class="admin-eyebrow">Interactive Presentation</p>
              <h2 class="admin-section-title">Solutions Overview Slides</h2>
            </div>
            <button type="button" class="admin-button-secondary text-sm" @click="addSlide">+ Add Slide</button>
          </div>

          <div class="mb-6">
            <label class="admin-label">Solutions Section Introduction</label>
            <textarea
              v-model="draft.caseStudy.solutionsOverview.description"
              rows="3"
              class="admin-input mt-1.5"
              placeholder="Explain the technical or UX solutions crafted for this project..."
            />
          </div>

          <div v-if="!draft.caseStudy.solutionsOverview.slides.length" class="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
            No solution slides created yet. Add slides with videos or screenshots highlighting individual features.
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="(slide, index) in draft.caseStudy.solutionsOverview.slides"
              :key="index"
              class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
            >
              <div class="flex items-center justify-between border-b border-gray-100 pb-3">
                <span class="font-bold text-sm text-gray-900">Slide #{{ index + 1 }}</span>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    :disabled="index === 0"
                    class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                    title="Move up"
                    @click="moveSlide(index, -1)"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    :disabled="index === draft.caseStudy.solutionsOverview.slides.length - 1"
                    class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                    title="Move down"
                    @click="moveSlide(index, 1)"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    class="ml-2 text-xs font-semibold text-red-500 hover:text-red-700"
                    @click="removeSlide(index)"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="admin-label">Video URL</label>
                  <input v-model="slide.videoUrl" type="url" class="admin-input mt-1.5 text-xs font-mono" placeholder="https://cdn..." />
                </div>
                <div>
                  <label class="admin-label">Image Fallback</label>
                  <input v-model="slide.imageUrl" type="url" class="admin-input mt-1.5 text-xs font-mono" placeholder="https://cdn..." />
                </div>
                <div>
                  <label class="admin-label">Mockup Frame</label>
                  <select v-model="slide.videoType" class="admin-input mt-1.5">
                    <option value="phone">Phone</option>
                    <option value="web">Browser / Web</option>
                  </select>
                </div>
                <div>
                  <label class="admin-label">Display Order</label>
                  <input v-model.number="slide.sortOrder" type="number" min="0" class="admin-input mt-1.5" />
                </div>
              </div>

              <div>
                <label class="admin-label">Slide Caption / Description</label>
                <textarea v-model="slide.description" rows="2" class="admin-input mt-1.5" placeholder="Describe the feature or workflow shown on this slide..." />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ========================================== -->
      <!-- TAB 6: ARTICLE CONTENT (CASE STUDIES ONLY)-->
      <!-- ========================================== -->
      <section v-if="isWorks" v-show="activeTab === 'post'" class="space-y-4">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div class="mb-2">
            <h2 class="admin-section-title">Long-form Post Content</h2>
            <p class="text-sm text-gray-500">Craft detailed narrative chapters using rich media blocks.</p>
          </div>
        </div>
        <AdminPostEditor :post="draft.caseStudy.post" />
      </section>

      <!-- ========================================== -->
      <!-- TAB 2: APPS LAB MEDIA TAB (APPS LAB ONLY) -->
      <!-- ========================================== -->
      <section v-if="!isWorks" v-show="activeTab === 'media'" class="space-y-6">
        <div class="admin-card">
          <h2 class="admin-section-title mb-4">Apps Lab Mockup Asset</h2>
          <div class="grid gap-6 md:grid-cols-2">
            <div class="space-y-4">
              <div>
                <label class="admin-label">Device Type</label>
                <select v-model="draft.device" class="admin-input mt-1.5">
                  <option value="phone">Phone Mockup</option>
                  <option value="browser">Browser Mockup</option>
                </select>
              </div>
              <div>
                <label class="admin-label">Video URL</label>
                <input v-model="mediaVideoUrl" type="url" class="admin-input mt-1.5 text-xs font-mono" placeholder="https://..." />
              </div>
              <div>
                <label class="admin-label">Image Poster / Fallback</label>
                <input v-model="mediaImageUrl" type="url" class="admin-input mt-1.5 text-xs font-mono" placeholder="https://..." />
              </div>
            </div>

            <!-- Preview window -->
            <div class="rounded-2xl bg-gray-900 p-6 flex items-center justify-center min-h-[300px]">
              <div
                v-if="draft.device !== 'browser'"
                class="relative h-[260px] aspect-[9/19] overflow-hidden rounded-[1.2rem] border-4 border-gray-700 bg-black shadow-xl"
              >
                <video v-if="mediaVideoUrl" :src="mediaVideoUrl" :poster="mediaImageUrl" autoplay muted loop playsinline class="size-full object-cover" />
                <img v-else-if="mediaImageUrl" :src="mediaImageUrl" class="size-full object-cover" />
                <div v-else class="flex size-full items-center justify-center text-xs text-gray-500">No media URL</div>
              </div>
              <div
                v-else
                class="relative aspect-video w-[90%] overflow-hidden rounded-lg border-4 border-gray-700 bg-black shadow-xl"
              >
                <video v-if="mediaVideoUrl" :src="mediaVideoUrl" :poster="mediaImageUrl" autoplay muted loop playsinline class="size-full object-cover" />
                <img v-else-if="mediaImageUrl" :src="mediaImageUrl" class="size-full object-cover" />
                <div v-else class="flex size-full items-center justify-center text-xs text-gray-500">No media URL</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Step Navigation Footer -->
      <footer class="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
        <button
          type="button"
          class="admin-button-secondary text-sm disabled:opacity-40"
          :disabled="tabs.findIndex(t => t.id === activeTab) === 0"
          @click="prevTab"
        >
          ← Previous Section
        </button>

        <div class="flex items-center gap-3">
          <button
            v-if="tabs.findIndex(t => t.id === activeTab) < tabs.length - 1"
            type="button"
            class="admin-button-primary text-sm shadow-sm"
            @click="nextTab"
          >
            Next Section →
          </button>
          <button
            v-else
            type="button"
            class="admin-button-dark text-sm shadow-sm"
            :disabled="saving"
            @click="save('published')"
          >
            Ready to Publish
          </button>
        </div>
      </footer>
    </main>

    <!-- Mobile Fixed Bottom Bar -->
    <div class="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-gray-200 bg-white/95 p-3 shadow-2xl backdrop-blur-md sm:hidden">
      <button class="admin-button-secondary flex-1" @click="back">Cancel</button>
      <button class="admin-button-primary flex-1" :disabled="saving" @click="save()">
        {{ saving ? 'Saving…' : 'Save draft' }}
      </button>
      <button class="admin-button-dark px-4" :disabled="saving" @click="save('published')">
        Publish
      </button>
    </div>
  </section>
</template>

<style scoped>
.admin-card {
  border: 1px solid #e5e7eb;
  border-radius: 1.5rem;
  background: white;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
}
@media (min-width: 640px) {
  .admin-card {
    padding: 2rem;
  }
}
.admin-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>