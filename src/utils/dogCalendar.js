export function localDayKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function shiftDayKey(dayKey, amount) {
  const [year, month, day] = dayKey.split('-').map(Number)
  const date = new Date(year, month - 1, day + amount)
  return localDayKey(date)
}

export function previousDayKey(dayKey = localDayKey()) {
  return shiftDayKey(dayKey, -1)
}

export function daysBetweenDayKeys(startKey, endKey) {
  const toUtc = (key) => {
    const [year, month, day] = key.split('-').map(Number)
    return Date.UTC(year, month - 1, day)
  }
  return Math.max(0, Math.round((toUtc(endKey) - toUtc(startKey)) / 86400000))
}

export function currentSearchDistanceKm(pet, dayKey = localDayKey()) {
  if (!pet?.lost || !pet.lostAt) return 0
  return Math.max(pet.searchDistanceKm || 0, daysBetweenDayKeys(pet.lostAt, dayKey))
}
