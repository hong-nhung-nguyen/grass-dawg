import { useEffect, useRef, useState } from 'react'
import Pet from './Pet.jsx'

// Pickle moving around on the camera screen. On a walk he wanders on his own; when a Look finds
// something from ai/interactions.js he walks to where it is in the photo and acts it out.
//
// mode:  'wander'    roam left and right, stopping now and then to sniff, sit or sunbathe
//        'still'     stand in the middle (used while he faces away during a quest)
//        'celebrate' dash back and forth after a finished quest
// event: { key, action, x, line } - a new key starts a new interaction. x is 0-1 across the
//        photo, or null to act on the spot. line can change while the event plays (the
//        language model's line arriving after the written fallback).

// Keep the whole dog on screen: he is 13rem wide, so his centre stays inside this range (percent)
const LEFT_EDGE = 28
const RIGHT_EDGE = 72
const WALK_MS_PER_STEP = 40 // per percent of screen width
const RUN_MS_PER_STEP = 16
const ACT_MS = 3400
const FIDGETS = ['sniff', 'sit', 'stare', 'sunbathing']
// Actions where he runs over instead of walking
const EAGER_ACTIONS = new Set(['play', 'chase', 'splash', 'greet', 'jump', 'fetch'])

const clampX = (x) => Math.max(LEFT_EDGE, Math.min(RIGHT_EDGE, x))
const between = (min, max) => min + Math.random() * (max - min)
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function RoamingDog({ pet, mood = 'happy', mode = 'wander', event, onEventDone }) {
  const [x, setX] = useState(50)
  const [facing, setFacing] = useState(1)
  const [pose, setPose] = useState('idle')
  const [moveMs, setMoveMs] = useState(0)
  const [busy, setBusy] = useState(false)
  const xRef = useRef(50)
  // Separate timer lists so stopping the wander loop never cancels an interaction mid-way
  const wanderTimers = useRef([])
  const eventTimers = useRef([])
  const onEventDoneRef = useRef(onEventDone)
  onEventDoneRef.current = onEventDone

  const later = (timers, ms, fn) => { timers.current.push(setTimeout(fn, ms)) }
  const clear = (timers) => { timers.current.forEach(clearTimeout); timers.current = [] }

  // Walks or runs to a spot, turning to face the way he's going, then calls next.
  // movingPose replaces the walk or run pose, e.g. trotting back with the ball in his mouth.
  function goTo(target, msPerStep, timers, next, movingPose) {
    const to = clampX(target)
    const distance = Math.abs(to - xRef.current)
    if (distance < 2 || reducedMotion()) {
      xRef.current = to
      setMoveMs(0)
      setX(to)
      next()
      return
    }
    const ms = distance * msPerStep
    setFacing(to > xRef.current ? 1 : -1)
    setPose(movingPose || (msPerStep === RUN_MS_PER_STEP ? 'running' : 'walk'))
    setMoveMs(ms)
    xRef.current = to
    setX(to)
    later(timers, ms, next)
  }

  // Wandering: a short walk or a little fidget, a pause, and again
  useEffect(() => {
    if (mode !== 'wander' || busy || reducedMotion()) return undefined
    function step() {
      if (Math.random() < 0.6) {
        goTo(between(LEFT_EDGE, RIGHT_EDGE), WALK_MS_PER_STEP, wanderTimers, () => {
          setPose('idle')
          later(wanderTimers, between(1400, 2800), step)
        })
      } else {
        setPose(pick(FIDGETS))
        later(wanderTimers, between(1800, 3000), () => {
          setPose('idle')
          later(wanderTimers, between(900, 1600), step)
        })
      }
    }
    later(wanderTimers, 1200, step)
    return () => clear(wanderTimers)
  }, [mode, busy])

  // Standing still in the middle, facing away while the owner looks for a quest
  useEffect(() => {
    if (mode !== 'still' || busy) return undefined
    goTo(50, WALK_MS_PER_STEP, wanderTimers, () => {
      setFacing(1)
      setPose('idle')
    })
    return () => clear(wanderTimers)
  }, [mode, busy])

  // Celebrating: zoom from side to side, then a play bow, and repeat
  useEffect(() => {
    if (mode !== 'celebrate' || busy) return undefined
    function dash(count) {
      if (count === 0) {
        setPose('play')
        later(wanderTimers, 1100, () => dash(3))
        return
      }
      const target = xRef.current < 50 ? RIGHT_EDGE - 4 : LEFT_EDGE + 4
      goTo(target, RUN_MS_PER_STEP, wanderTimers, () => dash(count - 1))
    }
    dash(3)
    return () => clear(wanderTimers)
  }, [mode, busy])

  // An interaction: go to the object, face it, act it out, then go back to what he was doing
  useEffect(() => {
    if (!event) return undefined
    clear(eventTimers)
    setBusy(true)

    function finish() {
      setPose('idle')
      setBusy(false)
      onEventDoneRef.current?.(event)
    }

    // No position means he reacts on the spot
    if (event.x == null) {
      setPose(event.action)
      later(eventTimers, ACT_MS, finish)
      return () => clear(eventTimers)
    }

    const target = clampX(event.x * 100)
    // Stop just short of the object so he stands beside it rather than on top of it
    const approachFrom = target >= xRef.current ? -1 : 1
    const speed = EAGER_ACTIONS.has(event.action) ? RUN_MS_PER_STEP : WALK_MS_PER_STEP

    goTo(target + approachFrom * 6, speed, eventTimers, () => {
      setFacing(-approachFrom)
      if (event.action === 'fetch') {
        // Grab it, then trot back to the owner in the middle with it in his mouth
        setPose('fetch')
        later(eventTimers, 500, () => goTo(50, WALK_MS_PER_STEP, eventTimers, () => {
          setFacing(1)
          setPose('fetch')
          later(eventTimers, ACT_MS - 800, finish)
        }, 'fetch'))
        return
      }
      if (event.action === 'chase') {
        // The bird flies off, so he chases it past where it was, then stops and stares
        goTo(approachFrom === -1 ? RIGHT_EDGE : LEFT_EDGE, RUN_MS_PER_STEP, eventTimers, () => {
          setPose('stare')
          later(eventTimers, ACT_MS / 2, finish)
        })
        return
      }
      setPose(event.action)
      later(eventTimers, ACT_MS, finish)
    })
    return () => clear(eventTimers)
  }, [event?.key])

  useEffect(() => () => {
    clear(wanderTimers)
    clear(eventTimers)
  }, [])

  const line = busy ? event?.line : ''

  return (
    <div className="pointer-events-none absolute inset-x-0 h-52" style={{ top: 'calc(50% - 5rem)' }}>
      <div className="dog-roam absolute bottom-0" style={{ left: `${x}%`, transform: 'translateX(-50%)', transition: `left ${moveMs}ms linear` }}>
        {/* Always mounted so screen readers announce each new line */}
        <p className={line ? 'absolute bottom-full left-1/2 mb-1 w-max max-w-56 -translate-x-1/2 rounded-2xl bg-white/95 px-3 py-2 text-center text-sm font-semibold shadow' : 'sr-only'} aria-live="polite">
          {line}
        </p>
        <div style={{ transform: `scaleX(${mood === 'back' ? 1 : facing})`, transition: 'transform 160ms ease-out' }}>
          <Pet mood={mood} name={pet.name} action={pose} className="h-52 w-52" />
        </div>
      </div>
    </div>
  )
}
