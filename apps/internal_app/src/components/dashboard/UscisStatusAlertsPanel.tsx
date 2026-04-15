import Link from 'next/link'

/** Represents one USCIS status change scraped daily by the backend bot */
export interface DailyUscisAlert {
  receiptNumber: string
  clientName: string
  previousStatus: string
  currentStatus: string
  /** ISO date string from scraper */
  updatedAt: string
}

interface RfeCase {
  id: string
  status: string
  created_at: string
  primary_client: { first_name: string; last_name: string; id: string } | null
}

interface Props {
  rfeCases: RfeCase[]
  /** Daily status changes from backend USCIS scraper bot — populate from /api/uscis/daily-alerts */
  dailyAlerts: DailyUscisAlert[]
}

export default function UscisStatusAlertsPanel({ rfeCases, dailyAlerts }: Props) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-slate-800">USCIS Status Alerts</h3>
        {rfeCases.length > 0 && (
          <span className="bg-error text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
            {rfeCases.length} NEW
          </span>
        )}
      </div>

      {/* Daily bot status changes — populated by backend USCIS scraper */}
      {dailyAlerts.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Today&apos;s Status Changes
          </p>
          <div className="space-y-3">
            {dailyAlerts.map((alert) => (
              <div
                key={alert.receiptNumber}
                className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/30"
              >
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold text-slate-700">{alert.clientName}</p>
                  <p className="text-[10px] text-slate-400">{alert.receiptNumber}</p>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <span className="text-slate-400">{alert.previousStatus}</span>
                  <span className="material-symbols-outlined text-xs text-slate-400">arrow_forward</span>
                  <span className="font-semibold text-primary-container">{alert.currentStatus}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(alert.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Urgent cases from DB (RFE, denied, interview scheduled) */}
      <div className="space-y-4">
        {rfeCases.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500 bg-surface-container-low rounded-lg">
            No urgent alerts at this time.
          </div>
        ) : (
          rfeCases.map((c) => (
            <Link
              key={c.id}
              href={`/cases/${c.id}`}
              className="flex gap-4 group cursor-pointer hover:bg-surface-container-low p-2 -m-2 rounded-lg transition-all relative"
            >
              <div
                className={`status-pillar absolute left-0 top-2 bottom-2 ${
                  c.status === 'rfe_issued' ? 'bg-error' : 'bg-amber-500'
                }`}
              />
              <div className="flex-grow pl-3">
                <p className="text-xs font-bold text-slate-400">ID: {c.id.split('-')[0]}</p>
                <p className="text-sm font-medium text-slate-800">
                  {c.status === 'rfe_issued'
                    ? 'Request for Additional Evidence (RFE) Issued'
                    : 'Status Update Received'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                  {new Date(c.created_at).toLocaleDateString()} •{' '}
                  {c.primary_client?.first_name} {c.primary_client?.last_name}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
