// One small labelled bar for a pet stat
export default function StatBar({ label, value, color }) {
  const percentage = Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-20 shrink-0 text-ink/70">{label}</span>
      <div
        className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ink/10"
        role="progressbar"
        aria-label={label}
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${percentage}%`, background: color }} />
      </div>
      <span className="w-10 shrink-0 text-right font-semibold tabular-nums text-ink/75" aria-label={`${label}: ${percentage}%`}>{percentage}%</span>
    </div>
  )
}
