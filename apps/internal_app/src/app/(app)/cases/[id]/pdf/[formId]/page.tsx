import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PDFGeneratorPage({
  params,
}: {
  params: Promise<{ id: string; formId: string }>
}) {
  const { id: caseId, formId } = await params
  const supabase = await createClient()

  const { data: caseForm } = await supabase
    .from('case_forms')
    .select('*, case:cases(primary_client_id)')
    .eq('id', formId)
    .single()

  if (!caseForm) notFound()

  const formType = caseForm.form_type?.toUpperCase() || 'Form'

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-surface">
      {/* Top Header */}
      <header className="flex justify-between items-center w-full px-8 h-16 sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-outline-variant/10">
        <div className="flex items-center space-y-0 gap-4">
          <Link
            href={`/cases/${caseId}`}
            className="flex items-center text-[#3AAFB9] font-semibold tracking-tight hover:text-[#2D8E96] transition-colors active:scale-[0.98] duration-150"
          >
            <span className="material-symbols-outlined mr-1 text-sm">arrow_back</span>
            Back to Case MOS-{caseId.split('-')[0].toUpperCase()}
          </Link>
        </div>
        <h1 className="text-lg font-bold text-[#2C2C2C] tracking-tight ml-4 mr-auto">
          PDF Generator — {formType}
        </h1>
        <div className="flex items-center gap-3">
          <button className="flex items-center px-4 py-2 text-sm font-semibold text-[#212529] hover:text-[#2D8E96] transition-colors">
            <span className="material-symbols-outlined mr-2">share</span>
            Share
          </button>
          <a
            href={`/api/pdf/${formId}?caseId=${caseId}`}
            download
            className="flex items-center px-6 py-2 rounded-lg text-white font-semibold shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg, #006970 0%, #3AAFB9 100%)' }}
          >
            <span className="material-symbols-outlined mr-2 text-sm">download</span>
            Download PDF
          </a>
        </div>
      </header>

      {/* Content Canvas */}
      <div className="flex-grow p-8 grid grid-cols-12 gap-8 h-[calc(100vh-4rem)]">
        {/* Left Column: PDF Preview */}
        <div className="col-span-12 lg:col-span-8 flex flex-col items-center overflow-y-auto">
          <div className="w-full max-w-3xl flex-1 bg-surface-container-lowest shadow-sm rounded-sm p-0 border border-outline-variant/10 relative overflow-hidden">
            <iframe
              src={`/api/pdf/${formId}?caseId=${caseId}`}
              className="w-full h-full border-0 absolute inset-0"
              title={`${formType} PDF Preview`}
            />
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="col-span-12 lg:col-span-4 h-full flex flex-col">
          <div className="bg-white rounded-xl shadow-sm border border-[#ebeef3] p-6 flex flex-col h-full sticky top-8">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">Mapping Configuration</h2>
            
            <div className="space-y-4 flex-1 overflow-y-auto">
              <div className="flex items-start gap-3 p-3 rounded-lg border border-green-100 bg-[#F0FDF4]">
                <span className="material-symbols-outlined text-green-600">check_circle</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Petitioner Data</p>
                  <p className="text-xs text-slate-500 mt-1">Successfully mapped 42 fields.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-green-100 bg-[#F0FDF4]">
                <span className="material-symbols-outlined text-green-600">check_circle</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Beneficiary Data</p>
                  <p className="text-xs text-slate-500 mt-1">Successfully mapped 38 fields.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-[#FEF3C7]">
                <span className="material-symbols-outlined text-amber-600">warning</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Missing Required Fields</p>
                  <p className="text-xs text-slate-500 mt-1">3 fields are empty and couldn't be mapped. Click to review in client profile.</p>
                  <Link href={`/clients/${caseForm.case.primary_client_id}`} className="text-xs font-bold text-amber-700 mt-2 hover:underline inline-block">Review Profile</Link>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#ebeef3] mt-auto">
              <p className="text-xs text-slate-400 mb-4">Note: The preview utilizes a flattened PDF form. Editable fields are locked.</p>
              <button disabled className="w-full py-3 bg-surface-container text-tertiary font-bold rounded-lg opacity-50 cursor-not-allowed">
                Refresh Mapping Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
