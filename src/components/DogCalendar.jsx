import { useState } from 'react'
import { localDayKey } from '../utils/dogCalendar.js'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function monthTitle(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export default function DogCalendar({ activityDays = {}, onMarkTodayOutside }) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const today = localDayKey()
  const firstWeekday = (month.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7
  const cells = Array.from({ length: cellCount }, (_, index) => {
    const dayNumber = index - firstWeekday + 1
    if (dayNumber < 1 || dayNumber > daysInMonth) return null
    const date = new Date(month.getFullYear(), month.getMonth(), dayNumber)
    const key = localDayKey(date)
    return { key, dayNumber, status: activityDays[key]?.status || '' }
  })

  function moveMonth(offset) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm" aria-labelledby="activity-calendar-title">
      <div className="mb-3">
        <h2 id="activity-calendar-title" className="text-lg font-semibold">Outside calendar</h2>
        <div className="mt-2 flex items-center justify-between gap-2">
          <button onClick={() => moveMonth(-1)} aria-label="Previous month" className="flex h-11 w-11 items-center justify-center rounded-full bg-leaf text-lg font-semibold text-grass">‹</button>
          <span className="text-center text-sm font-semibold">{monthTitle(month)}</span>
          <button onClick={() => moveMonth(1)} aria-label="Next month" className="flex h-11 w-11 items-center justify-center rounded-full bg-leaf text-lg font-semibold text-grass">›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink/55" aria-hidden="true">
        {WEEKDAYS.map((day, index) => <span key={`${day}-${index}`} className="py-1">{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={monthTitle(month)}>
        {cells.map((cell, index) => cell ? (
          <div key={cell.key} role="gridcell" aria-label={`${cell.key}: ${cell.status === 'outside' ? 'outside day' : cell.status === 'home' ? 'home day' : 'not tracked'}`} aria-current={cell.key === today ? 'date' : undefined} className={`flex aspect-square items-center justify-center rounded-xl text-sm font-semibold ${cell.status === 'outside' ? 'bg-grass text-white' : cell.status === 'home' ? 'bg-leaf text-ink/60' : 'bg-transparent text-ink/35'} ${cell.key === today ? 'ring-2 ring-sun ring-offset-1' : ''}`}>
            {cell.dayNumber}
          </div>
        ) : <span key={`empty-${index}`} aria-hidden="true" />)}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink/65" aria-label="Calendar legend">
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-grass" />Outside day</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-leaf" />Home day</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded border border-ink/20" />Not tracked</span>
      </div>
      {activityDays[today]?.status !== 'outside' && onMarkTodayOutside && (
        <button onClick={onMarkTodayOutside} className="mt-3 min-h-11 w-full rounded-2xl bg-grass px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass">
          Mark today as an outside day
        </button>
      )}
    </section>
  )
}
