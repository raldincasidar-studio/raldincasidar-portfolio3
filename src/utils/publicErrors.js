export function normalizePublicError(error) {
  if (error?.status === 404) return { title: 'Not found', message: 'That project is no longer available.' }
  if (error?.status >= 500) return { title: 'Temporarily unavailable', message: 'We could not load this content right now. Please try again.' }
  return { title: 'Something went wrong', message: 'Please try again.' }
}
