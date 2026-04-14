import { getCases } from '@/actions/cases'
import Link from 'next/link'
import { CASE_STATUS_COLORS, CASE_STATUS_LABELS, type CaseStatus } from '@/types'
import { timeAgo } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const status = params.status as CaseStatus | undefined

  const cases = await getCases({ status })

  const statusOptions: Array<{ value: CaseStatus | ''; label: string }> = [
    { value: '', label: 'All Cases' },
    { value: 'documents_pending', label: 'Documents Pending' },
    { value: 'ready_to_file', label: 'Ready to File' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'rfe_issued', label: 'RFE Issued' },
    { value: 'approved', label: 'Approved' },
    { value: 'denied', label: 'Denied' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Cases</h2>
          <p className="text-sm text-slate-400 mt-0.5">{cases.length} case{cases.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/cases/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-all"
          style={{ background: 'linear-gradient(135deg, #006970 0%, #3AAFB9 100%)' }}
        >
          <span className="material-symbols-outlined text-lg">create_new_folder</span>
          New Case
        </Link>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((opt) => {
          const isActive = (opt.value === '' && !status) || opt.value === status
          return (
            <Link
              key={opt.value}
              href={opt.value ? `/cases?status=${opt.value}` : '/cases'}
              className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={
                isActive
                  ? { backgroundColor: '#3AAFB9', color: 'white' }
                  : {
                      backgroundColor: '#f1f4f9',
                      color: '#3d494a',
                    }
              }
            >
              {opt.label}
            </Link>
          )
        })}
      </div>

      {/* Cases Table */}
      {cases.length === 0 ? (
        <div
          className="bg-white rounded-xl p-16 text-center"
          style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
        >
          <span className="material-symbols-outlined text-5xl text-slate-200">
            folder_open
          </span>
          <p className="mt-4 text-slate-500 font-medium">No cases found</p>
          <Link
            href="/cases/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold"
            style={{ color: '#3AAFB9' }}
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Create new case
          </Link>
        </div>
      ) : (
        <div
          className="bg-white rounded-xl overflow-hidden"
          style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
        >
          <table className="w-full text-left">
            <thead className="bg-[#f7f9ff]/60 border-b border-[#ebeef3]">
              <tr>
                {['Client', 'Case Type / Forms', 'Status', 'Receipt #', 'Created', ''].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cases.map((c: any) => {
                const client = c.primary_client
                const forms = c.case_forms ?? []
                const initials = client
                  ? `${client.first_name?.[0] ?? ''}${client.last_name?.[0] ?? ''}`.toUpperCase()
                  : '??'

                return (
                  <tr
                    key={c.id}
                    className="border-t border-[#f1f4f9] hover:bg-[#f7f9ff]/40 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: '#3AAFB9' }}
                        >
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {client
                              ? `${client.last_name}, ${client.first_name}`
                              : 'Unknown'}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {client?.a_number ? `A# ${client.a_number}` : `#${c.id.slice(0, 8).toUpperCase()}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-600 capitalize">{c.case_type}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {forms.map((f: any) => (
                          <span
                            key={f.id}
                            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#f1f4f9] text-slate-500"
                          >
                            {f.form_type}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          CASE_STATUS_COLORS[c.status as CaseStatus] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {CASE_STATUS_LABELS[c.status as CaseStatus] ?? c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {forms.filter((f: any) => f.receipt_number).length > 0 ? (
                        <div className="space-y-1">
                          {forms
                            .filter((f: any) => f.receipt_number)
                            .slice(0, 2)
                            .map((f: any) => (
                              <p key={f.id} className="text-[11px] font-mono text-slate-600">
                                {f.receipt_number}
                              </p>
                            ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500">{timeAgo(c.created_at)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/cases/${c.id}`}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-semibold transition-all"
                        style={{ color: '#3AAFB9' }}
                      >
                        Open
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
