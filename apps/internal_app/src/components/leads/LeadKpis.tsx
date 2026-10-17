import { LEAD_TIME_ZONE, type ActivitySummary } from '@/lib/n400/activity'

function formatDay(value: string | null): string {
  if (!value) return 'never'
  return new Date(value).toLocaleDateString('en-US', {
    timeZone: LEAD_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  })
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div
      className="bg-white rounded-xl p-5"
      style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
    >
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-semibold text-slate-800 tracking-tight mt-1 tabular-nums">
        {value}
      </p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  )
}

export default function LeadKpis({ summary }: { summary: ActivitySummary }) {
  const { practiced, practiceCorrect, accuracyPct, mocksTaken, mocksPassed } = summary
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Tile label="Questions practiced" value={String(practiced)} sub="graded practice" />
      <Tile
        label="Accuracy"
        value={accuracyPct === null ? '—' : `${accuracyPct}%`}
        sub={practiced > 0 ? `${practiceCorrect} of ${practiced} correct` : 'no practice yet'}
      />
      <Tile
        label="Mock tests"
        value={String(mocksTaken)}
        sub={mocksTaken > 0 ? `${mocksPassed} passed` : 'none yet'}
      />
      <Tile
        label="Active days"
        value={String(summary.activeDays)}
        sub={`last 30 days · last ${formatDay(summary.lastActiveAt)}`}
      />
    </div>
  )
}
