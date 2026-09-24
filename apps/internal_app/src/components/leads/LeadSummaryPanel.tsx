import LeadStatusBadge from '@/components/leads/LeadStatusBadge'
import type { LeadDetail, WeakSection } from '@/lib/n400/leads-shape'

const SECTION_LABELS: Record<string, string> = {
  whatmean: 'Speaking — What does this mean',
  yesno: 'Speaking — Yes/No questions',
  writing: 'Writing',
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-[#f1f4f9] last:border-0">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
        {label}
      </span>
      <span className="text-sm text-slate-700 text-right">{value}</span>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="bg-white rounded-xl p-6"
      style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
    >
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-3">{title}</h3>
      {children}
    </div>
  )
}

function touchLine(touch: Record<string, unknown> | null): string {
  if (!touch) return '—'
  const parts = ['utm_source', 'utm_medium', 'utm_campaign']
    .map((key) => touch[key])
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
  if (parts.length > 0) return parts.join(' / ')
  const referrer = touch['referrer']
  if (typeof referrer === 'string' && referrer.length > 0) return referrer
  const landing = touch['landing_page']
  return typeof landing === 'string' && landing.length > 0 ? landing : 'direct'
}

export default function LeadSummaryPanel({
  lead,
  weakSection,
}: {
  lead: LeadDetail
  weakSection: WeakSection | null
}) {
  return (
    <div className="space-y-4">
      <Card title="Lead">
        <Row
          label="Score"
          value={
            <span className="flex items-center gap-2 justify-end">
              <span className="font-bold text-slate-800">{lead.effective_score}</span>
              <LeadStatusBadge status={lead.effective_status} />
            </span>
          }
        />
        <Row label="Stage" value={lead.journey_stage?.replace(/_/g, ' ') ?? '—'} />
        <Row label="Filed" value={lead.n400_filed === null ? '—' : lead.n400_filed ? 'Yes' : 'Not yet'} />
        <Row label="Timeline" value={lead.filing_timeline ?? '—'} />
        <Row label="Wants guidance" value={lead.wants_guidance ?? '—'} />
        <Row label="Interview" value={formatDate(lead.interview_date)} />
        <Row
          label="Interests"
          value={lead.service_interest?.length ? lead.service_interest.join(', ') : '—'}
        />
      </Card>

      <Card title="Study">
        <Row label="Streak" value={`${lead.current_streak ?? 0} days`} />
        <Row label="Last active" value={formatDate(lead.last_activity_date)} />
        <Row
          label="Weakest area"
          value={
            weakSection
              ? `${SECTION_LABELS[weakSection.section] ?? weakSection.section} · ${weakSection.correct_pct}% of ${weakSection.graded_total}`
              : 'No graded attempts'
          }
        />
      </Card>

      <Card title="Consultation">
        <Row label="Requested" value={formatDate(lead.consultation_requested_at)} />
        <Row label="Booked" value={formatDate(lead.consultation_booked_at)} />
      </Card>

      <Card title="Attribution">
        <Row label="First touch" value={touchLine(lead.first_touch)} />
        <Row label="Last touch" value={touchLine(lead.last_touch)} />
        <Row label="Joined" value={formatDate(lead.created_at)} />
      </Card>
    </div>
  )
}
