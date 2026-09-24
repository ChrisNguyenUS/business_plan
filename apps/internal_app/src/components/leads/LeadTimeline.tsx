import { describeEvent } from '@/lib/n400/timeline'
import type { TimelineRow } from '@/lib/n400/leads-shape'

function formatStamp(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function LeadTimeline({
  events,
  total,
}: {
  events: TimelineRow[]
  total: number
}) {
  if (events.length === 0) {
    return (
      <div
        className="bg-white rounded-xl p-12 text-center"
        style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
      >
        <span className="material-symbols-outlined text-4xl text-slate-200">history</span>
        <p className="mt-3 text-slate-500 font-medium">No activity recorded yet</p>
      </div>
    )
  }

  return (
    <div
      className="bg-white rounded-xl p-6"
      style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
    >
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Activity</h3>
        <span className="text-[11px] text-slate-400">
          {events.length < total
            ? `${events.length} most recent of ${total}`
            : `${total} ${total === 1 ? 'event' : 'events'}`}
        </span>
      </div>

      <ol className="space-y-0">
        {events.map((event, index) => {
          const entry = describeEvent(event.event_type, event.payload ?? {})
          const isLast = index === events.length - 1
          return (
            <li key={event.id} className="flex gap-4">
              {/* Rail */}
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(58,175,185,0.1)' }}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ color: '#006970' }}
                  >
                    {entry.icon}
                  </span>
                </div>
                {!isLast && <div className="w-px flex-1 bg-[#ebeef3] my-1" />}
              </div>

              {/* Body */}
              <div className={isLast ? 'pb-0' : 'pb-6'}>
                <p className="text-sm font-semibold text-slate-800">{entry.title}</p>
                {entry.detail && (
                  <p className="text-[12px] text-slate-500 mt-0.5">{entry.detail}</p>
                )}
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {formatStamp(event.created_at)}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
