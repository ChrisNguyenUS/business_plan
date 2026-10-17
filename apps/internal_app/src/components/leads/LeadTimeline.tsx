import { describeEvent } from '@/lib/n400/timeline'
import { LEAD_TIME_ZONE, type ActivityDay, type ActivityItem } from '@/lib/n400/activity'
import type { PromptDefinitionRow } from '@/lib/n400/profiling-status'

type Questions = ReadonlyMap<string, PromptDefinitionRow>

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('en-US', {
    timeZone: LEAD_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDayHeading(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function Icon({ name }: { name: string }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: 'rgba(58,175,185,0.1)' }}
    >
      <span className="material-symbols-outlined text-[18px]" style={{ color: '#006970' }}>
        {name}
      </span>
    </div>
  )
}

function Item({ item, questions }: { item: ActivityItem; questions: Questions }) {
  if (item.kind === 'practice') {
    const pct = Math.round((item.correct / item.count) * 100)
    const time =
      item.startAt === item.endAt
        ? formatTime(item.endAt)
        : `${formatTime(item.startAt)} – ${formatTime(item.endAt)}`
    return (
      <li className="flex items-center gap-4 py-2.5">
        <Icon name="school" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">
            Practiced {item.count} {item.count === 1 ? 'question' : 'questions'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1.5 w-32 rounded-full bg-[#ebeef3] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#006970' }} />
            </div>
            <span className="text-[12px] text-slate-500 tabular-nums">
              {item.correct} correct · {pct}%
            </span>
          </div>
        </div>
        <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">{time}</span>
      </li>
    )
  }

  const entry = describeEvent(item.event.event_type, item.event.payload ?? {}, questions)
  return (
    <li className="flex items-center gap-4 py-2.5">
      <Icon name={entry.icon} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{entry.title}</p>
        {entry.detail && <p className="text-[12px] text-slate-500 mt-0.5">{entry.detail}</p>}
      </div>
      <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">
        {formatTime(item.event.created_at)}
      </span>
    </li>
  )
}

export default function LeadTimeline({
  days,
  shown,
  total,
  questions,
}: {
  days: ActivityDay[]
  questions: Questions
  /** Raw events loaded — may be fewer than total for a very active lead. */
  shown: number
  total: number
}) {
  if (days.length === 0) {
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
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Activity</h3>
        <span className="text-[11px] text-slate-400">
          {shown < total
            ? `${shown} most recent of ${total} events`
            : `${total} ${total === 1 ? 'event' : 'events'}`}
        </span>
      </div>

      <div className="space-y-4">
        {days.map((day) => (
          <section key={day.day}>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-[#f1f4f9] pb-1.5">
              {formatDayHeading(day.day)}
            </h4>
            <ol>
              {day.items.map((item) => (
                <Item
                  key={item.kind === 'practice' ? item.id : item.event.id}
                  item={item}
                  questions={questions}
                />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  )
}
