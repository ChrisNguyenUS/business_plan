import Link from 'next/link'
import { getJobs } from '@/actions/jobs'
import JobProgressBar from '@/components/jobs/JobProgressBar'
import JobStatusBadge from '@/components/jobs/JobStatusBadge'
import {
  JOB_SERVICE_TYPES,
  SERVICE_LABELS,
  buildJobsHref,
  parseJobFilters,
  type JobFilters,
} from '@/lib/jobs/filters'
import { deriveProgress } from '@/lib/jobs/progress'
import { formatCurrency, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUS_CHIPS: Array<{ label: string; value: JobFilters['status'] }> = [
  { label: 'All', value: undefined },
  { label: 'Open', value: 'open' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Complete', value: 'complete' },
]

const SERVICE_CHIPS: Array<{ label: string; value: JobFilters['service'] }> = [
  { label: 'All', value: undefined },
  ...JOB_SERVICE_TYPES.map((value) => ({ label: SERVICE_LABELS[value], value })),
]

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
        active ? 'text-white' : 'bg-[#f1f4f9] text-slate-600 hover:bg-[#e4e9f0]'
      }`}
      style={active ? { background: 'linear-gradient(135deg, #006970 0%, #3AAFB9 100%)' } : undefined}
    >
      {label}
    </Link>
  )
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; service?: string | string[] }>
}) {
  const filters = parseJobFilters(await searchParams)
  const hasFilters = Boolean(filters.status || filters.service)
  const jobs = await getJobs(filters)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Jobs</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Business services, tax, insurance and AI: steps and progress per client
          </p>
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

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Status
          </span>
          {STATUS_CHIPS.map((chip) => (
            <FilterChip
              key={chip.label}
              label={chip.label}
              href={buildJobsHref({ ...filters, status: chip.value })}
              active={filters.status === chip.value}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Service
          </span>
          {SERVICE_CHIPS.map((chip) => (
            <FilterChip
              key={chip.label}
              label={chip.label}
              href={buildJobsHref({ ...filters, service: chip.value })}
              active={filters.service === chip.value}
            />
          ))}
        </div>
      </div>

      {jobs.length === 0 ? (
        <div
          className="bg-white rounded-xl p-16 text-center"
          style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
        >
          <span className="material-symbols-outlined text-5xl text-slate-200">work</span>
          {hasFilters ? (
            <>
              <p className="mt-4 text-slate-500 font-medium">No jobs match these filters.</p>
              <Link
                href="/jobs"
                className="mt-2 inline-block text-sm font-semibold text-[#006970] hover:underline"
              >
                Clear filters
              </Link>
            </>
          ) : (
            <p className="mt-4 text-slate-500 font-medium">No jobs yet</p>
          )}
        </div>
      ) : (
        <div
          className="bg-white rounded-xl overflow-hidden"
          style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
        >
          <table className="w-full text-left">
            <thead className="bg-[#f7f9ff]/60 border-b border-[#ebeef3]">
              <tr>
                {['Client', 'Job', 'Progress', 'Fee', 'Status', 'Deadline'].map((h) => (
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
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-t border-[#f1f4f9] hover:bg-[#f7f9ff]/40 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-700">
                      {job.client ? `${job.client.last_name}, ${job.client.first_name}` : '—'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-sm font-semibold text-slate-700 hover:underline"
                    >
                      {job.description || 'Untitled job'}
                    </Link>
                    <p className="mt-0.5">
                      <span className="text-[10px] font-bold capitalize px-2 py-0.5 rounded bg-[#f1f4f9] text-slate-600">
                        {SERVICE_LABELS[job.service_type]}
                      </span>
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <JobProgressBar
                      progress={deriveProgress(job.steps)}
                      stepCount={job.steps.length}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-700">
                      {formatCurrency(job.fee)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <JobStatusBadge status={job.status} />
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-500">{formatDate(job.deadline) || '—'}</p>
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
