import Link from 'next/link'
import { getConsultations } from '@/actions/consultations'
import ConsultationCard from '@/components/consultations/ConsultationCard'
import { INBOX_TABS, inboxTab, sortForTab, type InboxTab } from '@/lib/n400/consultation'

export const dynamic = 'force-dynamic'

const TAB_LABELS: Record<InboxTab, string> = {
  open: 'Open',
  follow_up: 'Follow-up',
  closed: 'Closed',
}

export default async function ConsultationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const tab: InboxTab = INBOX_TABS.includes(params.tab as InboxTab)
    ? (params.tab as InboxTab)
    : 'open'

  const { rows, capped, convertedClientIds } = await getConsultations()
  const byTab: Record<InboxTab, typeof rows> = { open: [], follow_up: [], closed: [] }
  for (const row of rows) byTab[inboxTab(row)].push(row)
  const waiting = rows.filter((r) => r.status === 'new').length
  const visible = sortForTab(byTab[tab], tab)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Consultations</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          {waiting === 0
            ? 'Nobody waiting for a call'
            : `${waiting} waiting for a call`}
          {capped && ' · showing the 500 most recent requests'}
        </p>
      </div>

      <div className="flex gap-2">
        {INBOX_TABS.map((t) => (
          <Link
            key={t}
            href={t === 'open' ? '/consultations' : `/consultations?tab=${t}`}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              t === tab
                ? 'bg-[rgba(58,175,185,0.12)] text-[#006970]'
                : 'text-slate-500 hover:bg-[#f1f4f9]'
            }`}
          >
            {TAB_LABELS[t]} · {byTab[t].length}
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <div
          className="bg-white rounded-xl p-12 text-center"
          style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
        >
          <span className="material-symbols-outlined text-4xl text-slate-200">support_agent</span>
          <p className="mt-3 text-slate-500 font-medium">No {TAB_LABELS[tab].toLowerCase()} requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((row) => (
            <ConsultationCard
              key={row.id}
              row={row}
              clientId={convertedClientIds[row.user_id] ?? null}
              showAge={tab === 'follow_up'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
