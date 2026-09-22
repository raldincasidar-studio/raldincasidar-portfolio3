import crypto from 'node:crypto'
import { AuditEvent } from './models.js'

export function requestId(req) { return req.headers['x-request-id'] || crypto.randomUUID() }
export function safeOrigin(value) { try { const url = new URL(value); return url.origin } catch { return undefined } }
export async function recordAudit(req, data) {
  try {
    await AuditEvent.create({ ...data, actorId: data.actorId || req.auth?.sub, metadata: { ...(data.metadata || {}), requestId: requestId(req) }, userAgentFamily: req.headers['user-agent']?.split(' ')[0]?.slice(0, 80) })
  } catch (error) { console.error(`audit write failed: ${error.message}`) }
}
