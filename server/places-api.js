import { createServer } from 'node:http'

const PORT = Number(process.env.PORT || 3001)
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const RATE_WINDOW_MS = 60 * 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 30
const SERP_QUERY = 'hiking trails parks botanical gardens lookouts nature reserves beaches'
const cache = new Map()
const pendingLookups = new Map()
const upstreamRequests = []

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(body))
}

function isNaturePlace(place) {
  const description = `${place.title || ''} ${place.type || ''}`
  return /park|garden|hiking|trail|lookout|beach|nature|reserve|track|botanic|cliff|mountain|scenic|hill|forest|waterfall/i.test(description)
    && !/restaurant|cafe|coffee|shop|mall|hotel|bar|pub/i.test(description)
}

function normalizePlace(place, index) {
  const latitude = Number(place.gps_coordinates?.latitude)
  const longitude = Number(place.gps_coordinates?.longitude)
  const position = Number(place.position || index + 1)
  const reviews = Number(place.reviews || 0)
  const rating = Number(place.rating || 0)
  if (!place.title || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return {
    name: place.title,
    latitude,
    longitude,
    popularity: Math.max(0, 50 - position) + Math.log10(reviews + 1) * 5 + rating * 2,
    source: 'serpapi',
  }
}

function allowUpstreamRequest() {
  const now = Date.now()
  while (upstreamRequests.length && now - upstreamRequests[0] >= RATE_WINDOW_MS) upstreamRequests.shift()
  if (upstreamRequests.length >= MAX_REQUESTS_PER_WINDOW) return false
  upstreamRequests.push(now)
  return true
}

async function findPlaces(city) {
  const key = process.env.SERPAPI_API_KEY
  if (!key) return { status: 503, body: { error: 'SerpApi is not configured yet.' } }

  const cacheKey = city.toLowerCase()
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
    return { status: 200, body: { places: cached.places, cached: true } }
  }
  if (pendingLookups.has(cacheKey)) return pendingLookups.get(cacheKey)
  if (!allowUpstreamRequest()) return { status: 429, body: { error: 'Place search limit reached. Try again later.' } }

  const lookup = fetchSerpApiPlaces(city, key)
  pendingLookups.set(cacheKey, lookup)
  try {
    return await lookup
  } finally {
    pendingLookups.delete(cacheKey)
  }
}

async function fetchSerpApiPlaces(city, key) {
  const cacheKey = city.toLowerCase()
  const url = new URL('https://serpapi.com/search.json')
  url.search = new URLSearchParams({ engine: 'google_local', q: SERP_QUERY, location: city, hl: 'en', api_key: key }).toString()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    const payload = await response.json()
    if (!response.ok || payload.error) {
      console.error('SerpApi request failed:', response.status, payload.error || 'upstream error')
      return { status: 502, body: { error: 'SerpApi could not load local places.' } }
    }
    const places = (payload.local_results || []).filter(isNaturePlace).map(normalizePlace).filter(Boolean)
    cache.set(city.toLowerCase(), { savedAt: Date.now(), places })
    return { status: 200, body: { places, cached: false } }
  } catch (error) {
    return { status: 502, body: { error: error.name === 'AbortError' ? 'SerpApi timed out.' : 'SerpApi could not load local places.' } }
  } finally {
    clearTimeout(timeout)
  }
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    response.end()
    return
  }

  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`)
  if (request.method === 'GET' && url.pathname === '/healthz') {
    sendJson(response, 200, { ok: true, serpApiConfigured: Boolean(process.env.SERPAPI_API_KEY) })
    return
  }
  if (request.method !== 'GET' || url.pathname !== '/api/places') {
    sendJson(response, 404, { error: 'Not found.' })
    return
  }

  const city = (url.searchParams.get('city') || '').trim()
  if (city.length < 2 || city.length > 80) {
    sendJson(response, 400, { error: 'Provide a valid city name.' })
    return
  }
  const result = await findPlaces(city)
  sendJson(response, result.status, result.body)
})

server.listen(PORT, '0.0.0.0', () => console.log(`Grass Dawg places API listening on ${PORT}`))
