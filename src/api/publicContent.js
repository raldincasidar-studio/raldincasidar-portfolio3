import { apiFetch } from './client.js'

const cache = { home: null, homePromise: null, works: new Map() }
const TTL = 60_000

function fresh(entry) { return entry && Date.now() - entry.loadedAt < TTL }

export function normalizeWork(work) {
  return {
    ...work,
    id: work.slug,
    tags: Array.isArray(work.tags) ? work.tags.join(', ') : (work.tags || ''),
    videoSrc: work.previewVideoUrl || '',
    imageSrc: work.previewImageUrl || '',
    href: `/case-study/${encodeURIComponent(work.slug)}`,
  }
}

export function normalizeLab(lab) {
  return { ...lab, id: lab.slug, videoSrc: lab.videoUrl || '', imageSrc: lab.imageUrl || '', category: lab.category || (lab.categories || []).join(', ') }
}

export function normalizeCaseStudy(work) {
  const data = work.caseStudy || {}
  return {
    ...work,
    client_name: data.clientName || '', year: data.year || work.year || '', type: data.type || '',
    case_title: data.caseTitle || work.title || '', case_description: data.caseDescription || work.description || '',
    hero_video: { type: data.hero?.type || work.device || 'phone', src: data.hero?.videoUrl || work.previewVideoUrl || '', poster: data.hero?.imageUrl || work.previewImageUrl || '' },
    the_story: data.story || '', contribution: data.contribution || { role: '', client: '', year: '', discipline: '', scope: [] }, numbers: data.numbers || [],
    visual_identity: { colors_title: data.visualIdentity?.colorsTitle || '', colors_list: data.visualIdentity?.colors || [], fonts_title: data.visualIdentity?.fontsTitle || '', fonts_list: data.visualIdentity?.fonts || [] },
    solutions_overview: { description: data.solutionsOverview?.description || '', slides: (data.solutionsOverview?.slides || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((slide) => ({ video_url: slide.videoUrl || '', image_url: slide.imageUrl || '', video_type: slide.videoType || 'phone', description: slide.description || '' })) },
  }
}

export async function getHomeContent() {
  if (fresh(cache.home)) return cache.home.data
  if (!cache.homePromise) cache.homePromise = Promise.all([apiFetch('/works'), apiFetch('/labs')]).then(([works, labs]) => { const data = { works: works.data.map(normalizeWork), labs: labs.data.map(normalizeLab) }; cache.home = { data, loadedAt: Date.now() }; return data }).finally(() => { cache.homePromise = null })
  return cache.homePromise
}

export async function getWork(slug) {
  const cached = cache.works.get(slug)
  if (fresh(cached)) return cached.data
  const data = normalizeCaseStudy((await apiFetch(`/works/${encodeURIComponent(slug)}`)).data)
  cache.works.set(slug, { data, loadedAt: Date.now() })
  return data
}

export function clearPublicCache() { cache.home = null; cache.works.clear() }
