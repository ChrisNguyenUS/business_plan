import type { LeadStatus } from '@mannaos/n400-growth'

const STATUS_STYLES: Record<LeadStatus, string> = {
  cold: 'bg-slate-100 text-slate-600',
  warm: 'bg-amber-50 text-amber-700',
  hot: 'bg-orange-50 text-orange-700',
  sales_ready: 'bg-[rgba(58,175,185,0.1)] text-[#006970]',
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  cold: 'Cold',
  warm: 'Warm',
  hot: 'Hot',
  sales_ready: 'Sales Ready',
}

export default function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold ${
        STATUS_STYLES[status] ?? STATUS_STYLES.cold
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
