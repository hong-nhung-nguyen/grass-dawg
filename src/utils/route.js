export function distanceBetween(a, b) {
  const radians = (degrees) => degrees * Math.PI / 180
  const earthRadius = 6371000
  const lat1 = radians(a.latitude)
  const lat2 = radians(b.latitude)
  const dLat = radians(b.latitude - a.latitude)
  const dLon = radians(b.longitude - a.longitude)
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * earthRadius * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

export function getRouteStats(points = [], startedAt, endedAt) {
  let meters = 0
  for (let index = 1; index < points.length; index += 1) meters += distanceBetween(points[index - 1], points[index])
  const elapsedMinutes = Math.max(0, (endedAt - startedAt) / 60000)
  const pace = meters > 0 ? elapsedMinutes / (meters / 1000) : null
  return { meters, kilometers: meters / 1000, pace }
}

export function normalizeRoute(points = []) {
  if (points.length < 2) return []
  const longitudes = points.map((point) => point.longitude)
  const latitudes = points.map((point) => point.latitude)
  const minLon = Math.min(...longitudes)
  const maxLon = Math.max(...longitudes)
  const minLat = Math.min(...latitudes)
  const maxLat = Math.max(...latitudes)
  const lonSpan = maxLon - minLon || 0.00001
  const latSpan = maxLat - minLat || 0.00001
  const padding = 0.12
  return points.map((point) => ({
    x: padding + ((point.longitude - minLon) / lonSpan) * (1 - padding * 2),
    y: 1 - padding - ((point.latitude - minLat) / latSpan) * (1 - padding * 2),
  }))
}
