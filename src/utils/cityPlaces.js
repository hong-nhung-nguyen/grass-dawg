const PLACES_CACHE_KEY = 'grass-dawg:places:v2'
const pendingLookups = new Map()

function cacheKey(city) {
  return city.toLowerCase()
}

function escapeOverpass(value) {
  return value.replace(/[\\"\[\]]/g, '\\$&')
}

export function readCityPlaces(city, coords) {
  try {
    const cache = JSON.parse(localStorage.getItem(PLACES_CACHE_KEY) || '{}')
    const entry = cache[cacheKey(city, coords)]
    const usable = entry?.places?.every((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
    return entry && usable && Date.now() - entry.savedAt < 30 * 24 * 60 * 60 * 1000 ? entry.places : null
  } catch {
    return null
  }
}

function classify(tags = {}, name = '') {
  if (/lookout|observation hill|sunrise|sunset/i.test(name)) return { kind: 'viewpoint', target: 'viewpoint', category: 'Popular', preference: 'active' }
  if (tags.route === 'hiking' || tags.route === 'foot' || tags.sport === 'hiking' || tags.highway === 'path' && tags.name) return { kind: 'hike', target: 'hike', category: tags.wikidata || tags.wikipedia ? 'Popular' : 'Local', preference: 'active' }
  if (tags.tourism === 'viewpoint' || tags.natural === 'peak' || tags.natural === 'cliff') return { kind: 'viewpoint', target: 'viewpoint', category: 'Popular', preference: 'active' }
  if (tags.natural === 'beach' || tags.leisure === 'beach_resort') return { kind: 'beach', target: 'beach', category: 'Popular', preference: 'relaxing' }
  if (tags.leisure === 'park' || tags.leisure === 'garden' || tags.leisure === 'nature_reserve' || tags.landuse === 'forest' || tags.boundary === 'protected_area') return { kind: 'park', target: 'park', category: tags.wikidata || tags.wikipedia ? 'Popular' : 'Local', preference: 'relaxing' }
  if (tags.amenity === 'cafe' || tags.amenity === 'ice_cream') return { kind: 'cafe', target: 'cafe', category: 'Common', preference: 'commercial' }
  if (tags.amenity === 'restaurant' || tags.amenity === 'fast_food' || tags.amenity === 'food_court') return { kind: 'restaurant', target: 'restaurant', category: 'Local', preference: 'commercial' }
  if (tags.shop === 'supermarket' || tags.shop === 'convenience' || tags.shop === 'department_store') return { kind: 'shop', target: 'store', category: 'Common', preference: 'commercial' }
  if (tags.tourism === 'museum' || tags.tourism === 'gallery') return { kind: 'museum', target: 'museum', category: 'Local', preference: 'culture' }
  if (tags.highway === 'bridge' || tags.man_made === 'bridge') return { kind: 'bridge', target: 'bridge', category: 'Random', preference: 'active' }
  if (tags.tourism === 'attraction' || tags.historic || tags.amenity === 'theatre') return { kind: 'landmark', target: 'landmark', category: 'Random', preference: 'culture' }
  return null
}

export function makeCityQuests(places, city) {
  return places.map((place) => {
    const classification = classify(place.tags, place.name)
    if (!classification || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) return null
    return {
      id: `place-${place.id}`,
      type: 'Explore',
      category: classification.category,
      title: classification.preference === 'active' ? `Walk to ${place.name}` : `Go to ${place.name}`,
      copy: classification.preference === 'active'
        ? `Let's get moving and explore ${place.name} in ${city}.`
        : classification.preference === 'relaxing'
          ? `Let's slow down and enjoy ${place.name} in ${city}.`
          : `Let's explore ${place.name} in ${city}.`,
      target: classification.target,
      preference: classification.preference,
      placePopularity: Number(Boolean(place.tags.wikidata || place.tags.wikipedia || place.tags.website)) + Number(Boolean(place.tags.tourism || place.tags.route === 'hiking')),
      goal: 1,
      mark: classification.kind.toUpperCase(),
      placeName: place.name,
      targetCoordinates: { latitude: place.latitude, longitude: place.longitude },
    }
  }).filter(Boolean)
}

async function loadCityPlaces(city, coords) {
  const area = coords
    ? `is_in(${coords.latitude},${coords.longitude})->.near;area.near["name"="${escapeOverpass(city)}"]["boundary"="administrative"]->.city;`
    : `area["name"="${escapeOverpass(city)}"]["boundary"="administrative"]->.city;`
  const query = `[out:json][timeout:25];${area}(nwr(area.city)["name"]["route"~"^(hiking|foot)$"];nwr(area.city)["name"]["sport"="hiking"];nwr(area.city)["name"]["highway"="path"];nwr(area.city)["name"]["tourism"="viewpoint"];nwr(area.city)["name"]["natural"~"^(peak|cliff|beach)$"];nwr(area.city)["name"]["leisure"~"^(park|garden|nature_reserve|beach_resort)$"];nwr(area.city)["name"]["landuse"="forest"];nwr(area.city)["name"]["boundary"="protected_area"];nwr(area.city)["name"]["man_made"~"^(observation|lookout)$"];nwr(area.city)["name"]["amenity"~"^(cafe|restaurant|fast_food|food_court|ice_cream|theatre)$"];nwr(area.city)["name"]["shop"~"^(supermarket|convenience|department_store)$"];nwr(area.city)["name"]["tourism"~"^(museum|gallery|attraction)$"];nwr(area.city)["name"]["historic"];nwr(area.city)["name"]["man_made"="bridge"];);out center 300;`
  const endpoints = [...new Set([
    import.meta.env.VITE_OVERPASS_ENDPOINT,
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ].filter(Boolean))]
  const failures = []
  let payload = null
  for (const endpoint of endpoints) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`${new URL(endpoint).hostname} returned ${response.status}`)
      const result = await response.json()
      if (result.remark) throw new Error(`${new URL(endpoint).hostname}: ${result.remark}`)
      payload = result
      break
    } catch (error) {
      failures.push(error.name === 'AbortError' ? `${new URL(endpoint).hostname} timed out` : error.message)
    } finally {
      clearTimeout(timeout)
    }
  }
  if (!payload) throw new Error(failures.join('; ').slice(0, 180) || 'Place search is unavailable.')
  const seen = new Set()
  const places = (payload.elements || []).flatMap((element) => {
    const name = element.tags?.name?.trim()
    const tags = element.tags || {}
    const latitude = element.lat ?? element.center?.lat
    const longitude = element.lon ?? element.center?.lon
    const classification = classify(tags, name)
    if (!name || !classification || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return []
    const dedupeKey = `${name.toLowerCase()}-${JSON.stringify(classification)}`
    if (seen.has(dedupeKey)) return []
    seen.add(dedupeKey)
    return [{ id: `${element.type}-${element.id}`, name, tags, latitude, longitude }]
  })
  try {
    const cache = JSON.parse(localStorage.getItem(PLACES_CACHE_KEY) || '{}')
    cache[cacheKey(city, coords)] = { savedAt: Date.now(), places }
    localStorage.setItem(PLACES_CACHE_KEY, JSON.stringify(cache))
  } catch { /* POIs can be fetched again if local storage is unavailable */ }
  return places
}

export function fetchCityPlaces(city, coords) {
  const locationKey = coords ? `@${Number(coords.latitude).toFixed(2)},${Number(coords.longitude).toFixed(2)}` : ''
  const key = `${cacheKey(city)}${locationKey}`
  if (!pendingLookups.has(key)) {
    pendingLookups.set(key, loadCityPlaces(city, coords).finally(() => pendingLookups.delete(key)))
  }
  return pendingLookups.get(key)
}
