const GEO_URL = 'https://ip-api.com/json/?fields=status,message,query,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,isp,org,as,proxy,hosting,mobile'
const STORAGE_KEY = 'portfolio_visitor_geo'

export async function getVisitorGeo() {
  try {
    const cached = sessionStorage.getItem(STORAGE_KEY)
    if (cached) return JSON.parse(cached)
  } catch { /* storage may be unavailable */ }
  const response = await fetch(GEO_URL, { method: 'GET', mode: 'cors', headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('Visitor location lookup failed')
  const data = await response.json()
  if (data.status !== 'success' || !data.query) throw new Error(data.message || 'Visitor location lookup failed')
  const geo = { ipAddress: data.query, geo: { continent: data.continent, continentCode: data.continentCode, country: data.country, countryCode: data.countryCode, region: data.region, regionName: data.regionName, city: data.city, district: data.district, zip: data.zip, lat: data.lat, lon: data.lon, timezone: data.timezone, isp: data.isp, org: data.org, as: data.as, proxy: data.proxy, hosting: data.hosting, mobile: data.mobile } }
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(geo)) } catch { /* ignore */ }
  return geo
}
