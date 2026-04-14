import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function GlobalPDFGeneratorPage() {
  const supabase = await createClient()

  // Fetch recent cases with their forms
  const { data: recentCases } = await supabase
    .from('cases')
    .select('*, primary_client:clients!cases_primary_client_id_fkey(first_name, last_name, a_number), case_forms(*)')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Global PDF Generator</h1>
          <p className="text-sm text-slate-500 mt-1">Select a recent case and form to generate a native USCIS ACROForm.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] overflow-hidden border border-[#ebeef3]">
        <div className="px-6 py-4 border-b border-[#ebeef3] bg-surface-container-lowest">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-widest">Recent Case Forms</h2>
        </div>
        
        <div className="divide-y divide-[#ebeef3]">
          {(recentCases || []).map(c => {
            const clientName = `${(c.primary_client as any)?.first_name} ${(c.primary_client as any)?.last_name}`
            const forms = c.case_forms as any[]
            
            if (!forms || forms.length === 0) return null
            
            return forms.map(form => (
              <div key={form.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#f7f9ff] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-[#e7f6f7] text-[#006970] flex items-center justify-center shrink-0 shadow-sm border border-[#3AAFB9]/20">
                    <span className="material-symbols-outlined text-lg">description</span>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-slate-800">
                      Form {form.form_type.toUpperCase()}
                      <span className="mx-2 text-slate-300">|</span>
                      <span className="font-medium text-slate-600">{clientName}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Case ID: {c.id.split('-')[0]} • Added {new Date(form.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <Link 
                  href={`/cases/${c.id}/pdf/${form.id}`}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wider text-white hover:brightness-105 transition-all shadow-md focus:ring-2 focus:ring-[#3AAFB9]/40"
                  style={{ background: 'linear-gradient(135deg, #006970 0%, #3AAFB9 100%)' }}
                >
                  Generate PDF
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            ))
          })}
          
          {(!recentCases || recentCases.length === 0) && (
            <div className="px-6 py-12 text-center">
              <span className="material-symbols-outlined text-slate-300 text-4xl mb-3">inbox</span>
              <p className="text-slate-500 font-medium">No forms available for generation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
