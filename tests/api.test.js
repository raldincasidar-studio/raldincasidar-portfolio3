import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../api/index.js'

test('health endpoint is registered', async () => {
  const response = await request(app).get('/api/health')
  // With Atlas access disabled this is expected to be a controlled 500;
  // once the IP is allowlisted it becomes 200 with database: connected.
  assert.ok([200, 500].includes(response.status))
  assert.equal(response.type, 'application/json')
})

test('admin endpoints reject anonymous requests before database access', async () => {
  const response = await request(app).get('/api/admin/auth/me')
  assert.equal(response.status, 401)
  assert.equal(response.body.error.code, 'UNAUTHORIZED')
})

test('unknown routes return the API error shape', async () => {
  const response = await request(app).get('/api/not-a-route')
  assert.equal(response.status, 404)
})
