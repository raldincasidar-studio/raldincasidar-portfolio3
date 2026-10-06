import { marked } from 'marked'
import DOMPurify from 'dompurify'

/**
 * Inline rich text for post content.
 *
 * Authored text supports a small, safe subset of Markdown — bold, italic,
 * strike, inline code, links and hard line breaks. Everything is rendered
 * through `marked` and then sanitised, so stored content can never inject
 * markup or script into a public page.
 *
 * Raw HTML authored in the field is dropped before rendering.
 */

const ALLOWED_TAGS = ['strong', 'em', 'b', 'i', 'u', 's', 'del', 'mark', 'code', 'br', 'a', 'sub', 'sup', 'small']
const ALLOWED_ATTR = ['href', 'target', 'rel']
const FALLBACK_TAGS = new Set(['strong', 'em', 'b', 'i', 'u', 's', 'del', 'mark', 'code', 'br', 'a', 'sub', 'sup', 'small'])

// Markdown is our own output, but any literal HTML the author typed must not
// survive. Disabling the `html` renderer removes raw HTML at the source.
marked.use({
  gfm: true,
  breaks: true,
  renderer: { html: () => '' },
})

let hookReady = false
function ensureLinkHook() {
  if (hookReady || typeof window === 'undefined') return
  hookReady = true
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer nofollow')
    }
  })
}

/** Minimal allow-list sanitiser used when there is no DOM (tests/SSR). */
function fallbackStrip(html) {
  // Track anchors so a link whose `href` is rejected (javascript:, data:, …)
  // drops its closing tag too instead of leaking a stray `</a>` into the page.
  let openAnchors = 0
  return String(html).replace(/<\s*\/?\s*([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, tag) => {
    const name = tag.toLowerCase()
    if (!FALLBACK_TAGS.has(name)) return ''
    if (name === 'br') return '<br>'
    const closing = /^<\s*\//.test(match)
    if (name === 'a') {
      if (closing) {
        if (!openAnchors) return ''
        openAnchors -= 1
        return '</a>'
      }
      const href = match.match(/href\s*=\s*"([^"]*)"/i)?.[1] || ''
      if (!/^https?:\/\//i.test(href)) return ''
      openAnchors += 1
      return `<a href="${href}" target="_blank" rel="noopener noreferrer nofollow">`
    }
    return closing ? `</${name}>` : `<${name}>`
  })
}

function sanitize(html) {
  if (typeof window === 'undefined' || typeof DOMPurify?.sanitize !== 'function') return fallbackStrip(html)
  ensureLinkHook()
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR, ALLOW_DATA_ATTR: false, KEEP_CONTENT: true })
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Render authored inline Markdown to sanitised HTML. */
export function renderInline(value) {
  const source = String(value ?? '').trim()
  if (!source) return ''
  let html
  try {
    html = marked.parseInline(source)
  } catch {
    html = escapeHtml(source)
  }
  return sanitize(html)
}

/** Strip Markdown for plain-text uses (meta descriptions, admin previews). */
export function toPlainText(value) {
  const source = String(value ?? '')
  if (!source) return ''
  return source
    // Raw HTML is dropped when rendering, so it must not leak into labels,
    // anchors, summaries or word counts either.
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Wrap or insert inline Markdown around the current textarea selection.
 * Returns the new value plus the selection to restore.
 */
export function applyInlineFormat(value, selectionStart, selectionEnd, kind) {
  const source = String(value ?? '')
  const start = Number.isInteger(selectionStart) ? selectionStart : source.length
  const end = Number.isInteger(selectionEnd) ? selectionEnd : start
  const selected = source.slice(start, end)
  const pairs = {
    bold: ['**', '**', 'bold text'],
    italic: ['*', '*', 'italic text'],
    code: ['`', '`', 'code'],
    link: ['[', '](https://)', 'link text'],
    strike: ['~~', '~~', 'strikethrough'],
  }
  const [before, after, hint] = pairs[kind] || ['', '', '']
  const body = selected || (kind === 'link' ? hint : '')
  const next = `${source.slice(0, start)}${before}${body}${after}${source.slice(end)}`
  const selectFrom = start + before.length
  return { value: next, selectionStart: selectFrom, selectionEnd: selectFrom + body.length }
}
