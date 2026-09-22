import { apiFetch } from './client.js'
export const adminApi = {
  me: () => apiFetch('/admin/auth/me'), login: (body) => apiFetch('/admin/auth/login', { method: 'POST', body: JSON.stringify(body) }), logout: () => apiFetch('/admin/auth/logout', { method: 'POST' }),
  changePassword: (body) => apiFetch('/admin/auth/change-password', { method: 'POST', body: JSON.stringify(body) }), analytics: (period = '30d') => apiFetch(`/admin/analytics?period=${period}`), logs: (query = '') => apiFetch(`/admin/logs${query ? `?${query}` : ''}`),
  settings: () => apiFetch('/admin/settings/site'), updateSettings: (body) => apiFetch('/admin/settings/site', { method: 'PATCH', body: JSON.stringify(body) }),
  list: (type, status = '') => apiFetch(`/admin/${type}${status ? `?status=${status}` : ''}`), get: (type, id) => apiFetch(`/admin/${type}/${id}`), create: (type, body) => apiFetch(`/admin/${type}`, { method: 'POST', body: JSON.stringify(body) }), update: (type, id, body) => apiFetch(`/admin/${type}/${id}`, { method: 'PATCH', body: JSON.stringify(body) }), archive: (type, id) => apiFetch(`/admin/${type}/${id}`, { method: 'DELETE' }),
}
export const publicApi = { settings: () => apiFetch('/site-settings'), track: (body) => apiFetch('/analytics/events', { method: 'POST', body: JSON.stringify(body) }) }
