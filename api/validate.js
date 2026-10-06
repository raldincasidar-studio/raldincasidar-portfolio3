import { isIP } from 'node:net'
import { z } from 'zod'
// `z.string().url()` accepts any scheme (including `javascript:` and `data:`),
// so restrict asset/link URLs to http(s) before they can reach a public page.
const url = z.string().url().refine((value) => /^https?:\/\//i.test(value), 'Only http:// or https:// URLs are allowed').refine((value) => process.env.NODE_ENV !== 'production' || value.startsWith('https://'), 'Asset URLs must use HTTPS in production')
const status = z.enum(['draft', 'published', 'archived']).default('draft')
export const idParam = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i) })
export const loginSchema = z.object({ email: z.string().email().max(200), password: z.string().min(8).max(200) })
export const passwordSchema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(12).max(200), confirmPassword: z.string().min(12).max(200) }).refine((data) => data.newPassword === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
export const settingsSchema = z.object({ maintenanceMode: z.boolean(), maintenanceMessage: z.string().min(1).max(500) })
const geoFields = z.object({ country: z.string().max(100).optional(), countryCode: z.string().max(4).optional(), continent: z.string().max(100).optional(), continentCode: z.string().max(4).optional(), region: z.string().max(20).optional(), regionName: z.string().max(100).optional(), city: z.string().max(100).optional(), district: z.string().max(100).optional(), zip: z.string().max(30).optional(), lat: z.number().finite().optional(), lon: z.number().finite().optional(), timezone: z.string().max(100).optional(), isp: z.string().max(200).optional(), org: z.string().max(200).optional(), as: z.string().max(200).optional(), proxy: z.boolean().optional(), hosting: z.boolean().optional(), mobile: z.boolean().optional() }).optional()
export const analyticsEventSchema = z.object({ eventType: z.enum(['page_view', 'case_study_view', 'lab_view']), path: z.string().regex(/^\/[a-zA-Z0-9\-_/]*$/).max(200), resourceType: z.enum(['page', 'work', 'lab']).default('page'), resourceSlug: z.string().max(120).optional(), referrerOrigin: z.string().url().max(300).optional(), anonymousSessionId: z.string().min(8).max(100), ipAddress: z.string().max(45).refine((value) => isIP(value) !== 0, 'Enter a valid IPv4 or IPv6 address').optional(), geo: geoFields, deviceCategory: z.enum(['mobile', 'tablet', 'desktop', 'unknown']).default('unknown') })
/* ── Long-form post content (case study chapter 03) ─────────────────────
   Blocks are validated per type so an incomplete block can never be stored.
   Limits keep a single work document well inside the 1 MB request cap.     */
const postMediaSchema = z.object({
  mediaType: z.enum(['image', 'video']).default('image'),
  url,
  alt: z.string().max(300).optional().default(''),
  caption: z.string().max(800).optional().default(''),
  href: url.optional().or(z.literal('')),
})
export const postBlockSchema = z.object({
  type: z.enum(['heading', 'paragraph', 'list', 'quote', 'image', 'gallery', 'divider']),
  level: z.number().int().min(1).max(3).optional(),
  text: z.string().max(8000).optional(),
  cite: z.string().max(300).optional(),
  ordered: z.boolean().optional().default(false),
  items: z.array(z.string().max(2000)).max(60).optional(),
  mediaType: z.enum(['image', 'video']).optional(),
  url: url.optional(),
  alt: z.string().max(300).optional(),
  caption: z.string().max(800).optional(),
  href: url.optional().or(z.literal('')),
  galleryItems: z.array(postMediaSchema).max(24).optional(),
}).superRefine((block, ctx) => {
  const require = (ok, path, message) => { if (!ok) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message }) }
  if (block.type === 'heading') { require(Boolean(block.text?.trim()), 'text', 'Heading text is required.'); require(Boolean(block.level), 'level', 'Heading level is required.') }
  if (block.type === 'paragraph') require(Boolean(block.text?.trim()), 'text', 'Paragraph text is required.')
  if (block.type === 'quote') require(Boolean(block.text?.trim()), 'text', 'Quote text is required.')
  if (block.type === 'list') require(Boolean(block.items?.filter((item) => item?.trim()).length), 'items', 'Add at least one list item.')
  if (block.type === 'image') require(Boolean(block.url), 'url', 'Add an image or video URL.')
  if (block.type === 'gallery') require(Boolean(block.galleryItems?.length), 'galleryItems', 'Add at least one gallery item.')
})
export const postSchema = z.object({ intro: z.string().max(1200).optional(), blocks: z.array(postBlockSchema).max(200).optional() })

const common = { slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), title: z.string().min(1).max(200), description: z.string().min(1).max(5000), status, sortOrder: z.number().int().min(0).default(0) }
export const workSchema = z.object({ ...common, tags: z.array(z.string().max(80)).default([]), year: z.string().max(30).default(''), device: z.enum(['phone', 'browser']).default('phone'), previewVideoUrl: url, previewImageUrl: url.optional(), caseStudy: z.record(z.any()).superRefine((value, ctx) => {
  if (!value?.post) return
  const result = postSchema.safeParse(value.post)
  if (result.success) return
  for (const issue of result.error.issues) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['post', ...issue.path], message: issue.message })
}).optional() })
export const labSchema = z.object({ ...common, category: z.string().max(200).default(''), categories: z.array(z.string().max(80)).default([]), device: z.enum(['phone', 'browser']).default('phone'), videoUrl: url, imageUrl: url.optional(), externalUrl: url.optional() })
export function parse(schema, body) { const result = schema.safeParse(body); if (!result.success) { const error = new Error('Validation failed'); error.status = 422; error.details = result.error.flatten(); throw error }; return result.data }
