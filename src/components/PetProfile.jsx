import { useState } from 'react'
import Pet from './Pet.jsx'
import StatBar from './StatBar.jsx'
import DogCalendar from './DogCalendar.jsx'
import { currentSearchDistanceKm } from '../utils/dogCalendar.js'

const PERSONALITY = {
  'Golden Retriever': 'Loves water',
  Shiba: 'Curious explorer',
  Corgi: 'Playful companion',
  Pug: 'Loves a cozy day',
  'Border Collie': 'Clever adventurer',
  Dachshund: 'Brave little explorer',
}

export default function PetProfile({ pet, history = [], city, activityDays, onUpdate, onMarkTodayOutside, onClose, onHistoryOpen }) {
  const [nameDraft, setNameDraft] = useState(pet.name)
  const [editingName, setEditingName] = useState(false)
  const rescueDistanceKm = Math.max(0, currentSearchDistanceKm(pet) - pet.searchProgressKm)

  function saveName(event) {
    event.preventDefault()
    const name = nameDraft.trim()
    if (!name) return
    onUpdate({ name })
    setNameDraft(name)
    setEditingName(false)
  }

  return (
    <main className="fixed inset-0 z-[70] mx-auto flex max-w-md flex-col bg-leaf text-ink" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <header className="flex shrink-0 items-center gap-3 px-5 pb-3 pt-4">
        <button type="button" onClick={onClose} aria-label="Back to home" className="flex h-11 w-8 shrink-0 items-center justify-center text-2xl text-ink/70 transition active:scale-95 focus-visible:outline-2 focus-visible:outline-grass">←</button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-grass">Your best friend</p>
          {editingName ? (
            <form onSubmit={saveName} className="mt-1 flex items-center gap-2">
              <label className="sr-only" htmlFor="pet-profile-name">Dog name</label>
              <input autoFocus id="pet-profile-name" value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={24} className="min-w-0 flex-1 rounded-xl border border-ink/20 bg-white px-3 py-1.5 text-xl font-semibold focus-visible:outline-2 focus-visible:outline-grass" />
              <button type="submit" disabled={!nameDraft.trim()} className="min-h-10 rounded-xl bg-grass px-3 text-sm font-semibold text-white disabled:opacity-50">Save</button>
              <button type="button" onClick={() => { setNameDraft(pet.name); setEditingName(false) }} className="min-h-10 rounded-xl px-2 text-sm font-semibold text-ink/65">Cancel</button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-semibold">{pet.name}</h1>
              <button type="button" onClick={() => setEditingName(true)} aria-label={`Edit ${pet.name}'s name`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-grass shadow-sm transition active:scale-95 focus-visible:outline-2 focus-visible:outline-grass">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m16 4 4 4"/><path d="M4 20l4-.8L19 8a2.8 2.8 0 0 0-4-4L4 15z"/><path d="M14 6l4 4"/></svg>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-6">
        <section className="relative overflow-hidden rounded-[2rem] bg-grass-dark px-5 pb-5 pt-2 text-center text-white shadow-lg">
          <div aria-hidden="true" className="absolute -right-7 -top-8 h-28 w-28 rounded-full bg-sun/80" />
          <div className="relative mx-auto mb-2 flex h-60 w-60 items-center justify-center">
            <Pet mood="happy" name={pet.name} action="idle" className="h-60 w-60" />
          </div>
          <h2 className="relative text-3xl font-bold">{pet.name}</h2>
          <p className="mt-1 text-sm font-medium text-white/85">{pet.breed} · {PERSONALITY[pet.breed] || 'Loyal walking buddy'}</p>
          <span className={`mt-3 inline-flex min-h-9 items-center rounded-full px-4 text-sm font-semibold ${pet.lost ? 'bg-sun text-ink' : 'bg-white/15 text-white'}`}>
            {pet.lost ? `Missing Â· ${rescueDistanceKm.toFixed(1)} km walk to find ${pet.name}` : pet.outdoors ? 'Out exploring' : 'At home, ready for a walk'}
          </span>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm" aria-labelledby="profile-weight-heading">
          <div className="flex items-baseline justify-between gap-3">
            <div><h2 id="profile-weight-heading" className="text-lg font-semibold">Weight</h2><p className="text-sm text-ink/60">A little care each day keeps {pet.name} well.</p></div>
            <p className="shrink-0 text-2xl font-bold text-grass">{Number(pet.weightKg || 2).toFixed(1)} <span className="text-base">kg</span></p>
          </div>
          <p className="mt-3 rounded-2xl bg-leaf p-3 text-sm leading-relaxed text-ink/75">
            {pet.lost
              ? `${pet.name} has wandered off. Walk ${rescueDistanceKm.toFixed(1)} more km to find them. Distance adds 1 km for each day away.`
              : 'A happy day outside adds 0.5 kg when happiness is above 80%. After two home days in a row, weight drops by 0.5 kg each day.'}
          </p>
        </section>

        <DogCalendar activityDays={activityDays} onMarkTodayOutside={onMarkTodayOutside} />

        <section className="rounded-3xl bg-white p-4 shadow-sm" aria-labelledby="profile-stats-heading">
          <div className="mb-4">
            <h2 id="profile-stats-heading" className="text-lg font-semibold">How {pet.name} is feeling</h2>
          </div>
          <StatBar label="Happiness" value={pet.happiness} color="#F2A541" />
        </section>

        <section className="grid grid-cols-2 gap-3" aria-label="Adventure summary">
          <button type="button" onClick={onHistoryOpen} aria-label={`View ${history.length} completed quests in history`} className="rounded-3xl bg-white p-4 text-left shadow-sm transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass">
            <p className="text-sm text-ink/65">Quests completed</p>
            <p className="mt-1 text-3xl font-bold text-grass">{history.length}</p>
            <p className="text-xs text-ink/55">Tap to view quest history</p>
          </button>
          <article className="rounded-3xl bg-white p-4 shadow-sm">
            <p className="text-sm text-ink/65">Home city</p>
            <p className="mt-2 truncate text-lg font-semibold">{city || 'Not set yet'}</p>
            <p className="text-xs text-ink/55">for local adventures</p>
          </article>
        </section>
      </div>
    </main>
  )
}
