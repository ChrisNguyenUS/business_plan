import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { timeAgo } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*, case:cases(id, primary_client:clients!cases_primary_client_id_fkey(first_name, last_name))')
    .eq('staff_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const items = notifications ?? []
  const unreadCount = items.filter((n: any) => !n.read).length

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Notifications</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            className="text-xs font-semibold px-4 py-2 rounded-lg border border-[#bcc9ca]/40 text-slate-600 hover:bg-[#f1f4f9] transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification List */}
      {items.length === 0 ? (
        <div
          className="bg-white rounded-xl p-16 text-center"
          style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
        >
          <span className="material-symbols-outlined text-5xl text-slate-200">
            notifications_none
          </span>
          <p className="mt-4 text-slate-500 font-medium">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n: any) => (
            <div
              key={n.id}
              className={`bg-white rounded-xl p-5 transition-all ${
                !n.read ? 'border-l-4' : ''
              }`}
              style={{
                boxShadow: '0 4px 16px -2px rgba(0, 105, 112, 0.04)',
                borderLeftColor: n.read ? undefined : '#3AAFB9',
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: 'rgba(58, 175, 185, 0.1)' }}
                  >
                    <span
                      className="material-symbols-outlined text-lg"
                      style={{ color: '#3AAFB9' }}
                    >
                      notifications
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{n.message}</p>
                    {n.case?.id && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Case #{n.case.id.slice(0, 8).toUpperCase()}
                        {n.case.primary_client &&
                          ` · ${n.case.primary_client.last_name}, ${n.case.primary_client.first_name}`}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {n.case?.id && (
                    <Link
                      href={`/cases/${n.case.id}`}
                      className="text-xs font-semibold transition-colors"
                      style={{ color: '#3AAFB9' }}
                    >
                      View Case
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
