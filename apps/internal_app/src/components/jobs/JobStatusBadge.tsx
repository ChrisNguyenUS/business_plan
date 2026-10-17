import type { JobStatus } from '@/lib/jobs/progress'

const STYLES: Record<JobStatus, string> = {
  open: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  complete: 'bg-green-50 text-green-700',
}

export default function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${STYLES[status]}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}
