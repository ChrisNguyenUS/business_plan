import type { ActivitySummary } from '@/lib/n400/activity'

const BAR_COLOR = '#006970'
const CHART_HEIGHT = 96

function label(day: string): string {
  // day is a calendar date already; render it in UTC so it doesn't shift.
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  })
}

/** Questions answered per day over the last 30 days. One series, so the
 *  title names it and there is no legend. */
export default function LeadActivityChart({ daily }: { daily: ActivitySummary['daily'] }) {
  const peak = Math.max(0, ...daily.map((d) => d.questions))
  const max = Math.max(1, peak)
  const total = daily.reduce((sum, d) => sum + d.questions, 0)

  return (
    <div
      className="bg-white rounded-xl p-6"
      style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
    >
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
          Questions per day
        </h3>
        <span className="text-[11px] text-slate-400">
          {total} in the last 30 days · peak {peak}
        </span>
      </div>

      <div
        className="flex items-end gap-[2px] border-b border-[#ebeef3]"
        style={{ height: CHART_HEIGHT }}
        aria-hidden="true"
      >
        {daily.map((d) => {
          const h = d.questions === 0 ? 0 : Math.max(3, (d.questions / max) * CHART_HEIGHT)
          return (
            // Full-height column = hit target bigger than the bar itself.
            <div key={d.day} className="group relative flex-1 h-full flex items-end">
              <div
                className="w-full rounded-t-[4px] transition-opacity group-hover:opacity-80"
                style={{ height: h, backgroundColor: BAR_COLOR }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[11px] text-white z-10">
                {label(d.day)}: {d.questions} {d.questions === 1 ? 'question' : 'questions'}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-between mt-1.5 text-[11px] text-slate-400">
        <span>{label(daily[0].day)}</span>
        <span>Today</span>
      </div>

      {/* Table view for screen readers — the bars above are aria-hidden. */}
      <ul className="sr-only">
        {daily
          .filter((d) => d.questions > 0)
          .map((d) => (
            <li key={d.day}>
              {label(d.day)}: {d.questions} questions
            </li>
          ))}
      </ul>
    </div>
  )
}
