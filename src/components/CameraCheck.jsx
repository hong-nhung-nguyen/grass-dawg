import { useEffect, useRef, useState } from 'react'
import { checkOutdoors, checkQuestPhoto, findInteraction } from '../ai/clip.js'
import { petSay } from '../ai/llm.js'
import { LOOKS_PER_ROUND, NOTHING_FOUND, RECENT_MEMORY, REPEAT_LINES, pickLine } from '../ai/interactions.js'
import RoamingDog from './RoamingDog.jsx'
import StatBar from './StatBar.jsx'
import { DAILY_QUESTS, CITY_QUESTS, fillQuestList } from './SideQuests.jsx'
import { distanceBetween } from '../utils/route.js'
import { playDogBark, prepareDogBark } from '../utils/dogBark.js'
import { currentSearchDistanceKm } from '../utils/dogCalendar.js'

const RELAX_QUEST_INTERVAL = 15 * 60_000
const MAX_CAMERA_ZOOM = 5

function relaxedQuestPrompt(quest, petName) {
  const prompts = {
    apples: `${petName} is hungry. Could you find ${quest.goal} red apple${quest.goal === 1 ? '' : 's'} for a picnic? Take a photo of each one.`,
    redBull: `${petName} wants a fizzy surprise. Can you find a can of Red Bull and take a photo?`,
    flower: `${petName} would love a flower to sniff. Can you find one and take a photo?`,
    water: `${petName} is thirsty. Can you find some water and take a photo?`,
    dog: `${petName} would love to say hello to another dog. Can you spot one and take a photo?`,
    coffee: `${petName} thinks a coffee stop sounds lovely. Can you find a takeaway coffee and take a photo?`,
    tree: `${petName} needs a shady rest. Can you find a leafy tree and take a photo?`,
    parkBall: `${petName} wants to play catch. Can you find a ball in a park and take a photo?`,
    bridge: `${petName} wants to go on a little adventure. Can you find a bridge and take a photo?`,
    clouds: `${petName} wants to look for shapes in the clouds. Can you find some and take a photo?`,
    bird: `${petName} heard a bird nearby. Can you spot it and take a photo?`,
    streetArt: `${petName} would love to see some colourful street art. Can you find it and take a photo?`,
    cat: `${petName} is curious about a cat nearby. Can you spot one and take a photo?`,
    sign: `${petName} wants to explore the neighbourhood. Can you find a street sign and take a photo?`,
    scooter: `${petName} spotted a ride! Can you find a bicycle or scooter and take a photo?`,
    photoBooth: `${petName} wants a silly selfie! Find a photo booth and take a picture.`,
    swimming: `${petName} wants you to make a splash. Go for a swim, then take a photo by the water.`,
    cycling: `${petName} wants a cycling adventure. Stop somewhere safe and take a photo with your bike.`,
    picnic: `${petName} would love a little picnic break. Find a nice outdoor spot and take a photo.`,
    dancing: `${petName} wants a dance break! Do a little dance outside and take a photo.`,
  }
  return prompts[quest?.target] || `${petName} has a little adventure in mind: ${quest?.copy || quest?.title} Take a photo when you find it.`
}

function questPhotoFeedback(quest, progress) {
  const left = Math.max(0, quest.goal - progress)
  if (quest.target === 'apples') return `Yum, ${progress} apple${progress === 1 ? '' : 's'} found! ${left} more for our picnic.`
  if (quest.target === 'flower') return 'That flower is lovely! Pickle is happy with the find.'
  if (quest.target === 'water') return 'A refreshing find for Pickle!'
  if (quest.target === 'dog') return 'Pickle made a new furry friend!'
  if (quest.target === 'bridge') return 'Bridge found! Pickle loves this little adventure.'
  if (quest.target === 'parkBall') return 'A ball in the park! Pickle is ready to play.'
  if (quest.target === 'clouds') return 'Those clouds made a lovely picture!'
  if (quest.target === 'bird') return 'What a lovely bird! Pickle loved spotting it.'
  if (quest.target === 'streetArt') return 'That street art is so colourful!'
  if (quest.target === 'cat') return 'A curious cat! What a fun spot.'
  if (quest.target === 'sign') return 'We found a sign! The neighbourhood walk continues.'
  if (quest.target === 'scooter') return 'A bicycle! What a fun thing to spot on our walk.'
  if (quest.target === 'photoBooth') return 'That photo booth selfie is priceless! Pickle loves it.'
  if (quest.target === 'swimming') return 'Splash time! Pickle hopes you had a lovely swim.'
  if (quest.target === 'cycling') return 'What a ride! Pickle loves your cycling adventure.'
  if (quest.target === 'picnic') return 'A perfect picnic stop. Pickle wishes they could join you!'
  if (quest.target === 'dancing') return 'What a happy dance! Pickle is dancing along.'
  return `Lovely find! Pickle enjoyed ${quest.title.toLowerCase()}.`
}

function waitForVideoFrame(video) {
  if (video.readyState >= 2 && video.videoWidth && video.videoHeight) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout)
      video.removeEventListener('loadeddata', check)
      video.removeEventListener('canplay', check)
      video.removeEventListener('error', fail)
    }
    const check = () => {
      if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
        cleanup()
        resolve()
      }
    }
    const fail = () => {
      cleanup()
      reject(new Error('The camera stream did not produce a video frame.'))
    }
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('The camera is taking too long to start. Check camera permission and try again.'))
    }, 12000)
    video.addEventListener('loadeddata', check)
    video.addEventListener('canplay', check)
    video.addEventListener('error', fail)
    check()
  })
}

function getFreshCoordinates() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location access is not available in this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
      (error) => reject(new Error(error.code === 1 ? 'Allow location access to verify this destination.' : 'Could not get your location. Try again outdoors.')),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
    )
  })
}

async function verifyQuestDestination(quest) {
  if (!quest.targetCoordinates) return { valid: false, message: 'This destination has no location data. Reload the Explore quests.' }
  let current
  try {
    current = await getFreshCoordinates()
  } catch (error) {
    return { valid: false, message: error.message }
  }
  if (!Number.isFinite(current.accuracy) || current.accuracy > 30) {
    return { valid: false, message: 'GPS is too imprecise to verify this stop. Wait for a clearer location signal and try again.' }
  }
  const metersAway = distanceBetween(current, quest.targetCoordinates)
  const allowedMeters = Math.min(40, Math.max(20, current.accuracy * 1.25))
  if (metersAway > allowedMeters) {
    return { valid: false, message: `You're about ${Math.round(metersAway)} m from ${quest.placeName}. Get within ${Math.round(allowedMeters)} m and try again.` }
  }
  return { valid: true }
}

// The camera stays mounted for the entire outdoor walk. Only the shutter snapshots are analysed.
export default function CameraCheck({ onResult, onClose, onCancelQuest, onModeSelect, onWalkEnd, onInteraction, canEndWalk, pet, startMode = null, activeQuest, questData, onQuestStart, onQuestReload, onHistoryOpen, city, placesStatus }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const cameraRequestRef = useRef(0)
  const pinchStartRef = useRef(null)
  const questListRef = useRef(null)
  const celebrationTimer = useRef(null)
  const [status, setStatus] = useState('starting') // starting | ready | checking | session | error
  const [message, setMessage] = useState('')
  const [sessionMode, setSessionMode] = useState(startMode)
  const [looking, setLooking] = useState(false)
  const [dogEvent, setDogEvent] = useState(null)
  // Objects seen in the last few looks, newest first, so the dog can call out repeats
  const recentFindsRef = useRef([])
  const looksThisRoundRef = useRef(0)
  const [questTab, setQuestTab] = useState('daily')
  const [celebrating, setCelebrating] = useState(false)
  const [finishStep, setFinishStep] = useState(null) // prompt | preview
  const [finishPhoto, setFinishPhoto] = useState('')
  const [relaxSuggestionVisible, setRelaxSuggestionVisible] = useState(false)
  const [relaxSuggestionQuests, setRelaxSuggestionQuests] = useState([])
  const [cameraFacing, setCameraFacing] = useState('environment')
  const [zoom, setZoom] = useState(1)

  async function startCamera(facing) {
    const requestId = ++cameraRequestRef.current
    setStatus('starting')
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus('error')
      setMessage('Camera access requires a secure HTTPS page. Open the app using its trusted HTTPS link, or use localhost.')
      return
    }
    try {
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          // Keep the live preview responsive; still photos use ImageCapture's best available resolution.
          video: { facingMode: { ideal: facing }, width: { ideal: 1920, max: 1920 }, height: { ideal: 1080, max: 1080 }, frameRate: { ideal: 30, max: 30 } },
          audio: false,
        })
      } catch (error) {
        if (!['OverconstrainedError', 'ConstraintNotSatisfiedError'].includes(error.name)) throw error
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      }
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        const ready = waitForVideoFrame(video)
        await video.play().catch(() => {})
        await ready
      }
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      setCameraFacing(facing)
      setStatus(sessionMode ? 'session' : 'ready')
      setMessage('')
    } catch (error) {
      if (requestId !== cameraRequestRef.current) return
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      setStatus('error')
      const messages = {
        NotAllowedError: 'Camera permission is blocked. Allow camera access for this site in your browser settings, then reload.',
        SecurityError: 'Camera access requires a trusted HTTPS connection. Open the app using its valid HTTPS link.',
        NotFoundError: 'No camera was found on this device.',
        NotReadableError: 'The camera is busy. Close other apps using it, then retry.',
        AbortError: 'The camera could not start. Try again or close other apps using the camera.',
      }
      setMessage(messages[error.name] || `Could not start the camera (${error.name || 'unknown error'}). Check site permissions and retry.`)
    }
  }

  useEffect(() => {
    const startup = setTimeout(() => startCamera('environment'), 0)
    return () => {
      clearTimeout(startup)
      cameraRequestRef.current += 1
      clearTimeout(celebrationTimer.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  // Offer relaxed-walk quests more often during development previews.
  useEffect(() => {
    if (sessionMode !== 'relax' || status !== 'session' || finishStep || activeQuest || pet.lost || relaxSuggestionVisible) return undefined
    const timer = setTimeout(offerRelaxSuggestions, RELAX_QUEST_INTERVAL)
    return () => clearTimeout(timer)
  }, [sessionMode, status, finishStep, activeQuest, pet.lost, relaxSuggestionVisible, questData?.completed])

  useEffect(() => {
    if (relaxSuggestionVisible) playDogBark()
  }, [relaxSuggestionVisible])

  function offerRelaxSuggestions() {
    const available = DAILY_QUESTS.filter((quest) => !questData?.completed?.[quest.id])
    if (!available.length) return
    for (let index = available.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[available[index], available[swapIndex]] = [available[swapIndex], available[index]]
    }
    setRelaxSuggestionQuests(available.slice(0, 1))
    setRelaxSuggestionVisible(true)
  }

  async function takeSnapshot(maxWidth = 4096, { still = true } = {}) {
    const video = videoRef.current
    if (!video) throw new Error('The camera preview is unavailable. Close the camera and reopen it.')
    await waitForVideoFrame(video)
    let bitmap = null
    const track = streamRef.current?.getVideoTracks()[0]
    if (still && track && 'ImageCapture' in window) {
      try {
        const capture = new ImageCapture(track)
        let blob
        try {
          const capabilities = await capture.getPhotoCapabilities()
          blob = await capture.takePhoto({ imageWidth: capabilities.imageWidth.max, imageHeight: capabilities.imageHeight.max })
        } catch {
          blob = await capture.takePhoto()
        }
        bitmap = await createImageBitmap(blob)
      } catch {
        // Fall back to the live frame on browsers without still-photo support.
      }
    }
    const source = bitmap || video
    const sourceVideoWidth = bitmap?.width || video.videoWidth
    const sourceVideoHeight = bitmap?.height || video.videoHeight
    const scale = Math.min(1, maxWidth / sourceVideoWidth)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(sourceVideoWidth * scale)
    canvas.height = Math.round(sourceVideoHeight * scale)
    const context = canvas.getContext('2d')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    const sourceWidth = sourceVideoWidth / zoom
    const sourceHeight = sourceVideoHeight / zoom
    const sourceX = (sourceVideoWidth - sourceWidth) / 2
    const sourceY = (sourceVideoHeight - sourceHeight) / 2
    if (cameraFacing === 'user') {
      context.translate(canvas.width, 0)
      context.scale(-1, 1)
    }
    context.drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height)
    bitmap?.close()
    return canvas.toDataURL('image/jpeg', 0.92)
  }

  function handlePinchStart(event) {
    if (event.touches.length !== 2) return
    const [first, second] = event.touches
    const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
    pinchStartRef.current = { distance, zoom }
  }

  function handlePinchMove(event) {
    if (event.touches.length !== 2 || !pinchStartRef.current) return
    const [first, second] = event.touches
    const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
    const nextZoom = pinchStartRef.current.zoom * distance / pinchStartRef.current.distance
    setZoom(Math.max(1, Math.min(MAX_CAMERA_ZOOM, Math.round(nextZoom * 100) / 100)))
  }

  function handlePinchEnd(event) {
    if (event.touches.length < 2) pinchStartRef.current = null
  }

  function beginFinish() {
    if (!canEndWalk) {
      onClose()
      return
    }
    setFinishStep('prompt')
  }

  async function captureFinishPhoto() {
    try {
      setFinishPhoto(await takeSnapshot(4096))
      setFinishStep('preview')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not capture a photo. Check camera permission and try again.')
    }
  }

  function finishWalk() {
    onWalkEnd?.({ finalPhoto: finishPhoto, endedAt: Date.now() })
  }

  function dismissRelaxSuggestion() {
    setRelaxSuggestionVisible(false)
    setRelaxSuggestionQuests([])
  }

  function startRelaxSuggestion(quest) {
    setRelaxSuggestionVisible(false)
    setRelaxSuggestionQuests([])
    if (quest) onQuestStart?.(quest)
  }

  // Look: Pickle checks the camera frame for something from ai/interactions.js and goes to it
  async function handleLook() {
    if (looking || dogEvent?.active) return
    setLooking(true)
    setMessage(`${pet.name} is looking around...`)
    try {
      const image = await takeSnapshot(672, { still: false })
      const found = await findInteraction(image, ({ percent }) => setMessage(`Getting your pup’s eyes ready, first time only (${percent}%)`))
      setMessage('')
      reactToLook(found)
    } catch (error) {
      console.error(error)
      setMessage(error instanceof Error ? error.message : `${pet.name} couldn’t see anything. Try again.`)
    } finally {
      setLooking(false)
    }
  }

  function reactToLook(found) {
    looksThisRoundRef.current += 1
    const key = Date.now()
    const restless = looksThisRoundRef.current >= LOOKS_PER_ROUND

    if (!found) {
      setDogEvent({ key, action: NOTHING_FOUND.action, x: null, line: pickLine(NOTHING_FOUND.lines), active: true, restless })
      return
    }

    const { interaction, x } = found
    if (recentFindsRef.current.includes(interaction.id)) {
      // Seen it already: he flops down where he is, and no stats change
      setDogEvent({ key, action: 'sit', x: null, line: pickLine(REPEAT_LINES), active: true, restless })
      return
    }

    recentFindsRef.current = [interaction.id, ...recentFindsRef.current].slice(0, RECENT_MEMORY)
    setDogEvent({ key, action: interaction.action, x, line: pickLine(interaction.lines), active: true, restless })
    onInteraction?.(interaction)

    // Swap the written line for one from the language model if it is loaded
    petSay(pet, `On your walk your owner showed you ${interaction.label}. You ${interaction.does}. React to it.`)
      .then((line) => { if (line) setDogEvent((current) => current?.key === key ? { ...current, line } : current) })
      .catch(() => {})
  }

  function handleDogEventDone(event) {
    setDogEvent((current) => current?.key === event.key ? { ...current, active: false } : current)
    // After a few looks he wants a proper adventure, so the camera doesn't become the whole walk
    if (event.restless) {
      looksThisRoundRef.current = 0
      if (sessionMode === 'relax' && !activeQuest) offerRelaxSuggestions()
    }
  }

  async function handleCheck() {
    setStatus('checking')
    setMessage(activeQuest ? 'Checking your find...' : 'Checking if we’re outside...')
    try {
      const onProgress = ({ percent }) => setMessage(`Getting your pup’s eyes ready, first time only (${percent}%)`)

      if (activeQuest) {
        if (activeQuest.type === 'Explore') {
          setMessage(`Checking your location at ${activeQuest.placeName || 'the destination'}...`)
          const locationCheck = await verifyQuestDestination(activeQuest)
          if (!locationCheck.valid) {
            setStatus('session')
            setMessage(locationCheck.message)
            return
          }
        }
        const image = await takeSnapshot()
        const outside = await checkOutdoors(image, onProgress)
        if (!outside.outdoors && activeQuest.requiresOutside !== false) {
          setStatus('session')
          setMessage('That looks indoors. Pickle needs an outdoor find!')
          onResult({ quest: true, outdoors: false, matched: false, image })
          return
        }
        const result = await checkQuestPhoto(image, activeQuest.target, onProgress)
        setStatus('session')
        if (result.matched) {
          const progress = (questData?.progress?.[activeQuest.id] || 0) + 1
          const completed = progress >= activeQuest.goal
          setCelebrating(completed)
          setMessage(completed ? 'Quest complete!' : questPhotoFeedback(activeQuest, progress))
          if (completed) celebrationTimer.current = setTimeout(() => setCelebrating(false), 2800)
        } else {
          setMessage('Not quite! Pickle is still looking. Try another photo.')
        }
        onResult({ quest: true, outdoors: outside.outdoors, ...result, image })
        return
      }

      const image = await takeSnapshot()
      const result = await checkOutdoors(image, onProgress)
      if (result.outdoors) {
        setSessionMode('choose')
        setStatus('session')
        setMessage('We’re outside! Pick a kind of walk.')
        onResult({ ...result, keepCamera: true })
      } else {
        setStatus('ready')
        onResult(result)
      }
    } catch (error) {
      console.error(error)
      setStatus(sessionMode ? 'session' : 'ready')
      setMessage(error instanceof Error ? error.message : 'The photo check failed. Please try again.')
    }
  }

  const shownQuests = questTab === 'daily'
    ? fillQuestList('daily', questData?.recommendations?.daily || [], questData?.completed || {})
    : (questData?.recommendations?.city || CITY_QUESTS.slice(0, 3)).filter((quest) => quest.targetCoordinates)
  const isSession = status === 'session' || status === 'checking' && sessionMode
  const dogMood = sessionMode === 'active' && !celebrating ? 'back' : 'happy'
  const dogMode = celebrating ? 'celebrate' : dogMood === 'back' ? 'still' : 'wander'

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-black text-ink">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onTouchStart={handlePinchStart}
        onTouchMove={handlePinchMove}
        onTouchEnd={handlePinchEnd}
        onTouchCancel={handlePinchEnd}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-100"
        style={{ transform: `${cameraFacing === 'user' ? 'scaleX(-1) ' : ''}scale(${zoom})`, transformOrigin: 'center', touchAction: 'none' }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/35" />

      <div className="absolute right-4 z-40 flex flex-col items-center gap-1 rounded-2xl bg-black/55 p-1.5 text-white shadow-lg" style={{ top: sessionMode ? 'calc(env(safe-area-inset-top, 0px) + 174px)' : 'calc(env(safe-area-inset-top, 0px) + 62px)' }} aria-label="Camera controls">
        <button onClick={() => startCamera(cameraFacing === 'environment' ? 'user' : 'environment')} disabled={status === 'checking' || status === 'starting'} className="min-h-10 rounded-xl px-2 text-xs font-semibold disabled:opacity-50" aria-label="Switch front or rear camera">Flip</button>
        <span className="px-2 text-[10px] font-semibold tabular-nums" aria-live="polite">{zoom.toFixed(1)}x</span>
        <button onClick={() => setZoom((value) => Math.min(MAX_CAMERA_ZOOM, Math.round((value + 0.25) * 100) / 100))} disabled={zoom >= MAX_CAMERA_ZOOM} className="flex h-8 w-8 items-center justify-center rounded-xl text-lg font-semibold disabled:opacity-35" aria-label="Zoom in">+</button>
        <button onClick={() => setZoom((value) => Math.max(1, Math.round((value - 0.25) * 100) / 100))} disabled={zoom <= 1} className="flex h-8 w-8 items-center justify-center rounded-xl text-lg font-semibold disabled:opacity-35" aria-label="Zoom out">−</button>
      </div>

      <button
        onClick={isSession && canEndWalk ? beginFinish : onClose}
        className="absolute left-4 z-40 rounded-full bg-black/55 px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-white"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 14px)' }}
      >
        {isSession && canEndWalk ? 'End walk' : isSession ? 'Close camera' : 'Back'}
      </button>
      {isSession && <button onClick={() => onHistoryOpen?.()} aria-label="Quest history" title="Quest history" className="absolute right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 2.7-6.4L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>
      </button>}

      {isSession && (
        <>
          <div className="absolute inset-x-4 z-10 rounded-3xl bg-white/90 p-4 shadow-lg" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 68px)' }}>
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-lg font-semibold">{pet.name}</span>
              <span className="text-right text-xs font-semibold text-grass">{city || 'City unavailable'}</span>
            </div>
            <StatBar label="Happiness" value={pet.happiness} color="#F2A541" />
          </div>

          {pet.lost ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center pt-12">
              <p className="max-w-[82%] rounded-3xl bg-white/90 px-5 py-4 text-center font-semibold shadow-lg">{pet.name} has wandered off. Walk {Math.max(0, currentSearchDistanceKm(pet) - pet.searchProgressKm).toFixed(1)} km to find them.</p>
            </div>
          ) : (
            <RoamingDog pet={pet} mood={dogMood} mode={dogMode} event={dogEvent} onEventDone={handleDogEventDone} />
          )}

          {message && <p className="absolute left-1/2 top-[31%] z-10 max-w-[85%] -translate-x-1/2 rounded-2xl bg-white/95 px-4 py-2 text-center text-sm font-medium shadow">{message}</p>}

          {sessionMode === 'choose' && (
            <section className="absolute inset-x-4 bottom-8 z-20 rounded-3xl bg-white/95 p-5 shadow-xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
              <p className="text-center text-xl font-semibold">What kind of day?</p>
              <p className="mt-1 text-center text-sm text-ink/65">Pickle will stay with you on camera.</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={() => { prepareDogBark(); setSessionMode('relax'); onModeSelect?.('relax'); setMessage('Taking it easy together.') }} className="min-h-20 rounded-2xl border-2 border-grass/15 bg-leaf px-3 py-3 text-left transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-grass">
                  <span className="block font-semibold text-grass">Relax day</span><span className="mt-1 block text-xs leading-snug text-ink/65">Just walk and enjoy the outdoors</span>
                </button>
                <button onClick={() => { setSessionMode('active'); onModeSelect?.('active'); setMessage('Pick a quest and I’ll help you look for it!') }} className="min-h-20 rounded-2xl bg-grass px-3 py-3 text-left text-white transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-sun">
                  <span className="block font-semibold">Active day</span><span className="mt-1 block text-xs leading-snug text-white/85">Go exploring and do side quests</span>
                </button>
              </div>
            </section>
          )}

          {sessionMode === 'relax' && !activeQuest && !relaxSuggestionVisible && !finishStep && (
            <div className="absolute inset-x-4 bottom-8 z-20 flex flex-col items-center gap-4" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
              <button
                onClick={handleLook}
                disabled={looking || dogEvent?.active || pet.lost}
                aria-label={`Look: show ${pet.name} what the camera sees`}
                className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/30 text-sm font-semibold text-white shadow-lg transition active:scale-95 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-sun"
              >
                {looking ? 'Looking' : 'Look'}
              </button>
              <div className="flex w-full gap-3">
                <button onClick={() => { setSessionMode('choose'); setMessage('Pick a kind of walk.') }} className="min-h-12 flex-1 rounded-2xl bg-white/95 px-4 font-semibold shadow-lg">Change day</button>
                <button onClick={beginFinish} className="min-h-12 flex-1 rounded-2xl bg-black/60 px-4 font-semibold text-white">End walk</button>
              </div>
            </div>
          )}

          {sessionMode === 'active' && !activeQuest && !pet.lost && !celebrating && !finishStep && (
            <section className="absolute inset-x-3 bottom-3 z-20 max-h-[60%] overflow-hidden rounded-3xl bg-white/95 p-4 shadow-xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
              <div className="mb-3 flex min-h-11 items-center justify-between gap-2">
                <h2 className="text-lg font-semibold leading-5">Choose a side quest</h2>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => onQuestReload?.(questTab === 'daily' ? 'daily' : 'city')} aria-label="Reload quests" title="Reload quests" className="flex h-11 w-11 items-center justify-center rounded-full text-grass transition hover:bg-leaf active:scale-95 focus-visible:outline-2 focus-visible:outline-grass">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 0 1.2 4"/></svg>
                  </button>
                  <button onClick={beginFinish} className="flex h-11 items-center justify-center whitespace-nowrap rounded-xl px-3 text-sm font-medium leading-none text-ink/65">End walk</button>
                </div>
              </div>
              <div className="mb-3 grid grid-cols-2 rounded-xl bg-leaf p-1" role="tablist" aria-label="Quest type">
                <button role="tab" aria-selected={questTab === 'daily'} onClick={() => { questListRef.current?.scrollTo(0, 0); setQuestTab('daily') }} className={`min-h-10 rounded-lg px-1 text-xs font-semibold ${questTab === 'daily' ? 'bg-grass text-white' : 'text-ink/65'}`}>Daily</button>
                <button role="tab" aria-selected={questTab === 'city'} onClick={() => { questListRef.current?.scrollTo(0, 0); setQuestTab('city') }} className={`min-h-10 rounded-lg px-1 text-xs font-semibold ${questTab === 'city' ? 'bg-grass text-white' : 'text-ink/65'}`}>Explore</button>
              </div>
              {questTab === 'city' && placesStatus && <p className="mb-2 text-[10px] text-ink/50">{placesStatus} - © OpenStreetMap contributors</p>}
              <div ref={questListRef} className="max-h-56 space-y-2 overflow-y-auto overscroll-contain">
                {shownQuests.length ? shownQuests.map((quest) => {
                  const count = questData?.progress?.[quest.id] || 0
                  return (
                    <button key={quest.id} onClick={() => onQuestStart(quest)} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-grass/10 bg-white px-3 py-2 text-left">
                      <span><span className="block font-semibold">{quest.title}{quest.category ? ` - ${quest.category}` : ''}</span><span className="block text-xs text-ink/65">{quest.copy.replaceAll('your city', city || 'your city')}</span></span>
                      <span className="shrink-0 text-xs font-semibold text-grass">{quest.goal > 1 ? `${count}/${quest.goal}` : 'Start'}</span>
                    </button>
                  )
                }) : <p className="rounded-2xl bg-white p-4 text-center text-sm text-ink/60">{questTab === 'city' ? (city ? placesStatus || `Finding named destinations in ${city}...` : 'Set your city and allow location to find named destinations.') : 'All quests complete. Try reloading.'}</p>}
              </div>
            </section>
          )}

          {activeQuest && !celebrating && !finishStep && (
            <div className="absolute inset-x-4 bottom-8 z-20 flex flex-col items-center gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
              <p className="rounded-2xl bg-white/95 px-4 py-2 text-center text-sm font-semibold shadow">{activeQuest.copy.replaceAll('your city', city || 'your city')}</p>
              <div className="flex w-full gap-3">
                <button onClick={() => { onCancelQuest?.(); setMessage('Choose a different quest when you’re ready.') }} className="min-h-12 rounded-2xl bg-white/95 px-4 font-semibold shadow-lg">Cancel</button>
                <button onClick={handleCheck} disabled={status === 'checking'} className="min-h-12 flex-1 rounded-2xl bg-grass px-4 font-semibold text-white shadow-lg disabled:opacity-60">{status === 'checking' ? 'Looking…' : 'Take quest photo'}</button>
              </div>
              <button onClick={beginFinish} className="min-h-10 rounded-xl px-4 text-sm font-semibold text-white">End walk</button>
            </div>
          )}

          {sessionMode === 'relax' && relaxSuggestionVisible && !activeQuest && !pet.lost && !finishStep && (
            <section className="absolute inset-x-4 bottom-8 z-20 max-h-[60%] overflow-y-auto rounded-3xl bg-white/95 p-4 shadow-xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
              <p className="text-center text-lg font-semibold">Pickle has an idea</p>
              <div className="mt-3 space-y-2">
                {relaxSuggestionQuests.map((quest) => (
                  <button key={quest.id} onClick={() => startRelaxSuggestion(quest)} className="w-full rounded-2xl border border-grass/15 bg-white p-3 text-left">
                    <span className="block font-semibold">{quest.title}</span>
                    <span className="mt-1 block text-sm text-ink/65">{relaxedQuestPrompt(quest, pet.name)}</span>
                    <span className="mt-2 block text-right text-sm font-semibold text-grass">Let’s go</span>
                  </button>
                ))}
              </div>
              <button onClick={dismissRelaxSuggestion} className="mt-3 min-h-11 w-full rounded-2xl bg-leaf px-3 font-semibold">Maybe later</button>
            </section>
          )}

          {finishStep && (
            <section className="absolute inset-x-4 bottom-8 z-30 rounded-3xl bg-white/95 p-5 text-center shadow-xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)' }}>
              {finishStep === 'prompt' ? (
                <>
                  <h2 className="text-xl font-semibold">One last photo?</h2>
                  <p className="mt-1 text-sm text-ink/65">Take a picture to finish your walk story.</p>
                  <div className="mt-4 flex gap-3">
                    <button onClick={() => setFinishStep(null)} className="min-h-12 flex-1 rounded-2xl bg-leaf px-3 font-semibold">Keep walking</button>
                    <button onClick={captureFinishPhoto} className="min-h-12 flex-1 rounded-2xl bg-grass px-3 font-semibold text-white">Take photo</button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold">Keep this walk photo?</h2>
                  <img src={finishPhoto} alt="Your walk-ending photo preview" className="mx-auto mt-3 max-h-36 rounded-2xl object-cover" />
                  <div className="mt-4 flex gap-3">
                    <button onClick={() => setFinishStep('prompt')} className="min-h-12 flex-1 rounded-2xl bg-leaf px-3 font-semibold">Retake</button>
                    <button onClick={finishWalk} className="min-h-12 flex-1 rounded-2xl bg-grass px-3 font-semibold text-white">Finish walk</button>
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}

      {status !== 'session' && !isSession && (
        <div className="absolute inset-x-0 bottom-8 z-20 flex flex-col items-center gap-4 px-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)' }}>
          {message && status !== 'error' && <p className="max-w-xs rounded-2xl bg-black/60 px-4 py-2 text-center text-white" role="status">{message}</p>}
          {status === 'error' ? (
            <div className="flex flex-col items-center gap-3">
              <p className="max-w-xs rounded-2xl bg-black/60 px-4 py-3 text-center text-white" role="alert">{message}</p>
              <button onClick={() => startCamera(cameraFacing)} className="min-h-12 rounded-2xl bg-white px-6 font-semibold text-ink">Try camera again</button>
            </div>
          ) : (
            <button onClick={handleCheck} disabled={status !== 'ready'} aria-label="Check if we are outdoors" className="flex h-20 min-w-20 items-center justify-center rounded-full border-4 border-white bg-white/30 px-3 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-sun">{status === 'checking' ? 'Checking' : 'Check'}</button>
          )}
        </div>
      )}
    </div>
  )
}
