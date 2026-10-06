import { marked } from 'marked'
import { toPlainText } from './richText.js'

/**
 * Structured post-content blocks.
 *
 * Post content is stored as an array of typed blocks rather than raw HTML or
 * Markdown so that every value can be validated at the API boundary and
 * rendered without any markup injection. Text fields still accept inline
 * Markdown (see `richText.js`).
 *
 * Block reference:
 *   heading    { level: 1|2|3, text }
 *   paragraph  { text }
 *   list       { ordered: boolean, items: string[] }
 *   quote      { text, cite? }
 *   image      { mediaType: 'image'|'video', url, alt?, caption?, href? }
 *   gallery    { galleryItems: [{ mediaType, url, alt?, caption?, href? }] }
 *   divider    {}
 */

export const BLOCK_LIBRARY = [
  { type: 'heading', level: 1, label: 'Heading 1', hint: 'Largest section title', icon: 'H1' },
  { type: 'heading', level: 2, label: 'Heading 2', hint: 'Breaks a long post up', icon: 'H2' },
  { type: 'heading', level: 3, label: 'Heading 3', hint: 'Smallest heading', icon: 'H3' },
  { type: 'paragraph', label: 'Paragraph', hint: 'Body text with inline formatting', icon: '¶' },
  { type: 'list', ordered: false, label: 'Bulleted list', hint: 'Bullet points', icon: '•' },
  { type: 'list', ordered: true, label: 'Numbered list', hint: 'Steps or a ranking', icon: '1.' },
  { type: 'quote', label: 'Quote', hint: 'Pull-quote with optional source', icon: '❝' },
  { type: 'image', label: 'Image or video', hint: 'One full-width visual', icon: '▣' },
  { type: 'gallery', label: 'Gallery', hint: 'A row of captioned visuals', icon: '▤' },
  { type: 'divider', label: 'Divider', hint: 'Visually separates sections', icon: '—' },
]

export function emptyPost() {
  return { intro: '', blocks: [] }
}

export function createBlock(type, level = 1, ordered = false) {
  switch (type) {
    case 'heading':
      return { type: 'heading', level, text: '' }
    case 'paragraph':
      return { type: 'paragraph', text: '' }
    case 'list':
      return { type: 'list', ordered, items: [''] }
    case 'quote':
      return { type: 'quote', text: '', cite: '' }
    case 'image':
      return { type: 'image', mediaType: 'image', url: '', alt: '', caption: '', href: '' }
    case 'gallery':
      return { type: 'gallery', galleryItems: [createMediaItem()] }
    case 'divider':
      return { type: 'divider' }
    default:
      return { type: 'paragraph', text: '' }
  }
}

export function createMediaItem(overrides = {}) {
  return { mediaType: 'image', url: '', alt: '', caption: '', href: '', ...overrides }
}

export function blockLabel(block) {
  if (!block) return 'Block'
  if (block.type === 'heading') return `Heading ${block.level || 1}`
  return BLOCK_LIBRARY.find((entry) => entry.type === block.type && (entry.level == null || entry.level === block.level))?.label || block.type
}

/** A short, human summary of a block for its card header. */
export function blockSummary(block) {
  if (!block) return ''
  const clip = (value, max = 70) => {
    const text = toPlainText(value)
    return text.length > max ? `${text.slice(0, max - 1)}…` : text
  }
  switch (block.type) {
    case 'heading':
    case 'paragraph':
    case 'quote':
      return clip(block.text)
    case 'list':
      return clip((block.items || []).filter(Boolean).join(' · '))
    case 'image':
      return clip(block.caption) || (block.url ? 'Media attached' : 'No media yet')
    case 'gallery':
      return `${(block.galleryItems || []).length} item${(block.galleryItems || []).length === 1 ? '' : 's'}`
    default:
      return ''
  }
}

/** True when a block has enough content to be worth saving. */
export function blockHasContent(block) {
  if (!block) return false
  switch (block.type) {
    case 'heading':
    case 'paragraph':
    case 'quote':
      return Boolean(block.text?.trim())
    case 'list':
      return Boolean((block.items || []).some((item) => item?.trim()))
    case 'image':
      return Boolean(block.url?.trim())
    case 'gallery':
      return Boolean((block.galleryItems || []).some((item) => item?.url?.trim()))
    case 'divider':
      return true
    default:
      return false
  }
}

/** Drop empty/incomplete blocks and tidy arrays before the payload is sent. */
export function prunePost(post) {
  if (!post) return emptyPost()
  return {
    intro: String(post.intro || ''),
    blocks: (post.blocks || []).filter(blockHasContent).map((block) => {
      if (block.type === 'list') return { ...block, items: (block.items || []).map((item) => String(item).trim()).filter(Boolean) }
      if (block.type === 'gallery') {
        return {
          ...block,
          galleryItems: (block.galleryItems || [])
            .filter((item) => item?.url?.trim())
            .map((item) => ({ mediaType: item.mediaType === 'video' ? 'video' : 'image', url: item.url.trim(), alt: String(item.alt || ''), caption: String(item.caption || ''), href: String(item.href || '') })),
        }
      }
      if (block.type === 'image') return { ...block, mediaType: block.mediaType === 'video' ? 'video' : 'image', url: String(block.url || '').trim() }
      return { ...block }
    }),
  }
}

/**
 * Anchor id for a heading, namespaced so it can never collide with an id that
 * already exists on the case-study page. Falls back to `post-section` when the
 * heading has no letters or numbers to work with.
 */
export function slugifyHeading(text) {
  const slug = toPlainText(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '')
  return `post-${slug || 'section'}`
}

/**
 * The heading index behind the "on this page" navigation: every heading block
 * in document order, with the exact id `PostContent` renders on that heading.
 * Duplicate titles get a `-2`, `-3`, … suffix so anchors stay unique.
 *
 * Reads from `normalizePost` so the ids always match what is actually drawn —
 * blocks dropped as empty still produce no anchor.
 */
export function buildPostHeadings(post) {
  const { blocks } = normalizePost(post)
  const seen = new Map()
  const headings = []
  blocks.forEach((block, blockIndex) => {
    if (block.type !== 'heading') return
    const text = toPlainText(block.text).trim()
    if (!text) return
    const base = slugifyHeading(text)
    const count = seen.get(base) || 0
    seen.set(base, count + 1)
    headings.push({
      id: count ? `${base}-${count + 1}` : base,
      text,
      level: Math.min(Math.max(Number(block.level) || 1, 1), 3),
      blockIndex,
    })
  })
  return headings
}

/** Defensive shape for rendering API data — never throws on partial content. */
export function normalizePost(post) {
  const source = post && typeof post === 'object' ? post : {}
  const blocks = Array.isArray(source.blocks) ? source.blocks : []
  return {
    intro: String(source.intro || ''),
    blocks: blocks.filter((block) => block && typeof block === 'object' && block.type).filter(blockHasContent).map((block) => ({
      ...block,
      items: Array.isArray(block.items) ? block.items.filter((item) => typeof item === 'string' && item.trim()) : [],
      galleryItems: Array.isArray(block.galleryItems)
        ? block.galleryItems.filter((item) => item?.url).map((item) => ({
            mediaType: item.mediaType === 'video' ? 'video' : 'image',
            url: String(item.url),
            alt: String(item.alt || ''),
            caption: String(item.caption || ''),
            href: String(item.href || ''),
          }))
        : [],
    }))
  }
}

export function postHasContent(post) {
  const normalized = normalizePost(post)
  return Boolean(normalized.intro.trim()) || normalized.blocks.length > 0
}

/** Word count + estimated reading time, shown in the admin editor. */
export function postStats(post) {
  const normalized = normalizePost(post)
  const parts = [normalized.intro]
  for (const block of normalized.blocks) {
    if (block.text) parts.push(block.text)
    if (block.items?.length) parts.push(block.items.join(' '))
    if (block.caption) parts.push(block.caption)
    // A visual is roughly a sentence worth of reading pause.
    if (block.type === 'image' || block.type === 'gallery') parts.push('picture')
  }
  const words = parts.join(' ').split(/\s+/).filter(Boolean).length
  return { words, blocks: normalized.blocks.length, minutes: Math.max(1, Math.round(words / 225)) }
}

/**
 * Convert a Markdown document into blocks so a draft can be pasted straight
 * into the editor. Returns the blocks plus notes about anything transformed.
 */
export function blocksFromMarkdown(markdown) {
  const source = String(markdown || '').replace(/\r\n/g, '\n')
  if (!source.trim()) return { blocks: [], notes: ['Nothing to convert — the Markdown was empty.'] }

  const notes = []
  const blocks = []
  let tokens
  try {
    tokens = marked.lexer(source)
  } catch (error) {
    return { blocks: [], notes: [`Could not read that Markdown: ${error.message}`] }
  }

  const media = (token) => createMediaItem({ url: token.href || '', alt: String(token.text || '').trim(), mediaType: /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(token.href || '') ? 'video' : 'image' })

  for (const token of tokens) {
    if (!token || token.type === 'space') continue

    if (token.type === 'heading') {
      const level = Math.min(Math.max(token.depth || 1, 1), 3)
      if (token.depth > 3) notes.push(`“${toPlainText(token.text).slice(0, 40)}” was demoted to Heading 3.`)
      blocks.push({ type: 'heading', level, text: token.text || '' })
      continue
    }

    if (token.type === 'paragraph') {
      const children = token.tokens || []
      // Line breaks and whitespace carry no meaning of their own here.
      const ignorable = (child) => child.type === 'br' || (child.type === 'text' && !child.text?.trim())
      const images = children.filter((child) => child.type === 'image')
      const textMarkdown = children
        .filter((child) => child.type !== 'image' && !ignorable(child) && !(child.type === 'br'))
        .map((child) => child.raw ?? child.text ?? '')
        .join('')
        .trim()

      if (images.length) {
        if (textMarkdown) {
          notes.push('An image that shared a line with text was moved to its own block.')
          blocks.push({ type: 'paragraph', text: textMarkdown })
        }
        if (images.length === 1) blocks.push({ type: 'image', ...media(images[0]), caption: '' })
        else blocks.push({ type: 'gallery', galleryItems: images.map((image) => media(image)) })
        continue
      }
      blocks.push({ type: 'paragraph', text: String(token.raw || '').trim() })
      continue
    }

    if (token.type === 'list') {
      blocks.push({ type: 'list', ordered: Boolean(token.ordered), items: (token.items || []).map((item) => String(item.text || '').trim()).filter(Boolean) })
      continue
    }

    if (token.type === 'blockquote') {
      const text = String(token.text || '').split('\n').map((line) => line.replace(/^\s*>\s?/, '')).join(' ').trim()
      if (text) blocks.push({ type: 'quote', text, cite: '' })
      continue
    }

    if (token.type === 'hr') {
      blocks.push({ type: 'divider' })
      continue
    }

    if (token.type === 'code') {
      notes.push('A code block was converted to inline code inside a paragraph.')
      blocks.push({ type: 'paragraph', text: String(token.text || '').split('\n').map((line) => `\`${line}\``).join('\n') })
      continue
    }

    if (token.type === 'table') {
      notes.push('A table was converted to plain text — paste it as a list instead.')
      const rows = (token.header || []).map((cell) => cell.text).join(' · ')
      const body = (token.rows || []).map((row) => row.map((cell) => cell.text).join(' · '))
      blocks.push({ type: 'paragraph', text: [rows, ...body].filter(Boolean).join('\n') })
      continue
    }

    if (token.raw?.trim()) blocks.push({ type: 'paragraph', text: String(token.raw).trim() })
  }

  if (!blocks.length) notes.push('No blocks were recognised in that Markdown.')
  return { blocks, notes }
}
