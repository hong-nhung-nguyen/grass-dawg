import { useEffect, useRef, useState } from 'react'
import Pet from './components/Pet.jsx'
import StatBar from './components/StatBar.jsx'
import CameraCheck from './components/CameraCheck.jsx'
import SystemCheck from './components/SystemCheck.jsx'
import WalkSummary from './components/WalkSummary.jsx'
import QuestHistory from './components/QuestHistory.jsx'
import PetProfile from './components/PetProfile.jsx'
import { usePet } from './state/usePet.js'
import { petSay } from './ai/llm.js'
import { distanceBetween, getRouteStats } from './utils/route.js'
import { currentSearchDistanceKm, daysBetweenDayKeys, localDayKey, previousDayKey, shiftDayKey } from './utils/dogCalendar.js'
import { CITY_QUESTS, chooseQuests, fillQuestList } from './components/SideQuests.jsx'
import { fetchCityPlaces, makeCityQuests, readCityPlaces } from './utils/cityPlaces.js'

// Written lines used whenever the language model isn't loaded yet
const FALLBACK_LINES = {
  sulking: 'Take me outside!',
  stillInside: "That's still inside... I can smell the couch.",
  outside: "Fresh air! Let's go explore!",
}

function questReaction(quest, progress, completed) {
  const remaining = Math.max(0, quest.goal - progress)
  const reactions = {
    apples: completed ? `Those ${quest.goal} apple${quest.goal === 1 ? '' : 's'} were awesome! Thanks for our picnic!` : `Yum, ${progress} apple${progress === 1 ? '' : 's'} down! ${remaining} more for our picnic.`,
    redBull: 'A fizzy surprise! You found exactly what I wanted!',
    flower: 'This flower smells lovely. Thank you for finding it!',
    water: 'That looks refreshing. Just what a thirsty pup needed!',
    dog: 'A new furry friend! That was such a nice hello!',
    coffee: 'A lovely coffee stop. What a treat for our walk!',
    tree: 'What a shady spot! My paws are happy to rest here.',
    parkBall: 'Catch time! This park is perfect for playing!',
    clouds: 'Those clouds made a lovely picture!',
    bird: 'What a lovely bird! I loved spotting it with you.',
    streetArt: 'That street art is so colourful. Great find!',
    cat: 'A curious cat! What a fun friend to spot.',
    sign: 'We found the sign! The neighbourhood walk continues.',
    scooter: 'A bicycle! What a fun thing to spot on our walk.',
    photoBooth: 'That photo booth selfie is priceless! Pickle loves it.',
    swimming: 'Splash time! Pickle hopes you had a lovely swim.',
    cycling: 'What a ride! Pickle loves your cycling adventure.',
    picnic: 'A perfect picnic stop. Pickle wishes they could join you!',
    dancing: 'What a happy dance! Pickle is dancing along.',
    bridge: 'We found the bridge! What a fun little adventure!',
    museum: 'What a wonderful museum visit. I feel cultured!',
    landmark: 'We found it! I love exploring this city with you!',
    beach: 'A beach adventure! The fresh air feels amazing!',
    park: 'This park is lovely. Let’s explore a little more!',
    cafe: 'A cozy cafe stop! I loved exploring here with you.',
    restaurant: 'We found a great place to eat. What a tasty adventure!',
    store: 'We found the shop! Nice exploring together!',
  }
  return reactions[quest.target] || (completed ? `${quest.title} was so much fun! Thanks for taking me.` : `Great find! Let’s keep going with ${quest.title.toLowerCase()}.`)
}

const QUEST_STORAGE_KEY = 'grass-dawg:quests:v1'
const CITY_STORAGE_KEY = 'grass-dawg:city:v1'
function loadQuestData() {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const saved = JSON.parse(localStorage.getItem(QUEST_STORAGE_KEY) || 'null')
    if (saved?.date === today) {
      const data = { ...saved, history: saved.history || [], recommendations: saved.recommendations || {} }
      data.recommendations.daily = fillQuestList('daily', data.recommendations.daily || [], data.completed || {})
      data.recommendations.city = fillQuestList('city', data.recommendations.city || [], data.completed || {})
      return data
    }
    // Daily finds reset each day; town exploration quests remain available.
    const townIds = [...CITY_QUESTS.map((quest) => quest.id), ...Object.keys(saved?.completed || {}).filter((id) => id.startsWith('place-'))]
    const data = {
      date: today,
      progress: Object.fromEntries(townIds.filter((id) => saved?.progress?.[id]).map((id) => [id, saved.progress[id]])),
      completed: Object.fromEntries(townIds.filter((id) => saved?.completed?.[id]).map((id) => [id, saved.completed[id]])),
      history: saved?.history || [],
      recommendations: { daily: chooseQuests('daily'), city: saved?.recommendations?.city || chooseQuests('city', Object.fromEntries(townIds.filter((id) => saved?.completed?.[id]).map((id) => [id, true]))) },
    }
    data.recommendations.city = fillQuestList('city', data.recommendations.city, data.completed)
    return data
  } catch {
    return { date: today, progress: {}, completed: {}, history: [], recommendations: { daily: chooseQuests('daily'), city: chooseQuests('city') } }
  }
}

export default function App() {
  const [pet, updatePet] = usePet()
  const [bubble, setBubble] = useState(pet.lost ? `${pet.name} wandered off. Take a walk to find them.` : pet.outdoors ? FALLBACK_LINES.outside : FALLBACK_LINES.sulking)
  const [showCamera, setShowCamera] = useState(false)
  const [showSystem, setShowSystem] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [activeQuest, setActiveQuest] = useState(null)
  const [questData, setQuestData] = useState(loadQuestData)
  const [city, setCity] = useState(() => { try { return localStorage.getItem(CITY_STORAGE_KEY) || '' } catch { return '' } })
  const [cityCoords, setCityCoords] = useState(null)
  const [cityStatus, setCityStatus] = useState('')
  const [cityPlaces, setCityPlaces] = useState([])
  const [placesStatus, setPlacesStatus] = useState('')
  const initialCityRequestRef = useRef(false)
  const cityResolvedThisWalk = useRef(false)
  const [walkSession, setWalkSession] = useState(null)
  const [walkSummary, setWalkSummary] = useState(null)
  const [todayKey, setTodayKey] = useState(localDayKey)
  const geoWatchRef = useRef(null)
  const routePointsRef = useRef([])
  const pendingRouteRef = useRef([])
  const lastCityLookupRef = useRef(0)

  useEffect(() => {
    const timer = setInterval(() => setTodayKey(localDayKey()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Settle missed calendar days as home days. Starting on the second home day,
  // weight drops by 0.5 kg per day until Pickle reaches the 2 kg leave threshold.
  useEffect(() => {
    const throughDate = previousDayKey(todayKey)
    if (!pet.lastSettledDate || pet.lastSettledDate >= throughDate) return

    const activityDays = { ...(pet.activityDays || {}) }
    let cursor = shiftDayKey(pet.lastSettledDate, 1)
    let homeStreak = pet.homeStreak || 0
    let weightKg = pet.weightKg || 2
    let happiness = pet.happiness
    let lost = Boolean(pet.lost)
    let lostAt = pet.lostAt || ''
    let searchDistanceKm = pet.searchDistanceKm || 0
    let lastSettledDate = pet.lastSettledDate

    while (cursor <= throughDate) {
      const status = activityDays[cursor]?.status
      if (status === 'outside') {
        homeStreak = 0
      } else {
        activityDays[cursor] = { status: 'home' }
        homeStreak += 1
        happiness = Math.max(0, happiness - 8)
        if (homeStreak >= 2 && !lost && weightKg > 2) {
          weightKg = Math.max(2, weightKg - 0.5)
          if (weightKg <= 2) {
            lost = true
            lostAt = cursor
          }
        }
      }
      if (lost && lostAt) searchDistanceKm = Math.max(searchDistanceKm, daysBetweenDayKeys(lostAt, cursor))
      lastSettledDate = cursor
      cursor = shiftDayKey(cursor, 1)
    }

    updatePet({ activityDays, lastSettledDate, homeStreak, weightKg, happiness, lost, lostAt, searchDistanceKm })
    if (!pet.lost && lost) setBubble(`${pet.name} has wandered off. Take a walk to find them again.`)
  }, [todayKey, pet.lastSettledDate])

  // Older saves only remembered whether the dog was outdoors, not which day.
  // Seed today's calendar once so an already-outdoors dog is not shown as home.
  useEffect(() => {
    if (pet.calendarSeeded) return
    if (pet.outdoors && pet.activityDays?.[todayKey]?.status !== 'outside') recordOutsideDay()
    else updatePet({ calendarSeeded: true })
  }, [pet.calendarSeeded])

  async function updateCityFromCoords(coords) {
    setCityStatus('Finding city...')
    const geocoder = import.meta.env.VITE_REVERSE_GEOCODER_URL || 'https://nominatim.openstreetmap.org/reverse'
    const query = new URLSearchParams({ format: 'jsonv2', zoom: '10', addressdetails: '1', lat: coords.latitude, lon: coords.longitude })
    const response = await fetch(`${geocoder}?${query}`)
    if (!response.ok) throw new Error(`City lookup failed (${response.status}).`)
    const result = await response.json()
    const address = result?.address || {}
    const name = address.city || address.town || address.village || address.municipality || address.city_district || address.county
    if (!name) throw new Error('Could not identify a nearby city from this location.')
    setCity(name)
    setCityCoords({ latitude: coords.latitude, longitude: coords.longitude })
    setCityStatus('')
  }

  function requestCity() {
    if (!navigator.geolocation) {
      setCityStatus('Location is not available in this browser.')
      return
    }
    setCityStatus('Getting location...')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => updateCityFromCoords(coords).catch((error) => setCityStatus(error.message || 'City lookup failed. Try again.')),
      (error) => setCityStatus(error.code === 1 ? 'Allow location access, then try again.' : 'Could not get location. Try again.'),
      { enableHighAccuracy: false, maximumAge: 600000, timeout: 15000 },
    )
  }

  useEffect(() => {
    if (!city && !initialCityRequestRef.current) {
      initialCityRequestRef.current = true
      requestCity()
    }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(questData)) } catch { /* quests still work for this session */ }
  }, [questData])

  useEffect(() => {
    try { if (city) localStorage.setItem(CITY_STORAGE_KEY, city) } catch { /* city label is optional */ }
  }, [city])

  useEffect(() => {
    if (!city) return undefined
    let cancelled = false
    const cached = readCityPlaces(city)
    if (cached !== null) {
      setCityPlaces(cached)
      setPlacesStatus(cached.length ? `${cached.length} named places in ${city}` : `No named places with coordinates found for ${city}.`)
      const pool = makeCityQuests(cached, city)
      setQuestData((current) => ({
        ...current,
        recommendations: { ...current.recommendations, city: fillQuestList('city', current.recommendations?.city || [], current.completed, pool) },
      }))
      return undefined
    }

    setPlacesStatus(`Finding places in ${city}...`)
    fetchCityPlaces(city, cityCoords).then((places) => {
      if (cancelled) return
      setCityPlaces(places)
      setPlacesStatus(places.length ? `${places.length} named places in ${city}` : `No named places with coordinates found for ${city}.`)
      const pool = makeCityQuests(places, city)
      setQuestData((current) => ({
        ...current,
        recommendations: { ...current.recommendations, city: fillQuestList('city', [], current.completed, pool) },
      }))
    }).catch((error) => {
      if (cancelled) return
      setCityPlaces([])
      setPlacesStatus(`Place lookup failed: ${error.message}`)
      setQuestData((current) => ({ ...current, recommendations: { ...current.recommendations, city: [] } }))
    })
    return () => { cancelled = true }
  }, [city, cityCoords?.latitude, cityCoords?.longitude])

  useEffect(() => () => {
    if (geoWatchRef.current !== null) navigator.geolocation?.clearWatch(geoWatchRef.current)
  }, [])

  const mood = pet.outdoors ? 'happy' : 'sulking'

  // Called after the camera snapshot has been checked by CLIP
  async function handleOutdoorResult({ outdoors, keepCamera }) {
    if (!keepCamera) setShowCamera(false)

    if (!outdoors) {
      const line = await petSay(pet, 'Your owner showed you a photo, but it was still indoors. Grumble about it.')
      setBubble(line || FALLBACK_LINES.stillInside)
      return
    }

    // Waking up outside is a reward in itself
    recordOutsideDay()
    updatePet({ outdoors: true })
    setBubble(FALLBACK_LINES.outside)
    const line = await petSay(pet, 'You just stepped outside with your owner. React with excitement.')
    if (line) setBubble(line)
  }

  function handleQuestResult({ outdoors, matched, image }) {
    const quest = activeQuest
    if (!outdoors && quest.requiresOutside !== false) {
      setBubble(FALLBACK_LINES.stillInside)
      return
    }
    if (!matched) {
      setBubble('I can’t spot that one yet. Let’s keep looking!')
      return
    }
    const nextProgress = Math.min(quest.goal, (questData.progress[quest.id] || 0) + 1)
    const questCompleted = nextProgress >= quest.goal
    // A completed, photo-verified outdoor quest counts as an outside day even
    // if the user entered the quest without starting a walk session first.
    if (questCompleted && outdoors && quest.countsOutsideDay !== false) recordOutsideDay()
    setQuestData((current) => {
      const progress = Math.min(quest.goal, (current.progress[quest.id] || 0) + 1)
      const completed = progress >= quest.goal
      const newlyCompleted = completed && !current.completed[quest.id]
      const section = quest.type === 'Explore' ? 'city' : 'daily'
      const pool = section === 'city' ? makeCityQuests(cityPlaces, city) : null
      return {
        ...current,
        progress: { ...current.progress, [quest.id]: progress },
        completed: { ...current.completed, [quest.id]: completed },
        history: newlyCompleted ? [{ id: `${quest.id}-${Date.now()}`, title: quest.title, copy: quest.copy, type: quest.type || 'Daily', city, completedAt: Date.now() }, ...(current.history || [])] : current.history || [],
        recommendations: newlyCompleted ? {
          ...current.recommendations,
          [section]: fillQuestList(section, (current.recommendations?.[section] || []).filter((item) => item.id !== quest.id), { ...current.completed, [quest.id]: true }, pool),
        } : current.recommendations,
      }
    })
    setWalkSession((current) => current && ({
      ...current,
      questPhotos: [...current.questPhotos, { image, title: quest.title }],
      completedQuests: current.completedQuests + (questCompleted ? 1 : 0),
    }))
    setBubble(questReaction(quest, nextProgress, questCompleted))
    setActiveQuest(null)
  }

  // Pickle reacted to something from ai/interactions.js during a Look
  function handleInteraction(interaction) {
    // The pet only tracks happiness now; other stats in the effects list are ignored
    const happiness = interaction.effects?.happiness
    if (happiness && !pet.lost) updatePet({ happiness: pet.happiness + happiness })
    if (interaction.discovery) {
      setWalkSession((current) => current && !current.discoveries?.includes(interaction.name)
        ? { ...current, discoveries: [...(current.discoveries || []), interaction.name] }
        : current)
    }
  }

  function startQuest(quest) {
    setActiveQuest(quest)
    setShowCamera(true)
  }

  function reloadQuests(section) {
    if (section === 'city' && city && !cityPlaces.length) {
      setPlacesStatus(`Finding named places in ${city}...`)
      fetchCityPlaces(city, cityCoords).then((places) => {
        setCityPlaces(places)
        setPlacesStatus(places.length ? `${places.length} named places in ${city}` : `No named places with coordinates found for ${city}.`)
        const pool = makeCityQuests(places, city)
        setQuestData((current) => ({
          ...current,
          recommendations: { ...current.recommendations, city: fillQuestList('city', [], current.completed, pool) },
        }))
      }).catch((error) => setPlacesStatus(`Place lookup failed: ${error.message}`))
      return
    }
    setQuestData((current) => {
      const existing = current.recommendations?.[section] || []
      const pool = section === 'city' ? makeCityQuests(cityPlaces, city) : null
      const fresh = chooseQuests(section, current.completed, section === 'daily' ? [] : existing.map((quest) => quest.id), pool)
      return {
        ...current,
        recommendations: {
          ...current.recommendations,
          [section]: fillQuestList(section, [...fresh, ...existing], current.completed, pool),
        },
      }
    })
  }

  function recordOutsideDay() {
    const date = localDayKey()
    if (pet.activityDays?.[date]?.status === 'outside') {
      if (!pet.calendarSeeded) updatePet({ calendarSeeded: true })
      return
    }
    const activityDays = { ...(pet.activityDays || {}), [date]: { status: 'outside', weightAwarded: false } }
    if (pet.lost) {
      updatePet({ activityDays, calendarSeeded: true, lastSettledDate: previousDayKey(date), searchDistanceKm: currentSearchDistanceKm(pet, date) })
      return
    }
    const happiness = Math.min(100, pet.happiness + 10)
    updatePet({
      activityDays,
      calendarSeeded: true,
      lastSettledDate: previousDayKey(date),
      homeStreak: 0,
      happiness,
      outdoors: true,
    })
  }

  function handleModeSelect(mode) {
    const startedAt = Date.now()
    recordOutsideDay()
    cityResolvedThisWalk.current = false
    routePointsRef.current = []
    pendingRouteRef.current = []
    setWalkSession({
      startedAt,
      mode,
      questPhotos: [],
      completedQuests: 0,
      discoveries: [],
      routePoints: [],
      locationError: '',
      rescueDistanceKm: pet.lost ? Math.max(0, currentSearchDistanceKm(pet) - pet.searchProgressKm) : 0,
    })
    if (geoWatchRef.current !== null) navigator.geolocation?.clearWatch(geoWatchRef.current)
    if (!navigator.geolocation) {
      setWalkSession((current) => ({ ...current, locationError: 'Location is unavailable in this browser.' }))
      return
    }

    geoWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!cityResolvedThisWalk.current && Date.now() - lastCityLookupRef.current >= 1100) {
          cityResolvedThisWalk.current = true
          lastCityLookupRef.current = Date.now()
          updateCityFromCoords(position.coords).catch((error) => setCityStatus(error.message || 'City lookup failed.'))
        }
        // A route needs stable GPS before it can add points. Handheld GPS drift
        // commonly sits in the 10–30 m range, so reject fixes above 20 m accuracy.
        if (!Number.isFinite(position.coords.accuracy) || position.coords.accuracy > 20) return
        const point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: position.timestamp || Date.now(),
          accuracy: position.coords.accuracy,
        }
        const anchor = routePointsRef.current.at(-1)
        if (!anchor) {
          const nextPoints = [point]
          routePointsRef.current = nextPoints
          setWalkSession((current) => current ? { ...current, routePoints: nextPoints } : current)
          return
        }

        // Require substantial displacement from the last confirmed spot. This filters
        // small GPS swings when someone is standing still and panning their phone.
        const moveThreshold = Math.max(28, Math.min(40, (anchor.accuracy + point.accuracy) * 1.4))
        if (distanceBetween(anchor, point) < moveThreshold) {
          pendingRouteRef.current = []
          return
        }

        // Confirm displacement over several nearby fixes spanning at least 12 seconds;
        // a single GPS jump or short-lived GPS drift cannot become a route segment.
        const candidates = pendingRouteRef.current
        if (candidates.length) {
          const center = candidates.reduce((sum, item) => ({
            latitude: sum.latitude + item.latitude / candidates.length,
            longitude: sum.longitude + item.longitude / candidates.length,
          }), { latitude: 0, longitude: 0 })
          const clusterRadius = Math.max(6, Math.min(10, point.accuracy * 0.5))
          if (distanceBetween(center, point) > clusterRadius) pendingRouteRef.current = [point]
          else pendingRouteRef.current = [...candidates, point]
        } else {
          pendingRouteRef.current = [point]
        }

        const confirmed = pendingRouteRef.current
        const elapsed = confirmed.length > 1 ? confirmed.at(-1).timestamp - confirmed[0].timestamp : 0
        if (confirmed.length < 4 || elapsed < 12000) return

        const nextPoint = confirmed.reduce((sum, item) => ({
          latitude: sum.latitude + item.latitude / confirmed.length,
          longitude: sum.longitude + item.longitude / confirmed.length,
          timestamp: item.timestamp,
          accuracy: item.accuracy,
        }), { latitude: 0, longitude: 0, timestamp: 0, accuracy: 0 })
        if (distanceBetween(anchor, nextPoint) < moveThreshold) {
          pendingRouteRef.current = []
          return
        }

        const nextPoints = [...routePointsRef.current, nextPoint]
        routePointsRef.current = nextPoints
        pendingRouteRef.current = []
        setWalkSession((current) => current ? { ...current, routePoints: nextPoints } : current)
      },
      (error) => {
        const reason = error.code === 1 ? 'Location permission was declined.' : 'Could not get location for the route.'
        setWalkSession((current) => current ? { ...current, locationError: reason } : current)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    )
  }

  function handleWalkEnd({ finalPhoto, endedAt }) {
    if (!walkSession) {
      setShowCamera(false)
      return
    }
    if (geoWatchRef.current !== null) navigator.geolocation?.clearWatch(geoWatchRef.current)
    geoWatchRef.current = null
    const routePoints = routePointsRef.current
    const walkedKm = getRouteStats(routePoints, walkSession.startedAt, endedAt).kilometers
    const today = localDayKey()
    const todayActivity = pet.activityDays?.[today]
    let weightGained = false
    if (!pet.lost && todayActivity?.status === 'outside' && !todayActivity.weightAwarded && pet.happiness > 80) {
      weightGained = true
      updatePet({
        weightKg: pet.weightKg + 0.5,
        activityDays: { ...pet.activityDays, [today]: { ...todayActivity, weightAwarded: true } },
      })
    }
    let rescue = null
    if (pet.lost) {
      const progressKm = pet.searchProgressKm + walkedKm
      const requiredKm = Math.max(walkSession.rescueDistanceKm + pet.searchProgressKm, currentSearchDistanceKm(pet))
      const found = progressKm >= requiredKm
      rescue = { name: pet.name, requiredKm, progressKm, walkedKm, found }
      if (found) {
        updatePet({ lost: false, lostAt: '', weightKg: 2, searchDistanceKm: 0, searchProgressKm: 0, homeStreak: 0, outdoors: true })
        setBubble(`${pet.name}! I found you! Let’s go home together.`)
      } else {
        updatePet({ searchProgressKm: progressKm })
        setBubble(`${pet.name} is still out there. Keep searching on your next walk.`)
      }
    }
    setWalkSummary({ ...walkSession, routePoints, finalPhoto, endedAt, rescue, weightGained })
    setShowCamera(false)
    setActiveQuest(null)
  }

  // Testing helper so the sulking state can be checked again without leaving the house
  function goInside() {
    updatePet({ outdoors: false })
    setBubble(FALLBACK_LINES.sulking)
  }

  return (
    <>
    {walkSummary ? (
      <WalkSummary session={walkSummary} onClose={() => { setWalkSummary(null); setWalkSession(null); routePointsRef.current = [] }} />
    ) : (
    <main
      className="mx-auto flex h-full max-w-md flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Name and stats */}
      <header className="flex flex-col gap-2 px-5 pt-5 pb-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold">{pet.name}</h1>
          <div className="flex items-center gap-3">
          <div className="text-right">
            <button onClick={requestCity} disabled={cityStatus.startsWith('Getting') || cityStatus.startsWith('Finding')} title="Use your location to set your city" className="block rounded-full bg-leaf px-3 py-1 text-xs font-semibold text-grass disabled:opacity-60">
              {cityStatus.startsWith('Getting') || cityStatus.startsWith('Finding') ? cityStatus : city || 'Set city'}
            </button>
            {city && <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="block pt-1 text-[9px] text-ink/45">© OpenStreetMap contributors</a>}
            {cityStatus && !cityStatus.startsWith('Getting') && !cityStatus.startsWith('Finding') && <span className="block max-w-36 pt-1 text-[9px] leading-tight text-red-700" role="status">{cityStatus}</span>}
          </div>
          <button onClick={() => setShowProfile(true)} title={`${pet.name} profile`} aria-label={`Open ${pet.name}'s profile`} className="flex h-11 w-11 items-center justify-center rounded-full bg-leaf text-grass shadow-sm transition active:scale-95 focus-visible:outline-2 focus-visible:outline-grass">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 19c.7-3.1 3-4.7 6.5-4.7s5.8 1.6 6.5 4.7"/><path d="M4 6.5 6 4l2.4 1M20 6.5 18 4l-2.4 1"/></svg>
          </button>
          <button onClick={() => setShowHistory(true)} title="Quest history" aria-label="Quest history" className="flex h-10 w-10 items-center justify-center rounded-full bg-leaf text-grass shadow-sm focus-visible:outline-2 focus-visible:outline-grass">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 2.7-6.4L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>
          </button>
          </div>
        </div>
        <p className="-mt-1 flex items-center justify-between text-sm text-ink/60"><span>{pet.breed}</span><button onClick={() => setShowSystem(true)} className="text-xs underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-grass">System check</button></p>
        <StatBar label="Happiness" value={pet.happiness} color="#F2A541" />
      </header>

      {/* The scene: a plain wall indoors, sky and grass outdoors */}
      <section
        className="relative mx-4 flex flex-1 flex-col items-center justify-end overflow-hidden rounded-[2rem] pb-6 transition-colors duration-700"
        style={{
          background: pet.outdoors
            ? 'linear-gradient(#BFE6F7 0%, #E8F6FB 62%, #7CC46A 62%, #5DAA4E 100%)'
            : 'repeating-linear-gradient(90deg, #E4EBDD 0 28px, #DCE5D4 28px 56px)',
        }}
      >
        {!pet.outdoors && <div className="absolute inset-x-0 bottom-0 h-[22%] bg-floor" aria-hidden="true" />}
        {pet.outdoors && <div className="absolute top-8 right-8 h-14 w-14 rounded-full bg-sun" aria-hidden="true" />}

        {/* Speech bubble */}
        <div className="relative z-10 mb-2 max-w-[80%] rounded-3xl bg-white px-5 py-3 text-center text-lg shadow-sm" aria-live="polite">
          {bubble}
          <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white" aria-hidden="true" />
        </div>

        <div className="relative z-10">
          {pet.lost ? (
            <div className="flex h-64 w-64 flex-col items-center justify-center rounded-full bg-white/60 p-6 text-center shadow-inner">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="mb-3 h-12 w-12 text-grass" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 21s-7-4.4-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.6-7 11-7 11Z"/><path d="M9 12h.01M15 12h.01M10 16q2 1 4 0" strokeLinecap="round"/></svg>
              <span className="font-semibold">{pet.name} is out looking for you</span>
              <span className="mt-1 text-sm text-ink/65">Walk {Math.max(0, currentSearchDistanceKm(pet) - pet.searchProgressKm).toFixed(1)} km to find them.</span>
            </div>
          ) : <Pet mood={mood} name={pet.name} />}
        </div>
      </section>

      {/* Main action */}
      <footer className="flex flex-col items-center gap-3 px-5 py-5">
        {pet.lost ? (
          <button onClick={() => setShowCamera(true)} className="w-full rounded-2xl bg-grass py-4 text-lg font-semibold text-white shadow-sm transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass">
            Go find {pet.name}
          </button>
        ) : pet.outdoors ? (
          <>
            <button
              onClick={() => setShowCamera(true)}
              className="w-full rounded-2xl bg-grass py-4 text-lg font-semibold text-white shadow-sm transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass"
            >
              Resume outdoor camera
            </button>
            <button onClick={goInside} className="text-sm text-ink/50 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-grass">
              Reset to indoors (testing)
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowCamera(true)}
            className="w-full rounded-2xl bg-grass py-4 text-lg font-semibold text-white shadow-sm transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass"
          >
            Check if we're outside
          </button>
        )}
      </footer>

    </main>
    )}
      {showProfile && (
        <PetProfile
          pet={pet}
          history={questData.history || []}
          city={city}
          activityDays={pet.activityDays || {}}
          onUpdate={updatePet}
          onMarkTodayOutside={recordOutsideDay}
          onClose={() => setShowProfile(false)}
          onHistoryOpen={() => { setShowProfile(false); setShowHistory(true) }}
        />
      )}
      {showCamera && (
        <CameraCheck
          startMode={pet.outdoors ? 'choose' : null}
          pet={pet}
          activeQuest={activeQuest}
          questData={questData}
          onQuestReload={reloadQuests}
          onHistoryOpen={() => setShowHistory(true)}
          city={city}
          placesStatus={placesStatus}
          onQuestStart={startQuest}
          onModeSelect={handleModeSelect}
          onWalkEnd={handleWalkEnd}
          onInteraction={handleInteraction}
          canEndWalk={Boolean(walkSession)}
          walkSession={walkSession}
          onResult={activeQuest ? handleQuestResult : handleOutdoorResult}
          onClose={() => { setShowCamera(false); setActiveQuest(null) }}
          onCancelQuest={() => setActiveQuest(null)}
        />
      )}
      {showSystem && <SystemCheck pet={pet} onClose={() => setShowSystem(false)} />}
      {showHistory && <QuestHistory entries={questData.history || []} onClose={() => setShowHistory(false)} />}
    </>
  )
}
