import { useEffect, useState } from 'react'
import { previousDayKey } from '../utils/dogCalendar.js'

// Bumped to v2 when the pet became a Golden Retriever: a save from before this holds the old
// name and breed, and those would otherwise win over the defaults below on the merge.
const STORAGE_KEY = 'fetchquest:pet:v2'

const DEFAULT_PET = {
  name: 'Pickle',
  breed: 'Golden Retriever',
  happiness: 50,
  outdoors: false,
  weightKg: 2,
  activityDays: {},
  calendarSeeded: false,
  lastSettledDate: previousDayKey(),
  homeStreak: 0,
  lost: false,
  lostAt: '',
  searchDistanceKm: 0,
  searchProgressKm: 0,
}

// Keeps a stat between 0 and 100
const clamp = (value) => Math.max(0, Math.min(100, value))

// Simple saved state for now. This gets replaced by RxDB (with optional MongoDB sync) in a later step
export function usePet() {
  const [pet, setPet] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return DEFAULT_PET
      const savedPet = JSON.parse(saved)
      delete savedPet.energy
      delete savedPet.level
      return { ...DEFAULT_PET, ...savedPet }
    } catch {
      return DEFAULT_PET
    }
  })

  // Save every change so the pet survives a refresh
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pet))
    } catch {
      // Storage can be blocked in private browsing; the game still works, it just won't remember
    }
  }, [pet])

  const update = (changes) =>
    setPet((current) => {
      const next = { ...current, ...changes }
      delete next.energy
      delete next.level
      next.happiness = clamp(next.happiness)
      next.weightKg = Math.max(2, Number(next.weightKg) || 2)
      next.searchDistanceKm = Math.max(0, Number(next.searchDistanceKm) || 0)
      next.searchProgressKm = Math.max(0, Number(next.searchProgressKm) || 0)
      return next
    })

  return [pet, update]
}
