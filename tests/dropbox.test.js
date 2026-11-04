import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../api/index.js'
import { seal, unseal, imageType, directLink, dropboxRequest } from '../api/dropbox.js'

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
  assert.equal(directLink('https://www.dropbox.com/s/abc/a.png?dl=0'), 'https://www.dropbox.com/s/abc/a.png?raw=1')
  assert.throws(() => directLink('https://attacker.example/a'))
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
  for (const [method, url] of [['get','/api/admin/dropbox/connection'], ['get','/api/admin/dropbox/usage'], ['post','/api/admin/dropbox/files/link'], ['delete','/api/admin/dropbox/files']]) {
    const r = await request(app)[method](url); assert.equal(r.status, 401)
  }
})
