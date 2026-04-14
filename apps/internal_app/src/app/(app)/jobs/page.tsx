import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function JobsPage() {
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*, client:clients(first_name, last_name)')
    .order('created_at', { ascending: false })
    .limit(50)

  const items = jobs ?? []

  const statusColor: Record<string, string> = {
    open: 'bg-blue-50 text-blue-700',
    in_progress: 'bg-amber-50 text-amber-700',
    complete: 'bg-green-50 text-green-700',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Jobs</h2>
          <p className="text-sm text-slate-400 mt-0.5">Tax, insurance, AI services</p>
        </div>
        <Link
          href="/jobs/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #006970 0%, #3AAFB9 100%)' }}
        >
          <span className="material-symbols-outlined text-lg">add</span>
          New Job
        </Link>
      </div>

      {items.length === 0 ? (
        <div
          className="bg-white rounded-xl p-16 text-center"
          style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
        >
          <span className="material-symbols-outlined text-5xl text-slate-200">work</span>
          <p className="mt-4 text-slate-500 font-medium">No jobs yet</p>
        </div>
      ) : (
        <div
          className="bg-white rounded-xl overflow-hidden"
          style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
        >
          <table className="w-full text-left">
            <thead className="bg-[#f7f9ff]/60 border-b border-[#ebeef3]">
              <tr>
                {['Client', 'Service', 'Description', 'Fee', 'Status', 'Deadline'].map((h) => (
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
              {items.map((job: any) => (
                <tr
                  key={job.id}
                  className="border-t border-[#f1f4f9] hover:bg-[#f7f9ff]/40 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-700">
                      {job.client
                        ? `${job.client.last_name}, ${job.client.first_name}`
                        : '—'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold capitalize px-2 py-0.5 rounded bg-[#f1f4f9] text-slate-600">
                      {job.service_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600 max-w-xs truncate">{job.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-700">
                      ${job.fee.toLocaleString()}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        statusColor[job.status] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {job.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-500">
                      {job.deadline
                        ? new Date(job.deadline).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
