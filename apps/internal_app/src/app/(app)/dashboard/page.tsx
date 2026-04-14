import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CASE_STATUS_COLORS, CASE_STATUS_LABELS, type CaseStatus } from '@/types'
import { timeAgo } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user?.id)
    .single()

  const isAdmin = profile?.role === 'ultimate_admin'

  // Fetch summary data
  const [casesResult, clientsResult, notificationsResult] = await Promise.all([
    supabase
      .from('cases')
      .select(`
        id, status, case_type, created_at, notes,
        primary_client:clients!cases_primary_client_id_fkey(first_name, last_name),
        case_forms(form_type)
      `)
      .not('status', 'in', '(approved,denied)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase
      .from('notifications')
      .select('*')
      .eq('read', false)
      .limit(5),
  ])

  const recentCases = casesResult.data ?? []
  const totalClients = clientsResult.count ?? 0
  const notifications = notificationsResult.data ?? []

  // Status counts
  const { data: allActiveCases } = await supabase
    .from('cases')
    .select('status')
    .not('status', 'in', '(approved,denied)')

  const activeCount = allActiveCases?.length ?? 0
  const pendingDocsCount = allActiveCases?.filter(c => c.status === 'documents_pending').length ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Dashboard</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/clients/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg, #006970 0%, #3AAFB9 100%)' }}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            New Client
          </Link>
          <Link
            href="/cases/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors"
            style={{ borderColor: '#3AAFB9', color: '#006970' }}
          >
            <span className="material-symbols-outlined text-lg">create_new_folder</span>
            New Case
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Active Cases"
          value={activeCount}
          icon="folder_open"
          color="#3AAFB9"
          bgColor="rgba(58, 175, 185, 0.08)"
          trend="+2 since last week"
          trendPositive={true}
        />
        <StatCard
          label="Pending Docs"
          value={pendingDocsCount}
          icon="pending_actions"
          color="#d97706"
          bgColor="rgba(217, 119, 6, 0.08)"
          trend="Action required"
          trendPositive={false}
        />
        <StatCard
          label="USCIS Alerts"
          value={notifications.length}
          icon="warning"
          color="#ba1a1a"
          bgColor="rgba(186, 26, 26, 0.08)"
          trend={notifications.length > 0 ? 'High priority' : 'All clear'}
          trendPositive={notifications.length === 0}
        />
        <StatCard
          label="Total Clients"
          value={totalClients}
          icon="group"
          color="#16a34a"
          bgColor="rgba(22, 163, 74, 0.08)"
          trend="In database"
          trendPositive={true}
        />
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Recent Cases Table */}
        <div className="col-span-12 lg:col-span-7">
          <div
            className="bg-white rounded-xl overflow-hidden"
            style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
          >
            <div className="p-6 flex justify-between items-center bg-[#f7f9ff]/40">
              <h3 className="text-lg font-semibold text-slate-800">Recent Cases</h3>
              <Link
                href="/cases"
                className="text-xs font-bold uppercase tracking-widest hover:underline"
                style={{ color: '#3AAFB9' }}
              >
                View All
              </Link>
            </div>

            {recentCases.length === 0 ? (
              <div className="p-12 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300">
                  folder_open
                </span>
                <p className="mt-2 text-slate-400 text-sm">No active cases yet.</p>
                <Link
                  href="/cases/new"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: '#3AAFB9' }}
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Create first case
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#f1f4f9]/50">
                    <tr>
                      {['Client Name', 'Case Type', 'Status', 'Created'].map((h) => (
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
                    {recentCases.map((c: any) => {
                      const client = c.primary_client
                      const firstForm = c.case_forms?.[0]
                      const initials = client
                        ? `${client.first_name?.[0] ?? ''}${client.last_name?.[0] ?? ''}`.toUpperCase()
                        : '?'

                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-[#f1f4f9]/40 transition-colors border-t border-slate-50"
                        >
                          <td className="px-6 py-4">
                            <Link
                              href={`/cases/${c.id}`}
                              className="flex items-center gap-3 group"
                            >
                              <div className="w-8 h-8 rounded-full bg-[#ebeef3] flex items-center justify-center font-bold text-slate-500 text-xs shrink-0">
                                {initials}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800 group-hover:text-[#006970] transition-colors">
                                  {client
                                    ? `${client.last_name}, ${client.first_name}`
                                    : 'Unknown'}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  #{c.id.slice(0, 8).toUpperCase()}
                                </p>
                              </div>
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-slate-600 capitalize">
                              {c.case_type}
                            </p>
                            {firstForm && (
                              <p className="text-[11px] text-slate-400 uppercase">
                                {firstForm.form_type}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                CASE_STATUS_COLORS[c.status as CaseStatus] ??
                                'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {CASE_STATUS_LABELS[c.status as CaseStatus] ?? c.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-slate-500">
                              {timeAgo(c.created_at)}
                            </p>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Quick Actions */}
          <div
            className="bg-white rounded-xl p-6"
            style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { href: '/clients/new', icon: 'person_add', label: 'Add New Client' },
                { href: '/cases/new', icon: 'create_new_folder', label: 'Open New Case' },
                { href: '/jobs/new', icon: 'work_history', label: 'Create Job (Tax / Insurance / AI)' },
                { href: '/notifications', icon: 'notifications_active', label: 'View Notifications' },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f1f4f9] transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'rgba(58, 175, 185, 0.1)' }}
                  >
                    <span
                      className="material-symbols-outlined text-lg"
                      style={{ color: '#3AAFB9' }}
                    >
                      {action.icon}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-700">{action.label}</span>
                  <span className="material-symbols-outlined text-sm text-slate-300 ml-auto">
                    chevron_right
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* USCIS Notifications preview */}
          {notifications.length > 0 && (
            <div
              className="bg-white rounded-xl p-6"
              style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800">USCIS Alerts</h3>
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {notifications.length} NEW
                </span>
              </div>
              <div className="space-y-3">
                {notifications.slice(0, 3).map((n: any) => (
                  <div key={n.id} className="flex gap-3 p-2 rounded-lg hover:bg-[#f1f4f9] cursor-pointer">
                    <div
                      className="w-1 rounded-full shrink-0 self-stretch"
                      style={{ backgroundColor: '#ba1a1a' }}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{n.message}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/notifications"
                className="mt-4 w-full py-2 block text-center text-sm font-semibold border rounded-lg transition-colors"
                style={{ borderColor: '#3AAFB9', color: '#006970' }}
              >
                View All Alerts
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  color,
  bgColor,
  trend,
  trendPositive,
}: {
  label: string
  value: number
  icon: string
  color: string
  bgColor: string
  trend: string
  trendPositive: boolean
}) {
  return (
    <div
      className="bg-white p-6 rounded-xl flex justify-between items-start transition-all hover:translate-y-[-2px]"
      style={{
        boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)',
        transition: 'all 0.2s ease',
      }}
    >
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
          {label}
        </p>
        <h3 className="text-4xl font-bold" style={{ color }}>
          {value}
        </h3>
        <p
          className={`text-[11px] mt-2 flex items-center gap-1 ${
            trendPositive ? 'text-green-600' : 'text-amber-600'
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {trendPositive ? 'trending_up' : 'schedule'}
          </span>
          {trend}
        </p>
      </div>
      <div className="p-2.5 rounded-lg" style={{ backgroundColor: bgColor }}>
        <span className="material-symbols-outlined" style={{ color }}>
          {icon}
        </span>
      </div>
    </div>
  )
}
