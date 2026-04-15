'use client'

import { useRouter } from 'next/navigation'
import { timeAgo } from '@/lib/utils'

interface CaseRow {
  id: string
  status: string
  created_at: string
  primary_client: { first_name: string; last_name: string; id: string } | null
  case_forms: { form_type: string }[]
}

export default function RecentCasesTable({ cases }: { cases: CaseRow[] }) {
  const router = useRouter()

  return (
    <table className="w-full text-left">
      <thead className="bg-surface-container-low/50">
        <tr>
          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Client Name</th>
          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Forms</th>
          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Last Updated</th>
        </tr>
      </thead>
      <tbody className="divide-y-0">
        {cases.map((c) => {
          const initials = `${c.primary_client?.first_name?.[0] ?? ''}${c.primary_client?.last_name?.[0] ?? ''}`.toUpperCase()
          const formsDesc = c.case_forms.map((f) => f.form_type.toUpperCase()).join(', ') || 'N/A'
          const isUrgent = c.status === 'rfe_issued'

          return (
            <tr
              key={c.id}
              className="hover:bg-surface-container-high transition-colors cursor-pointer"
              onClick={() => router.push(`/cases/${c.id}`)}
            >
              <td className="px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs">{initials}</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.primary_client?.first_name} {c.primary_client?.last_name}</p>
                    <p className="text-[11px] text-slate-400 truncate w-32">#{c.id.split('-')[0]}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-5">
                <p className="text-[11px] text-slate-600 font-medium">{formsDesc}</p>
              </td>
              <td className="px-6 py-5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isUrgent ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'
                }`}>
                  {c.status.replace(/_/g, ' ').toUpperCase()}
                </span>
              </td>
              <td className="px-6 py-5">
                <p className="text-xs text-slate-500">{timeAgo(c.created_at)}</p>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
