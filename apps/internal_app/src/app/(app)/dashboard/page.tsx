import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()

  const [
    { count: clientCount },
    { count: activeCases },
    { data: recentCases },
    { data: rfeCases },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('cases').select('*', { count: 'exact', head: true })
      .not('status', 'in', '(approved,denied)'),
    supabase.from('cases')
      .select(`
        id, status, created_at,
        primary_client:clients!cases_primary_client_id_fkey(first_name, last_name),
        case_forms(form_type)
      `)
      .not('status', 'in', '(approved,denied)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('cases')
      .select(`
        id,
        primary_client:clients!cases_primary_client_id_fkey(first_name, last_name)
      `)
      .eq('status', 'rfe_issued'),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Clients" value={clientCount ?? 0} />
        <StatCard label="Active Cases" value={activeCases ?? 0} />
        <StatCard label="RFE Issued" value={rfeCases?.length ?? 0} urgent />
      </div>

      {/* RFE alerts */}
      {rfeCases && rfeCases.length > 0 && (
        <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4">
          <h2 className="font-semibold text-orange-300 mb-2">⚠ RFE Issued — Action Required</h2>
          <div className="space-y-1">
            {rfeCases.map((c: any) => (
              <Link key={c.id} href={`/cases/${c.id}`}
                className="block text-sm text-orange-200 hover:text-white">
                → {(c.primary_client as any)?.last_name}, {(c.primary_client as any)?.first_name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent cases */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Recent Active Cases</h2>
          <Link href="/cases" className="text-sm text-blue-400 hover:text-blue-300">View all →</Link>
        </div>
        <div className="space-y-2">
          {(recentCases ?? []).map((c: any) => (
            <Link key={c.id} href={`/cases/${c.id}`}
              className="flex items-center justify-between p-3 bg-gray-900 rounded-lg hover:bg-gray-800 border border-gray-800">
              <div>
                <p className="text-sm font-medium">
                  {(c.primary_client as any)?.last_name}, {(c.primary_client as any)?.first_name}
                </p>
                <p className="text-xs text-gray-400">
                  {(c.case_forms as any[]).map((f: any) => f.form_type.toUpperCase()).join(' + ')}
                </p>
              </div>
              <span className="text-xs text-gray-400">
                {c.status.replace(/_/g, ' ')}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-semibold mb-3">Quick Actions</h2>
        <div className="flex gap-3">
          <Link href="/clients/new"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm">
            + New Client
          </Link>
          <Link href="/cases/new"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm">
            + New Case
          </Link>
          <Link href="/tracker"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm">
            View Tracker
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, urgent }: { label: string; value: number; urgent?: boolean }) {
  return (
    <div className={`p-4 rounded-lg border ${urgent && value > 0 ? 'bg-orange-900/20 border-orange-700' : 'bg-gray-900 border-gray-800'}`}>
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${urgent && value > 0 ? 'text-orange-300' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}
