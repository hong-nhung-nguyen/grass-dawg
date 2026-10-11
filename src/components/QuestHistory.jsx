export default function QuestHistory({ entries = [], onClose }) {
  return (
    <main className="fixed inset-0 z-[70] mx-auto flex max-w-md flex-col bg-leaf" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <header className="flex items-center gap-3 px-5 pb-4 pt-5">
        <button onClick={onClose} aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow-sm">←</button>
        <div><p className="text-sm font-medium text-grass">Your adventures</p><h1 className="text-2xl font-semibold">Quest history</h1></div>
      </header>
      {entries.length ? (
        <section className="flex-1 space-y-3 overflow-y-auto px-5 pb-6" aria-label="Completed quests">
          {entries.map((item) => (
            <article key={item.id} className="rounded-3xl border border-grass/10 bg-white p-4 shadow-sm">
              <span className="text-xs font-bold uppercase text-grass">{item.type} quest complete{item.city ? ` - ${item.city}` : ''}</span>
              <h2 className="mt-1 text-lg font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm text-ink/65">{item.copy}</p>
              <time className="mt-3 block text-xs text-ink/50" dateTime={new Date(item.completedAt).toISOString()}>{new Date(item.completedAt).toLocaleString()}</time>
            </article>
          ))}
        </section>
      ) : <p className="mx-5 rounded-3xl bg-white p-5 text-center text-ink/60">Completed quests will show up here.</p>}
    </main>
  )
}
