import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getJob } from '@/actions/jobs'
import JobProgressBar from '@/components/jobs/JobProgressBar'
import JobStatusBadge from '@/components/jobs/JobStatusBadge'
import JobStepList from '@/components/jobs/JobStepList'
import { deriveProgress } from '@/lib/jobs/progress'
import { formatCurrency, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const CARD_SHADOW = { boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const job = await getJob(id)
  // A malformed id, a missing row and an RLS-hidden row are the same thing here.
  if (!job) notFound()

  const progress = deriveProgress(job.steps)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Jobs
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
            {job.description || 'Untitled job'}
          </h2>
          <JobStatusBadge status={job.status} />
        </div>
        <p className="text-sm text-slate-400 mt-0.5">
          {job.client ? (
            <Link href={`/clients/${job.client.id}`} className="hover:underline">
              {job.client.last_name}, {job.client.first_name}
            </Link>
          ) : (
            '—'
          )}
          {' · '}
          {formatCurrency(job.fee)}
          {job.deadline && ` · due ${formatDate(job.deadline)}`}
        </p>
      </div>

      <div className="bg-white rounded-xl p-6" style={CARD_SHADOW}>
        <JobProgressBar progress={progress} stepCount={job.steps.length} />
      </div>

      {job.notes && (
        <div className="bg-white rounded-xl p-6" style={CARD_SHADOW}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Job notes (staff only)
          </p>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{job.notes}</p>
        </div>
      )}

      <div className="bg-white rounded-xl p-6" style={CARD_SHADOW}>
        <h3 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-[#ebeef3]">
          Steps
        </h3>
        {job.steps.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            This job has no steps. It was created without a template, so its status is set by hand.
          </p>
        ) : (
          <JobStepList steps={job.steps} />
        )}
      </div>
    </div>
  )
}
