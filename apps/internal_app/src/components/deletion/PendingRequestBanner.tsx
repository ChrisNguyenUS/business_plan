import { actionLabel, type EntityType } from '@/lib/deletion/requests'

export default function PendingRequestBanner({
  entityType,
  requesterName,
  createdAt,
}: {
  entityType: EntityType
  requesterName: string
  createdAt: string
}) {
  const date = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return (
    <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-50 text-sm text-amber-800">
      <span className="material-symbols-outlined text-[18px]">pending_actions</span>
      <span>
        {actionLabel(entityType)} requested by {requesterName} on {date} — waiting for an admin.
      </span>
    </div>
  )
}
