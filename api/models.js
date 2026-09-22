import mongoose from 'mongoose'
const { Schema } = mongoose
const mediaSchema = new Schema({ videoUrl: String, imageUrl: String }, { _id: false })
const statSchema = new Schema({ label: String, value: String }, { _id: false })
const colorSchema = new Schema({ name: String, hex: String }, { _id: false })
const fontSchema = new Schema({ label: String, name: String }, { _id: false })
const slideSchema = new Schema({ videoUrl: String, imageUrl: String, videoType: { type: String, enum: ['phone', 'web'] }, description: String, sortOrder: { type: Number, default: 0 } }, { _id: false })
const baseOptions = { timestamps: true, strict: true, versionKey: false }
const status = { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true }

const contributionSchema = new Schema({ role: String, client: String, year: String, discipline: String, scope: [String] }, { _id: false })
const heroSchema = new Schema({ type: { type: String, enum: ['phone', 'browser'] }, videoUrl: String, imageUrl: String }, { _id: false })
const visualIdentitySchema = new Schema({ colorsTitle: String, colors: [colorSchema], fontsTitle: String, fonts: [fontSchema] }, { _id: false })
const solutionsSchema = new Schema({ description: String, slides: [slideSchema] }, { _id: false })
const caseStudySchema = new Schema({ clientName: String, year: String, type: String, caseTitle: String, caseDescription: String, hero: heroSchema, story: String, contribution: contributionSchema, numbers: [statSchema], visualIdentity: visualIdentitySchema, solutionsOverview: solutionsSchema }, { _id: false })
const workSchema = new Schema({ slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ }, title: { type: String, required: true, trim: true }, description: { type: String, required: true, trim: true }, tags: { type: [String], default: [] }, year: { type: String, default: '' }, device: { type: String, enum: ['phone', 'browser'], default: 'phone' }, previewVideoUrl: { type: String, required: true }, previewImageUrl: String, status, sortOrder: { type: Number, default: 0, min: 0 }, viewCount: { type: Number, default: 0 }, lastViewedAt: Date, publishedAt: Date, caseStudy: { type: caseStudySchema, default: () => ({}) } }, baseOptions)
const labSchema = new Schema({ slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ }, title: { type: String, required: true, trim: true }, description: { type: String, required: true, trim: true }, category: { type: String, default: '' }, categories: { type: [String], default: [] }, device: { type: String, enum: ['phone', 'browser'], default: 'phone' }, videoUrl: { type: String, required: true }, imageUrl: String, externalUrl: String, status, sortOrder: { type: Number, default: 0, min: 0 }, viewCount: { type: Number, default: 0 }, lastViewedAt: Date, publishedAt: Date }, baseOptions)
const adminSchema = new Schema({ email: { type: String, required: true, unique: true, lowercase: true, trim: true }, passwordHash: { type: String, required: true }, role: { type: String, enum: ['admin'], default: 'admin' }, active: { type: Boolean, default: true }, lastLoginAt: Date, passwordChangedAt: Date, sessionVersion: { type: Number, default: 1 }, failedLoginCount: { type: Number, default: 0 }, lockedUntil: Date }, baseOptions)
const settingsSchema = new Schema({ key: { type: String, unique: true, default: 'global' }, maintenanceMode: { type: Boolean, default: false }, maintenanceMessage: { type: String, default: 'Back shortly — the studio is being updated.', maxlength: 500 }, updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' } }, baseOptions)
const auditSchema = new Schema({ actorId: { type: Schema.Types.ObjectId, ref: 'Admin' }, action: { type: String, required: true, index: true }, resourceType: { type: String, required: true, index: true }, resourceId: Schema.Types.ObjectId, resourceSlug: String, resourceTitle: String, summary: String, metadata: { changedFields: [String], statusFrom: String, statusTo: String, requestId: String }, ipHash: String, userAgentFamily: String }, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false })
auditSchema.index({ createdAt: -1 }); auditSchema.index({ resourceType: 1, createdAt: -1 })
const geoSchema = new Schema({ country: String, countryCode: String, continent: String, continentCode: String, region: String, regionName: String, city: String, district: String, zip: String, lat: Number, lon: Number, timezone: String, isp: String, org: String, as: String, proxy: Boolean, hosting: Boolean, mobile: Boolean }, { _id: false })
const analyticsSchema = new Schema({ eventType: { type: String, enum: ['page_view', 'case_study_view', 'lab_view'], required: true, index: true }, path: { type: String, required: true }, resourceType: { type: String, enum: ['page', 'work', 'lab'], default: 'page' }, resourceSlug: String, referrerOrigin: String, anonymousSessionId: { type: String, required: true }, ipAddress: { type: String, required: true, select: false }, ipHash: { type: String, index: true, select: false }, geo: geoSchema, deviceCategory: { type: String, enum: ['mobile', 'tablet', 'desktop', 'unknown'], default: 'unknown' }, occurredAt: { type: Date, default: Date.now, index: true }, expiresAt: { type: Date, index: { expires: 0 } } }, { versionKey: false })
analyticsSchema.index({ resourceType: 1, resourceSlug: 1, occurredAt: -1 }); analyticsSchema.index({ referrerOrigin: 1, occurredAt: -1 })

// Vite/serverless hot reloads can retain a model compiled from the previous
// schema. Drop only that stale model so caseStudy cannot remain a String.
const existingWorkModel = mongoose.models.Work
if (existingWorkModel?.schema.path('caseStudy')?.instance === 'String') {
  delete mongoose.connection.models.Work
}

export const Work = mongoose.models.Work || mongoose.model('Work', workSchema)
export const Lab = mongoose.models.Lab || mongoose.model('Lab', labSchema)
export const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema)
export const SiteSettings = mongoose.models.SiteSettings || mongoose.model('SiteSettings', settingsSchema)
export const AuditEvent = mongoose.models.AuditEvent || mongoose.model('AuditEvent', auditSchema)
export const AnalyticsEvent = mongoose.models.AnalyticsEvent || mongoose.model('AnalyticsEvent', analyticsSchema)
