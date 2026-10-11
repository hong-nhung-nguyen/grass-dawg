import { useState } from 'react'
import { getRouteStats, normalizeRoute } from '../utils/route.js'

function durationLabel(startedAt, endedAt) {
  const minutes = Math.max(1, Math.round((endedAt - startedAt) / 60000))
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (!hours) return `${minutes} min`
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function formatPace(minutesPerKm) {
  if (minutesPerKm === null || !Number.isFinite(minutesPerKm)) return null
  const seconds = Math.round(minutesPerKm * 60)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} /km`
}

function drawRoute(context, points, width, height) {
  const route = normalizeRoute(points)
  if (route.length < 2) return
  context.save()
  context.beginPath()
  context.moveTo(route[0].x * width, route[0].y * height)
  route.slice(1).forEach((point) => context.lineTo(point.x * width, point.y * height))
  context.strokeStyle = '#FF5B25'
  context.lineWidth = Math.max(5, width * 0.009)
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.shadowColor = 'rgba(0, 0, 0, .55)'
  context.shadowBlur = 10
  context.stroke()
  context.restore()
}

async function createEditedPhoto(session, duration) {
  const image = await loadImage(session.finalPhoto)
  const scale = Math.min(1, 1440 / image.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  drawRoute(context, session.routePoints, canvas.width, canvas.height)

  if (session.questPhotos.length) {
    const questImages = await Promise.all(session.questPhotos.map((photo) => loadImage(photo.image)))
    const gap = canvas.width * 0.012
    if (questImages.length <= 4) {
      const tileWidth = canvas.width * 0.31
      const tileHeight = Math.min(canvas.height * 0.19, canvas.width * 0.32)
      const totalHeight = questImages.length * tileHeight + (questImages.length - 1) * gap
      let y = Math.max(canvas.height * 0.035, (canvas.height - totalHeight) / 2)
      for (const questImage of questImages) {
        drawPhotoTile(context, questImage, (canvas.width - tileWidth) / 2, y, tileWidth, tileHeight)
        y += tileHeight + gap
      }
    } else {
      const columns = 3
      const rows = Math.ceil(questImages.length / columns)
      const tileWidth = canvas.width * 0.25
      const tileHeight = Math.min(canvas.height * 0.18, canvas.height * 0.53 / rows)
      const columnGap = canvas.width * 0.025
      const totalWidth = columns * tileWidth + (columns - 1) * columnGap
      const startX = (canvas.width - totalWidth) / 2
      const startY = canvas.height * 0.04
      questImages.forEach((questImage, index) => {
        const column = index % columns
        const row = Math.floor(index / columns)
        drawPhotoTile(context, questImage, startX + column * (tileWidth + columnGap), startY + row * (tileHeight + gap), tileWidth, tileHeight)
      })
    }
  }

  const shadeHeight = Math.max(100, canvas.height * 0.16)
  const shade = context.createLinearGradient(0, canvas.height - shadeHeight, 0, canvas.height)
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)')
  shade.addColorStop(1, 'rgba(0, 0, 0, .72)')
  context.fillStyle = shade
  context.fillRect(0, canvas.height - shadeHeight, canvas.width, shadeHeight)
  context.textAlign = 'center'
  context.textBaseline = 'bottom'
  context.fillStyle = '#FFFFFF'
  context.shadowColor = 'rgba(0, 0, 0, .75)'
  context.shadowBlur = 8
  context.font = `700 ${Math.max(24, canvas.width * 0.055)}px system-ui, sans-serif`
  context.fillText(duration, canvas.width / 2, canvas.height - Math.max(24, canvas.height * 0.035))
  context.shadowBlur = 0

  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not edit the walk photo.')), 'image/png'))
}

function drawPhotoTile(context, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  context.save()
  context.fillStyle = '#FFFFFF'
  context.fillRect(x - 3, y - 3, width + 6, height + 6)
  context.beginPath()
  context.rect(x, y, width, height)
  context.clip()
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight)
  context.restore()
}

export default function WalkSummary({ session, onClose }) {
  const [sharing, setSharing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState(0)
  const duration = durationLabel(session.startedAt, session.endedAt)
  const routeStats = getRouteStats(session.routePoints, session.startedAt, session.endedAt)
  const route = normalizeRoute(session.routePoints)
  const routeAvailable = routeStats.kilometers > 0.02 && route.length > 1
  const questPhotos = session.questPhotos || []
  const displayedPhoto = selectedPhoto === 0 ? session.finalPhoto : questPhotos[selectedPhoto - 1]?.image || session.finalPhoto

  async function sharePhoto() {
    setSharing(true)
    setFeedback('Preparing the edited photo…')
    try {
      const blob = await createEditedPhoto(session, duration)
      const file = new File([blob], 'grass-dawg-walk-photo.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: 'My walk with Pickle' })
        setFeedback('Your edited photo is ready to share.')
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'grass-dawg-walk-photo.png'
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        setFeedback('Edited photo saved. Share it from your photos.')
      }
    } catch (error) {
      setFeedback(error.name === 'AbortError' ? '' : 'Could not edit the photo. Please try again.')
    } finally {
      setSharing(false)
    }
  }

  async function downloadPhoto() {
    setDownloading(true)
    setFeedback('Preparing the edited photo…')
    try {
      const blob = await createEditedPhoto(session, duration)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'grass-dawg-walk-photo.png'
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setFeedback('Edited photo downloaded.')
    } catch {
      setFeedback('Could not edit the photo. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <main className="relative mx-auto h-full w-full max-w-md overflow-hidden bg-white text-white">
      <div className="absolute inset-x-3 overflow-hidden rounded-[2rem] bg-black shadow-xl" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
      <div className="absolute inset-0 z-0 flex justify-center">
        <img src={displayedPhoto} alt={selectedPhoto === 0 ? 'Final walk photo' : questPhotos[selectedPhoto - 1]?.title || 'Quest photo'} className="h-full w-full object-cover" />
        {selectedPhoto === 0 && routeAvailable && (
          <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" role="img" aria-label="Your GPS walking route">
            <polyline points={route.map(({ x, y }) => `${x},${y}`).join(' ')} fill="none" stroke="#FF5B25" strokeWidth="0.009" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {selectedPhoto === 0 && questPhotos.length > 0 && (
          <div className={questPhotos.length <= 4
            ? 'absolute left-1/2 top-[8%] z-[1] flex w-[31%] -translate-x-1/2 flex-col gap-1'
            : 'absolute right-[6%] top-[5%] z-[1] grid w-[78%] grid-cols-3 gap-1'}>
            {questPhotos.map((photo, index) => (
              <button key={`${index}-${photo.title}`} onClick={() => setSelectedPhoto(index + 1)} aria-label={`View ${photo.title}`} className={`block w-full overflow-hidden border-2 border-white shadow-lg ${questPhotos.length <= 4 ? 'aspect-[0.9]' : 'aspect-[1.1]'}`}>
                <img src={photo.image} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/75" />

      <header className="absolute inset-x-0 top-0 z-10 flex items-start justify-between px-4 pt-3">
        <button onClick={onClose} className="pointer-events-auto min-h-11 rounded-full bg-black/45 px-4 font-semibold text-white backdrop-blur-sm">Done</button>
        <div className="flex flex-col items-end gap-2">
          {session.completedQuests > 0 && <p className="rounded-full bg-black/45 px-4 py-3 text-sm font-semibold backdrop-blur-sm">{session.completedQuests} {session.completedQuests === 1 ? 'quest' : 'quests'}</p>}
          {session.discoveries?.length > 0 && <p className="max-w-56 rounded-2xl bg-black/45 px-4 py-2 text-right text-sm font-semibold backdrop-blur-sm">Discovered: {session.discoveries.join(', ')}</p>}
        </div>
      </header>

      {(session.rescue || session.weightGained) && (
        <p className="pointer-events-none absolute inset-x-4 top-16 z-10 rounded-2xl bg-black/55 px-4 py-3 text-center text-sm font-semibold text-white backdrop-blur-sm">
          {session.rescue
            ? session.rescue.found
              ? `You found ${session.rescue.name}! They are coming home with you.`
              : `Search walk: ${session.rescue.progressKm.toFixed(1)} of ${session.rescue.requiredKm.toFixed(1)} km. Your distance carries over to the next walk.`
            : 'A happy walk! Your dog gained 0.5 kg.'}
        </p>
      )}

      {selectedPhoto === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-5 pb-5 text-center">
          {!routeAvailable && <p className="mb-2 text-xs font-medium text-white/90">{session.locationError || 'GPS route unavailable'}</p>}
          <p className="text-3xl font-bold drop-shadow-lg">{duration}</p>
          {routeAvailable && <p className="mt-1 text-sm font-semibold drop-shadow-lg">{routeStats.kilometers.toFixed(2)} km{formatPace(routeStats.pace) ? ` · ${formatPace(routeStats.pace)}` : ''}</p>}
          {questPhotos.length > 0 && (
            <div className="pointer-events-auto mt-4 flex justify-center gap-2 overflow-x-auto pb-2">
              <button onClick={() => setSelectedPhoto(0)} aria-label="Show final walk photo" className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 border-white">
                <img src={session.finalPhoto} alt="" className="h-full w-full object-cover" />
              </button>
              {questPhotos.map((photo, index) => (
                <button key={`${index}-${photo.title}`} onClick={() => setSelectedPhoto(index + 1)} aria-label={`Show ${photo.title}`} className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${selectedPhoto === index + 1 ? 'border-sun' : 'border-white/70'}`}>
                  <img src={photo.image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {feedback && <p className="mt-2 text-sm text-white" role="status">{feedback}</p>}
          <div className="pointer-events-auto mt-3 flex gap-3">
            <button onClick={sharePhoto} disabled={sharing || downloading} className="min-h-12 flex-1 rounded-2xl bg-grass px-4 text-base font-semibold text-white shadow-lg disabled:opacity-60">{sharing ? 'Preparing…' : 'Share photo'}</button>
            <button onClick={downloadPhoto} disabled={sharing || downloading} className="min-h-12 flex-1 rounded-2xl bg-white px-4 text-base font-semibold text-ink shadow-lg disabled:opacity-60">{downloading ? 'Saving…' : 'Download'}</button>
          </div>
        </div>
      )}
      {selectedPhoto > 0 && (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-4 pb-5 pt-16 text-center">
          <p className="font-semibold">{questPhotos[selectedPhoto - 1]?.title}</p>
          <button onClick={() => setSelectedPhoto(0)} className="mt-3 min-h-11 rounded-full bg-white/20 px-5 font-semibold backdrop-blur-sm">Back to walk photo</button>
        </div>
      )}
      </div>
    </main>
  )
}
