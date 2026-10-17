import { LEAD_TIME_ZONE } from '@/lib/n400/activity'
import type { ProfilingRow, ProfilingStatus } from '@/lib/n400/profiling-status'

// Icon + words for every status, so state never rides on colour alone.
const STATUS_STYLE: Record<ProfilingStatus, { icon: string; color: string }> = {
  answered: { icon: 'check_circle', color: '#006970' },
  ignored: { icon: 'visibility', color: '#b45309' },
  skipped: { icon: 'skip_next', color: '#64748b' },
  not_asked: { icon: 'schedule', color: '#94a3b8' },
  locked: { icon: 'lock', color: '#cbd5e1' },
  not_applicable: { icon: 'remove_circle_outline', color: '#cbd5e1' },
}

function formatDay(value: string | null): string | null {
  if (!value) return null
  return new Date(value).toLocaleDateString('en-US', {
    timeZone: LEAD_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  })
}

function StatusText({ row }: { row: ProfilingRow }) {
  const day = formatDay(row.at)
  switch (row.status) {
    case 'answered':
      return (
        <>
          <span className="font-semibold text-slate-800">{row.answer}</span>
          {day && <span className="text-slate-400"> · {day}</span>}
        </>
      )
    case 'ignored':
      return (
        <span className="text-amber-700">
          Shown {row.shownCount}×, no answer{day ? ` · last ${day}` : ''}
        </span>
      )
    case 'skipped':
      return <span className="text-slate-600">Skipped{day ? ` · ${day}` : ''}</span>
    case 'not_applicable':
      return <span className="text-slate-400">Not applicable</span>
    default:
      return <span className="text-slate-400">{row.note}</span>
  }
}

export default function LeadProfilingCard({ rows }: { rows: ProfilingRow[] }) {
  if (rows.length === 0) return null
  const applicable = rows.filter((r) => r.status !== 'not_applicable')
  const answered = applicable.filter((r) => r.status === 'answered').length

  return (
    <div
      className="bg-white rounded-xl p-6"
      style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
          Profiling questions
        </h3>
        <span className="text-[11px] text-slate-400">
          {answered} of {applicable.length} answered
        </span>
      </div>

      <ul>
        {rows.map((row) => {
          const style = STATUS_STYLE[row.status]
          return (
            <li
              key={row.key}
              className="flex items-center gap-3 py-2.5 border-b border-[#f1f4f9] last:border-0"
            >
              <span
                className="material-symbols-outlined text-[18px] shrink-0"
                style={{ color: style.color }}
                aria-hidden="true"
              >
                {style.icon}
              </span>
              <span
                className={`text-sm flex-1 min-w-0 ${
                  row.status === 'locked' || row.status === 'not_applicable'
                    ? 'text-slate-400'
                    : 'text-slate-700'
                }`}
              >
                {row.question}
              </span>
              <span className="text-[13px] text-right shrink-0">
                <StatusText row={row} />
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
