import geoip from 'fast-geoip'

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]
  const ip = value || req.headers['x-real-ip'] || req.ip || req.socket?.remoteAddress || ''
  return ip.trim().replace(/^::ffff:/, '')
}

export async function lookupClientGeo(ip) {
  if (!ip) return undefined
  try {
    const result = await geoip.lookup(ip)
    if (!result) return undefined
    return {
      country: result.country,
      region: result.region,
      city: result.city,
      timezone: result.timezone,
      lat: Array.isArray(result.ll) ? result.ll[0] : undefined,
      lon: Array.isArray(result.ll) ? result.ll[1] : undefined,
    }
  } catch (error) {
    console.error(`geo lookup failed: ${error.message}`)
    return undefined
  }
}
