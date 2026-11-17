import { apiFetch } from './client.js'
const json = (method, body) => ({ method, body: JSON.stringify(body) })
export const dropboxApi = {
  connection: () => apiFetch('/admin/dropbox/connection'),
  configure: body => apiFetch('/admin/dropbox/connection/config', json('PUT', body)),
  start: () => apiFetch('/admin/dropbox/connection/start', json('POST', {})),
  disconnect: () => apiFetch('/admin/dropbox/connection', json('DELETE', {})),
  usage: () => apiFetch('/admin/dropbox/usage'),
  list: path => apiFetch(`/admin/dropbox/files?path=${encodeURIComponent(path)}`),
  more: cursor => apiFetch('/admin/dropbox/files/continue', json('POST', { cursor })),
  upload: async (path, file) => {
    if (file.size > 4 * 1024 * 1024) {
      const linkRes = await apiFetch(`/admin/dropbox/files/upload-link?path=${encodeURIComponent(path)}&name=${encodeURIComponent(file.name)}&size=${file.size}`, { method: 'POST' })
      const directRes = await fetch(linkRes.data.link, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: file,
      })
      if (!directRes.ok) {
        throw new Error(`Direct upload to Dropbox failed (${directRes.status})`)
      }
      return { data: { path: linkRes.data.path || `${path ? path + '/' : '/'}${file.name}`, size: file.size } }
    }
    return apiFetch(`/admin/dropbox/files?path=${encodeURIComponent(path)}&name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file, headers: { 'Content-Type': 'application/octet-stream' } })
  },
  link: id => apiFetch('/admin/dropbox/files/link', json('POST', { id, confirmPublic: true })),
  remove: item => apiFetch('/admin/dropbox/files', json('DELETE', { id: item.id, path: item.path, rev: item.rev, confirm: true })),
}
