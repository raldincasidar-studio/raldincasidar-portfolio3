import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../api/index.js'
import { seal, unseal, imageType, mediaType, directLink, dropboxRequest } from '../api/dropbox.js'

test('Dropbox credentials are authenticated encrypted and reject tampering', () => {
  process.env.DROPBOX_ENCRYPTION_KEY = 'a'.repeat(64)
  const encrypted = seal('refresh-token-example')
  assert.ok(!encrypted.includes('refresh-token-example'))
  assert.equal(unseal(encrypted), 'refresh-token-example')
  const pieces = encrypted.split('.'); pieces[2] = Buffer.alloc(16).toString('base64url')
  assert.throws(() => unseal(pieces.join('.')))
})
test('image signatures and public direct link normalization', () => {
  assert.equal(imageType(Buffer.from([137,80,78,71,13,10,26,10])), 'image/png')
  assert.equal(imageType(Buffer.from('<svg>')), null)
  assert.equal(directLink('https://www.dropbox.com/s/abc/a.png?dl=0'), 'https://dl.dropboxusercontent.com/s/abc/a.png')
  assert.equal(directLink('https://www.dropbox.com/scl/fi/abc/shot.png?rlkey=key&st=state&dl=0&raw=1'), 'https://dl.dropboxusercontent.com/scl/fi/abc/shot.png?rlkey=key&st=state')
  assert.throws(() => directLink('https://attacker.example/a'))
  assert.equal(mediaType(Buffer.from([0,0,0,20,102,116,121,112,105,115,111,109])), 'video/mp4')
  assert.equal(mediaType(Buffer.from([0x1a,0x45,0xdf,0xa3])), 'video/webm')
})
test('Dropbox request formats no-arg and unicode upload correctly', async () => {
  const seen = []; const fetcher = async (url, options) => { seen.push({ url, options }); return new Response('{}', { status: 200 }) }
  await dropboxRequest('users/get_space_usage', 'secret', undefined, { fetcher })
  assert.equal(seen[0].options.body, undefined); assert.equal(seen[0].options.headers['Content-Type'], undefined)
  await dropboxRequest('files/upload', 'secret', Buffer.from('x'), { fetcher, content: true, arg: { path: '/é.png' } })
  assert.match(seen[1].options.headers['Dropbox-API-Arg'], /\\u00e9/)
  assert.equal(seen[1].options.body.toString(), 'x')
})
test('Dropbox API errors are sanitized and retain request ID', async () => {
  const fetcher = async () => new Response('{"error_summary":"secret"}', { status: 403, headers: { 'x-dropbox-request-id': 'req-123' } })
  await assert.rejects(dropboxRequest('files/list_folder', 'secret', {}, { fetcher }), e => e.message.includes('req-123') && !e.message.includes('secret'))
})
test('Dropbox endpoints reject unauthenticated users', async () => {
  for (const [method, url] of [['get','/api/admin/dropbox/connection'], ['get','/api/admin/dropbox/usage'], ['post','/api/admin/dropbox/files/link'], ['delete','/api/admin/dropbox/files'], ['get','/api/admin/dropbox/preview?id=id:abc123']]) {
    const r = await request(app)[method](url); assert.equal(r.status, 401)
  }
})

test('upload route returns untagged Dropbox file metadata and preserves autorenamed path', async () => {
  const { Admin, DropboxIntegration, AuditEvent } = await import('../api/models.js')
  const jwt = (await import('jsonwebtoken')).default
  const original = { findAdmin: Admin.findById, findIntegration: DropboxIntegration.findOne, audit: AuditEvent.create, fetch: globalThis.fetch, conn: globalThis.__mongooseCache.conn, secret: process.env.JWT_SECRET, encryption: process.env.DROPBOX_ENCRYPTION_KEY }
  process.env.JWT_SECRET = 'test-only-jwt-secret'
  process.env.DROPBOX_ENCRYPTION_KEY = 'b'.repeat(64)
  const calls = []
  try {
    globalThis.__mongooseCache.conn = {}
    Admin.findById = () => ({ lean: async () => ({ active: true, sessionVersion: 1 }) })
    DropboxIntegration.findOne = () => ({ select: async () => ({ appKey: 'testkey', refreshToken: seal('test-refresh') }) })
    AuditEvent.create = async () => ({})
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options })
      if (url.endsWith('/oauth2/token')) return new Response(JSON.stringify({ access_token: 'test-token', expires_in: 14400 }), { status: 200 })
      if (url.endsWith('/files/get_metadata')) return new Response(JSON.stringify({ '.tag': 'file', name: 'photo.png', id: 'id:abc123', path_display: '/photo.png', size: 8, rev: 'rev1' }), { status: 200 })
      if (url.endsWith('/files/get_thumbnail_v2')) return new Response(Buffer.from([255,216,255,217]), { status: 200, headers: { 'Content-Type': 'image/jpeg' } })
      if (url.endsWith('/sharing/list_shared_links')) return new Response(JSON.stringify({ links: [{ url: 'https://www.dropbox.com/scl/fi/abc/photo.png?rlkey=key&st=state&dl=0', link_permissions: { resolved_visibility: { '.tag': 'public' } } }] }), { status: 200 })
      if (url.endsWith('/files/upload')) return new Response(JSON.stringify({ name: 'photo (1).png', id: 'id:abc123', path_display: '/photo (1).png', size: 8, rev: 'rev1', server_modified: '2026-01-01T00:00:00Z' }), { status: 200 })
      throw new Error('Unexpected request')
    }
    const session = jwt.sign({ sub: '507f1f77bcf86cd799439011', sessionVersion: 1 }, process.env.JWT_SECRET)
    const response = await request(app).post('/api/admin/dropbox/files?path=&name=photo.png')
      .set('Cookie', `portfolio_admin_token=${session}`).set('Origin', 'http://localhost:5173')
      .set('Content-Type', 'application/octet-stream').send(Buffer.from([137,80,78,71,13,10,26,10]))
    assert.equal(response.status, 200)
    assert.deepEqual(response.body.data, { type: 'file', id: 'id:abc123', name: 'photo (1).png', path: '/photo (1).png', size: 8, modified: '2026-01-01T00:00:00Z', rev: 'rev1' })
    const upload = calls.find(c => c.url.endsWith('/files/upload'))
    assert.equal(JSON.parse(upload.options.headers['Dropbox-API-Arg']).autorename, true)
    const preview = await request(app).get('/api/admin/dropbox/preview?id=id:abc123&full=1').set('Cookie', `portfolio_admin_token=${session}`)
    assert.equal(preview.status, 200); assert.match(preview.headers['content-type'], /image\/jpeg/)
    assert.equal(preview.headers['cache-control'], 'no-store')
    const thumbnail = calls.find(c => c.url.endsWith('/files/get_thumbnail_v2'))
    assert.equal(JSON.parse(thumbnail.options.headers['Dropbox-API-Arg']).size, 'w1024h768')
    const link = await request(app).post('/api/admin/dropbox/files/link').set('Cookie', `portfolio_admin_token=${session}`).set('Origin', 'http://localhost:5173').send({ id: 'id:abc123', confirmPublic: true })
    assert.equal(link.status, 200)
    assert.equal(link.body.data.url, 'https://dl.dropboxusercontent.com/scl/fi/abc/photo.png?rlkey=key&st=state')
    const video = await request(app).post('/api/admin/dropbox/files?path=&name=clip.mp4').set('Cookie', `portfolio_admin_token=${session}`).set('Origin', 'http://localhost:5173').set('Content-Type', 'application/octet-stream').send(Buffer.from([0,0,0,20,102,116,121,112,105,115,111,109]))
    assert.equal(video.status, 200)
  } finally {
    Admin.findById = original.findAdmin; DropboxIntegration.findOne = original.findIntegration; AuditEvent.create = original.audit; globalThis.fetch = original.fetch; globalThis.__mongooseCache.conn = original.conn
    if (original.secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = original.secret
    if (original.encryption === undefined) delete process.env.DROPBOX_ENCRYPTION_KEY; else process.env.DROPBOX_ENCRYPTION_KEY = original.encryption
  }
})
