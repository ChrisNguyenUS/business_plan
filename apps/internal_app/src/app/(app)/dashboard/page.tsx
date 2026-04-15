import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getCrossSellOpportunities } from '@/actions/crossSell'
import CrossSellCard from '@/components/dashboard/CrossSellCard'
import RecentCasesTable from '@/components/dashboard/RecentCasesTable'

export default async function DashboardPage() {
  const supabase = await createClient()

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { count: clientCount },
    { count: activeCases },
    { data: recentCases },
    { data: rfeCases },
    { count: completedMTD },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('cases').select('*', { count: 'exact', head: true })
      .not('status', 'in', '(approved,denied)'),
    supabase.from('cases')
      .select(`
        id, status, created_at,
        primary_client:clients!cases_primary_client_id_fkey(first_name, last_name, id),
        case_forms(form_type)
      `)
      .not('status', 'in', '(approved,denied)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('cases')
      .select(`
        id, created_at, status,
        primary_client:clients!cases_primary_client_id_fkey(first_name, last_name, id)
      `)
      .in('status', ['rfe_issued', 'denied', 'interview_scheduled'])
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('cases').select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('created_at', monthStart),
  ])

  const crossSellOpportunities = await getCrossSellOpportunities()

  return (
    <div className="space-y-8">
      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Cases */}
        <Link href="/cases" className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] group hover:shadow-[0_12px_32px_-4px_rgba(0,105,112,0.08)] transition-all flex justify-between items-start no-underline">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Active Cases</p>
            <h3 className="text-4xl font-bold text-primary-container">{activeCases ?? 0}</h3>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-green-500">trending_up</span> Tracked
            </p>
          </div>
          <div className="bg-primary/5 p-2 rounded-lg">
            <span className="material-symbols-outlined text-primary-container" data-icon="folder_open">folder_open</span>
          </div>
        </Link>

        {/* Total Clients */}
        <Link href="/clients" className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] group hover:shadow-[0_12px_32px_-4px_rgba(0,105,112,0.08)] transition-all flex justify-between items-start no-underline">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Clients</p>
            <h3 className="text-4xl font-bold text-amber-600">{clientCount ?? 0}</h3>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-amber-500">group</span> Database size
            </p>
          </div>
          <div className="bg-amber-50 p-2 rounded-lg">
            <span className="material-symbols-outlined text-amber-600" data-icon="group">group</span>
          </div>
        </Link>

        {/* USCIS Alerts */}
        <Link href="/tracker" className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] group hover:shadow-[0_12px_32px_-4px_rgba(0,105,112,0.08)] transition-all flex justify-between items-start no-underline">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">USCIS Alerts</p>
            <h3 className="text-4xl font-bold text-error">{rfeCases?.length ?? 0}</h3>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-error">priority_high</span> Action required
            </p>
          </div>
          <div className="bg-error-container/30 p-2 rounded-lg">
            <span className="material-symbols-outlined text-error" data-icon="warning">warning</span>
          </div>
        </Link>

        {/* Completed MTD */}
        <Link href="/cases?status=approved" className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] group hover:shadow-[0_12px_32px_-4px_rgba(0,105,112,0.08)] transition-all flex justify-between items-start no-underline">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Completed MTD</p>
            <h3 className="text-4xl font-bold text-green-600">{completedMTD ?? 0}</h3>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-green-500">task_alt</span> On track for goal
            </p>
          </div>
          <div className="bg-green-50 p-2 rounded-lg">
            <span className="material-symbols-outlined text-green-600" data-icon="verified">verified</span>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Recent Cases Column */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="bg-surface-container-lowest rounded-xl p-0 shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] overflow-hidden">
            <div className="p-6 flex justify-between items-center bg-surface-container-low/30">
              <h3 className="text-lg font-semibold text-slate-800">Recent Cases</h3>
              <Link href="/cases" className="text-xs text-primary-container font-bold uppercase tracking-widest hover:underline transition-all">View All</Link>
            </div>
            <div className="overflow-x-auto">
              <RecentCasesTable cases={recentCases as any[] ?? []} />
            </div>
          </div>
          
          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-4 py-2">
            <Link href="/clients/new" className="px-6 py-2.5 rounded-lg bg-gradient-to-br from-primary to-primary-container text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-lg">add</span> New Client
            </Link>
            <Link href="/cases/new" className="px-6 py-2.5 rounded-lg border-2 border-primary-container text-primary text-sm font-semibold hover:bg-primary/5 transition-colors">
              <span className="material-symbols-outlined text-lg align-middle">create_new_folder</span> New Case
            </Link>
            <Link href="/tracker" className="px-6 py-2.5 rounded-lg text-slate-500 text-sm font-semibold hover:bg-slate-100 transition-colors">
              View Tracker
            </Link>
          </div>
        </div>

        {/* Alerts & Opportunities Column */}
        <div className="col-span-12 lg:col-span-5 space-y-8">
          
          {/* USCIS Alerts Card */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-800">USCIS Status Alerts</h3>
              {(rfeCases?.length ?? 0) > 0 && <span className="bg-error text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{rfeCases?.length} NEW</span>}
            </div>
            
            <div className="space-y-4">
              {(!rfeCases || rfeCases.length === 0) ? (
                <div className="p-4 text-center text-sm text-slate-500 bg-surface-container-low rounded-lg">
                  No urgent alerts at this time.
                </div>
              ) : (
                rfeCases.map((c: any) => (
                  <Link key={c.id} href={`/cases/${c.id}`} className="flex gap-4 group cursor-pointer hover:bg-surface-container-low p-2 -m-2 rounded-lg transition-all relative no-underline">
                    <div className={`status-pillar absolute left-0 top-2 bottom-2 ${c.status === 'rfe_issued' ? 'bg-error' : 'bg-amber-500'}`}></div>
                    <div className="flex-grow pl-3">
                      <p className="text-xs font-bold text-slate-400">ID: {c.id.split('-')[0]}</p>
                      <p className="text-sm font-medium text-slate-800">
                        {c.status === 'rfe_issued' ? 'Request for Additional Evidence (RFE) Issued' : 'Status Update Received'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                        {new Date(c.created_at).toLocaleDateString()} • {(c.primary_client as any)?.first_name} {(c.primary_client as any)?.last_name}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Cross-Sell Opportunities Card */}
          <CrossSellCard opportunities={crossSellOpportunities} />
          
        </div>
      </div>
    </div>
  )
}
