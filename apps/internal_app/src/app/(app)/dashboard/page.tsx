import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

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
  ])

  return (
    <div className="space-y-8">
      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Cases */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] group hover:shadow-[0_12px_32px_-4px_rgba(0,105,112,0.08)] transition-all flex justify-between items-start">
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
        </div>

        {/* Total Clients */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] group hover:shadow-[0_12px_32px_-4px_rgba(0,105,112,0.08)] transition-all flex justify-between items-start">
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
        </div>

        {/* USCIS Alerts */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] group hover:shadow-[0_12px_32px_-4px_rgba(0,105,112,0.08)] transition-all flex justify-between items-start">
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
        </div>

        {/* Completed MTD */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] group hover:shadow-[0_12px_32px_-4px_rgba(0,105,112,0.08)] transition-all flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Completed MTD</p>
            <h3 className="text-4xl font-bold text-green-600">24</h3>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-green-500">task_alt</span> On track for goal
            </p>
          </div>
          <div className="bg-green-50 p-2 rounded-lg">
            <span className="material-symbols-outlined text-green-600" data-icon="verified">verified</span>
          </div>
        </div>
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
              <table className="w-full text-left">
                <thead className="bg-surface-container-low/50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Client Name</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Forms</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y-0">
                  {(recentCases ?? []).map((c: any) => {
                    const initials = `${(c.primary_client as any)?.first_name?.[0] || ''}${(c.primary_client as any)?.last_name?.[0] || ''}`.toUpperCase()
                    const formsDesc = (c.case_forms as any[]).map((f: any) => f.form_type.toUpperCase()).join(', ') || 'N/A'
                    const isUrgent = c.status === 'rfe_issued'
                    
                    return (
                      <tr key={c.id} className="hover:bg-surface-container-high transition-colors group cursor-pointer relative" onClick={() => undefined}>
                        {/* We use a hack for tr block links in modern HTML but here we'll just style it */}
                        <td className="px-6 py-5">
                          <Link href={`/cases/${c.id}`} className="absolute inset-0 z-10"></Link>
                          <div className="flex items-center gap-3 relative z-0">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs">{initials}</div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{(c.primary_client as any)?.first_name} {(c.primary_client as any)?.last_name}</p>
                              <p className="text-[11px] text-slate-400 truncate w-32">#{c.id.split('-')[0]}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 relative z-0">
                          <p className="text-[11px] text-slate-600 font-medium">{formsDesc}</p>
                        </td>
                        <td className="px-6 py-5 relative z-0">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isUrgent 
                              ? 'bg-amber-100 text-amber-700' 
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {c.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-5 relative z-0">
                          <p className="text-xs text-slate-500">{new Date(c.created_at).toLocaleDateString()}</p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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
                  <Link key={c.id} href={`/cases/${c.id}`} className="block flex gap-4 group cursor-pointer hover:bg-surface-container-low p-2 -m-2 rounded-lg transition-all relative">
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
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] bg-gradient-to-br from-white to-primary/5">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary-container" data-icon="auto_awesome">auto_awesome</span>
              <h3 className="text-lg font-semibold text-slate-800">Cross-Sell Opportunities</h3>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-white/60 rounded-xl border border-white/80 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Elena Larsson</p>
                    <p className="text-xs text-slate-500">I-130 Approved</p>
                  </div>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">AI ANALYSIS</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">SUGGESTION:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="text-[10px] px-2 py-1 bg-surface-container-high text-on-surface rounded-full">Tax Services</span>
                    <span className="text-[10px] px-2 py-1 bg-surface-container-high text-on-surface rounded-full">Insurance</span>
                  </div>
                </div>
                <button className="mt-4 w-full py-2 bg-primary-container text-white text-[11px] font-bold uppercase tracking-wider rounded-lg hover:brightness-105 transition-all">Send Offer</button>
              </div>
              
              <div className="p-4 bg-white/60 rounded-xl border border-white/80 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Rodrigo Silva</p>
                    <p className="text-xs text-slate-500">Corporate Sponsor Match</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">SUGGESTION:</span>
                  <span className="text-[10px] px-2 py-1 bg-surface-container-high text-on-surface rounded-full">Compliance Audit</span>
                </div>
                <button className="mt-4 w-full py-2 bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-slate-200 transition-all">Review Profile</button>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}
