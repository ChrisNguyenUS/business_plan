import Link from 'next/link'
import { getDeletionRequests } from '@/actions/deletion-requests'
import { isCurrentUserAdmin } from '@/lib/auth/is-admin'
import { actionLabel, entityHref, type DeletionRequestRow } from '@/lib/deletion/requests'
import DecisionButtons from '@/components/deletion/DecisionButtons'

export const dynamic = 'force-dynamic'

const CARD = { boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }

const STATUS_STYLE: Record<DeletionRequestRow['status'], string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-[rgba(58,175,185,0.1)] text-[#006970]',
  rejected: 'bg-slate-100 text-slate-600',
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ItemCell({ row }: { row: DeletionRequestRow }) {
  // Approved case/client rows point at something that no longer exists.
  const gone = row.status === 'approved' && row.entity_type !== 'lead'
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {actionLabel(row.entity_type)}
      </p>
      {gone ? (
        <p className="text-sm font-semibold text-slate-500">{row.entity_label}</p>
      ) : (
        <Link
          href={entityHref(row.entity_type, row.entity_id)}
          className="text-sm font-semibold text-slate-800 hover:underline"
        >
          {row.entity_label}
        </Link>
      )}
    </div>
  )
}

export default async function DeletionRequestsPage() {
  const [isAdmin, { pending, decided, names }] = await Promise.all([
    isCurrentUserAdmin(),
    getDeletionRequests(),
  ])
  const who = (id: string | null) => (id ? names[id] ?? 'Unknown' : '—')

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Deletion requests</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          {isAdmin
            ? `${pending.length} waiting for you`
            : 'Your requests to delete a case or client, or hide a lead'}
        </p>
      </div>

      <section className="bg-white rounded-xl p-6 space-y-4" style={CARD}>
        <h3 className="text-base font-semibold text-slate-800">Pending</h3>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Nothing waiting.</p>
        ) : (
          <ul className="divide-y divide-[#f1f4f9]">
            {pending.map((row) => (
              <li key={row.id} className="py-4 flex items-start justify-between gap-6">
                <div className="space-y-1 min-w-0">
                  <ItemCell row={row} />
                  <p className="text-sm text-slate-600 break-words">“{row.reason}”</p>
                  <p className="text-[11px] text-slate-400">
                    {who(row.requested_by)} · {formatDate(row.created_at)}
                  </p>
                </div>
                {isAdmin && <DecisionButtons requestId={row.id} action={actionLabel(row.entity_type)} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-xl p-6 space-y-4" style={CARD}>
        <h3 className="text-base font-semibold text-slate-800">History</h3>
        {decided.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No decisions yet.</p>
        ) : (
          <ul className="divide-y divide-[#f1f4f9]">
            {decided.map((row) => (
              <li key={row.id} className="py-4 flex items-start justify-between gap-6">
                <div className="space-y-1 min-w-0">
                  <ItemCell row={row} />
                  <p className="text-sm text-slate-600 break-words">“{row.reason}”</p>
                  <p className="text-[11px] text-slate-400">
                    Asked by {who(row.requested_by)} · {formatDate(row.created_at)} · decided by{' '}
                    {who(row.decided_by)} · {formatDate(row.decided_at)}
                  </p>
                  {row.decision_note && (
                    <p className="text-xs text-slate-500">Note: {row.decision_note}</p>
                  )}
                </div>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold capitalize shrink-0 ${STATUS_STYLE[row.status]}`}
                >
                  {row.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
