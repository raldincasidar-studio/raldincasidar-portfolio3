const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const details = payload.error?.details
    const error = new Error(payload.error?.message || 'We could not complete that request. Please try again.')
    error.status = response.status
    error.code = payload.error?.code
    error.details = details
    error.fieldErrors = details?.fieldErrors || {}
    if (response.status === 422 && !payload.error?.message) error.message = 'Please correct the highlighted fields and try again.'
    throw error
  }
  return payload
}
