/**
 * Scroll-spy maths for the "on this page" navigation.
 *
 * Kept as a pure function so the active-heading and reading-progress rules can
 * be tested without a browser. `headingTops` are document-relative offsets in
 * the same order as `headings`, and `offset` is the sticky-header height the
 * anchor should clear.
 */
export function clamp(value, min, max) {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

export function computeScrollSpy({
  headings = [],
  headingTops = [],
  containerTop = 0,
  containerHeight = 0,
  scrollY = 0,
  innerHeight = 0,
  offset = 0,
  /** Ignore the last stretch so the final heading activates before the footer. */
  tailFraction = 0.35,
}) {
  if (!headings.length) return { activeId: '', progress: 0 }

  // ── Reading progress through the chapter ──────────────────────────────
  // Measured from the top of the post to the point where the chapter has
  // almost left the viewport, so the bar fills just as the reader finishes.
  const span = containerHeight - innerHeight * tailFraction
  const seen = scrollY + innerHeight * 0.5 - containerTop
  const progress = span > 0 ? clamp(seen / span, 0, 1) : seen > 0 ? 1 : 0

  // ── Active heading: the last one anchored above the offset line ───────
  // `headingTops` are document-relative, so the line the reader has crossed is
  // scrollY + offset — comparing against `offset` alone would leave the first
  // heading highlighted for the whole chapter.
  const line = scrollY + offset
  let activeId = headings[0].id
  for (let index = 0; index < headings.length; index += 1) {
    const top = headingTops[index]
    // A heading whose element is missing measures as NaN — skip it rather than
    // stopping the walk (`typeof NaN === 'number'`, so isFinite is the check).
    if (!Number.isFinite(top)) continue
    if (top <= line) activeId = headings[index].id
    else break
  }

  return { activeId, progress }
}

/**
 * The top the page should scroll to so `headingTop` lands just below the
 * sticky header stack, never above the top of the document.
 */
export function anchorScrollTop(headingTop, offset, maxScroll) {
  const target = headingTop - offset
  const limit = typeof maxScroll === 'number' && maxScroll > 0 ? maxScroll : Number.POSITIVE_INFINITY
  return Math.round(clamp(target, 0, limit))
}
