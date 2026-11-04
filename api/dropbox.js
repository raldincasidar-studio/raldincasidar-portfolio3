import crypto from 'node:crypto'

export function encryptionKey() {
  const value = process.env.DROPBOX_ENCRYPTION_KEY || ''
  if (!/^[a-f\d]{64}$/i.test(value)) throw Object.assign(new Error('Set DROPBOX_ENCRYPTION_KEY to 32 random bytes as 64 hexadecimal characters on the server.'), { status: 503 })
  return Buffer.from(value, 'hex')
}
export function seal(value) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.')
}
export function unseal(value) {
  const [version, iv, tag, data] = value.split('.')
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Invalid encrypted credential')
  const cipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'))
  cipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([cipher.update(Buffer.from(data, 'base64url')), cipher.final()]).toString('utf8')
}
export function imageType(bytes) {
  if (bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return 'image/jpeg'
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png'
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString())) return 'image/gif'
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'image/webp'
  return null
}
export function mediaType(bytes) {
  const image = imageType(bytes)
  if (image) return image
  if (bytes.length >= 12 && bytes.subarray(4, 8).toString('ascii') === 'ftyp') return 'video/mp4'
  if (bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'video/webm'
  return null
}
export function directLink(url) {
  const result = new URL(url)
  if (result.protocol !== 'https:' || result.username || result.password || result.port || !['www.dropbox.com', 'dropbox.com'].includes(result.hostname)) throw new Error('Unexpected Dropbox shared link')
  result.hostname = 'dl.dropboxusercontent.com'
  result.searchParams.delete('dl'); result.searchParams.delete('raw')
  return result.toString()
}
export async function dropboxRequest(endpoint, token, body, { content = false, arg, fetcher = fetch, retry = false } = {}) {
  const headers = { Authorization: `Bearer ${token}` }
  if (content) { headers['Content-Type'] = 'application/octet-stream'; headers['Dropbox-API-Arg'] = JSON.stringify(arg).replace(/[\u007f-\uffff]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`) }
  else if (body !== undefined) headers['Content-Type'] = 'application/json'
  for (let attempt = 0; ; attempt++) {
    const response = await fetcher(`https://${content ? 'content.dropboxapi.com' : 'api.dropboxapi.com'}/2/${endpoint}`, { method: 'POST', headers, body: content ? body : body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(25000) })
    if (retry && (response.status === 429 || response.status >= 500) && attempt < 3) {
      const delay = Number(response.headers.get('retry-after')) || 2 ** attempt + Math.random()
      await new Promise(resolve => setTimeout(resolve, Math.min(delay, 10) * 1000)); continue
    }
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      const id = response.headers.get('x-dropbox-request-id') || ''
      const messages = { 401: 'Dropbox authorization expired or was revoked. Reconnect Dropbox in Settings.', 403: 'Dropbox denied permission. Check app scopes and sharing policies.', 409: 'Dropbox could not complete the operation; the file may have changed or sharing may be restricted.', 429: 'Dropbox is busy. Please try again later.' }
      throw Object.assign(new Error(`${messages[response.status] || 'Dropbox is unavailable. Please try again.'}${id ? ` (Dropbox request ${id})` : ''}`), { status: response.status === 401 ? 409 : response.status === 429 ? 429 : 502 })
    }
    return result
  }
}
