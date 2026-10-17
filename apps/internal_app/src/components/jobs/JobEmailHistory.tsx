import { timeAgo } from '@/lib/utils'
import type { NotificationRow } from '@/lib/jobs/types'

const CARD_SHADOW = { boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }

const KIND_LABEL: Record<NotificationRow['kind'], string> = {
  step_done: 'Step done',
  step_waiting_client: 'Waiting on client',
}

export default function JobEmailHistory({ notifications }: { notifications: NotificationRow[] }) {
  return (
    <div className="bg-white rounded-xl p-6" style={CARD_SHADOW}>
      <h3 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-[#ebeef3]">
        Emails sent to the client
      </h3>
      {notifications.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">No emails sent yet.</p>
      ) : (
        <ul className="divide-y divide-[#ebeef3]">
          {notifications.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0">
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                  n.status === 'sent' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {n.status}
              </span>
              <span className="text-sm text-slate-700">{n.to_email}</span>
              <span className="text-xs text-slate-400">
                {KIND_LABEL[n.kind]}
                {n.step ? ` · step ${n.step.position}: ${n.step.title_en}` : ' · step removed'}
                {' · '}
                {timeAgo(n.created_at)}
              </span>
              {n.error && <span className="w-full text-xs text-red-600">{n.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
