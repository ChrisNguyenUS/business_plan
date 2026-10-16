import { formatProgressLabel, type Progress } from '@/lib/jobs/progress'

export default function JobProgressBar({
  progress,
  stepCount,
}: {
  progress: Progress
  stepCount: number
}) {
  return (
    <div className="flex items-center gap-3 min-w-[150px]">
      <div
        className="h-2 flex-1 rounded-full bg-[#ebeef3] overflow-hidden"
        role="progressbar"
        aria-label="Job progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${progress.percent}%`, backgroundColor: '#3AAFB9' }}
        />
      </div>
      <span className="min-w-16 whitespace-nowrap text-right text-xs font-semibold text-slate-500 tabular-nums">
        {formatProgressLabel(progress, stepCount)}
      </span>
    </div>
  )
}
