import { z } from 'zod'
const url = z.string().url().refine((value) => process.env.NODE_ENV !== 'production' || value.startsWith('https://'), 'Asset URLs must use HTTPS in production')
const status = z.enum(['draft', 'published', 'archived']).default('draft')
export const idParam = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i) })
export const loginSchema = z.object({ email: z.string().email().max(200), password: z.string().min(8).max(200) })
export const passwordSchema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(12).max(200), confirmPassword: z.string().min(12).max(200) }).refine((data) => data.newPassword === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
export const settingsSchema = z.object({ maintenanceMode: z.boolean(), maintenanceMessage: z.string().min(1).max(500) })
export const analyticsEventSchema = z.object({ eventType: z.enum(['page_view', 'case_study_view', 'lab_view']), path: z.string().regex(/^\/[a-zA-Z0-9\-_/]*$/).max(200), resourceType: z.enum(['page', 'work', 'lab']).default('page'), resourceSlug: z.string().max(120).optional(), referrerOrigin: z.string().url().max(300).optional(), anonymousSessionId: z.string().min(8).max(100), deviceCategory: z.enum(['mobile', 'tablet', 'desktop', 'unknown']).default('unknown') })
const common = { slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), title: z.string().min(1).max(200), description: z.string().min(1).max(5000), status, sortOrder: z.number().int().min(0).default(0) }
export const workSchema = z.object({ ...common, tags: z.array(z.string().max(80)).default([]), year: z.string().max(30).default(''), device: z.enum(['phone', 'browser']).default('phone'), previewVideoUrl: url, previewImageUrl: url.optional(), caseStudy: z.record(z.any()).optional() })
export const labSchema = z.object({ ...common, category: z.string().max(200).default(''), categories: z.array(z.string().max(80)).default([]), device: z.enum(['phone', 'browser']).default('phone'), videoUrl: url, imageUrl: url.optional(), externalUrl: url.optional() })
export function parse(schema, body) { const result = schema.safeParse(body); if (!result.success) { const error = new Error('Validation failed'); error.status = 422; error.details = result.error.flatten(); throw error }; return result.data }
