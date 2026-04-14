import { getCase } from '@/actions/cases'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CASE_STATUS_COLORS, CASE_STATUS_LABELS, type CaseStatus } from '@/types'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const caseData = await getCase(id).catch(() => null)
  if (!caseData) notFound()

  const c = caseData as any
  const primaryClient = c.primary_client
  const secondaryClient = c.secondary_client
  const forms = c.case_forms ?? []
  const documents = c.documents ?? []
  const receivedDocs = documents.filter((d: any) => d.received).length
  const totalDocs = documents.length
  const progressPercent = totalDocs > 0 ? Math.round((receivedDocs / totalDocs) * 100) : 0

  const caseStatus = c.status as CaseStatus

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-tertiary mb-6 font-medium">
        <Link className="hover:text-primary transition-colors" href="/cases">Cases</Link>
        <span className="material-symbols-outlined text-xs" data-icon="chevron_right">chevron_right</span>
        <span className="text-on-surface-variant">MOS-{id.split('-')[0].toUpperCase()}</span>
      </nav>

      {/* Page Title & Actions */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-[#2C2C2C] tracking-tight">Case Details - {c.case_type.toUpperCase()}</h2>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <button className="flex items-center space-x-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-lg text-sm font-semibold hover:bg-surface-container-low transition-all">
              <span className={`w-2 h-2 rounded-full ${c.status === 'approved' ? 'bg-green-500' : 'bg-primary-container'}`}></span>
              <span>{CASE_STATUS_LABELS[caseStatus] ?? caseStatus.replace(/_/g, ' ').toUpperCase()}</span>
              <span className="material-symbols-outlined text-sm" data-icon="expand_more">expand_more</span>
            </button>
          </div>
          <button className="px-4 py-2 text-tertiary text-sm font-semibold hover:text-error transition-colors">
            Archive Case
          </button>
        </div>
      </div>

      {/* Case Header Card */}
      <section className="bg-surface-container-lowest rounded-xl p-8 mb-8 relative overflow-hidden shadow-sm border border-[#ebeef3]">
        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: 'linear-gradient(135deg, #006970 0%, #3AAFB9 100%)' }}></div>
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-4">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h3 className="text-2xl font-semibold text-on-surface">MOS-{id.split('-')[0].toUpperCase()}</h3>
              <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded-full uppercase tracking-wider">
                {c.case_type}
              </span>
            </div>
            <p className="text-sm text-tertiary font-medium">Created: <span className="text-on-surface">{new Date(c.created_at).toLocaleDateString()}</span></p>
            <p className="text-sm text-tertiary font-medium mt-1">Assigned to: <span className="text-on-surface">Staff</span></p>
          </div>
          <div className="col-span-12 lg:col-span-8 flex justify-start lg:justify-end space-x-12 lg:border-l border-surface-container-high lg:pl-12">
            {primaryClient && (
              <div className="flex flex-col justify-center">
                <p className="text-xs text-outline font-bold uppercase tracking-widest mb-1">{c.case_type === 'package' ? 'Petitioner' : 'Client'}</p>
                <Link className="text-primary font-bold text-lg hover:underline decoration-2" href={`/clients/${primaryClient.id}`}>
                  {primaryClient.last_name}, {primaryClient.first_name}
                </Link>
                {c.case_type === 'package' && <p className="text-xs text-tertiary mt-1">Beneficiary Spouse</p>}
              </div>
            )}
            {secondaryClient && (
              <div className="flex flex-col justify-center">
                <p className="text-xs text-outline font-bold uppercase tracking-widest mb-1">Beneficiary</p>
                <Link className="text-primary font-bold text-lg hover:underline decoration-2" href={`/clients/${secondaryClient.id}`}>
                  {secondaryClient.last_name}, {secondaryClient.first_name}
                </Link>
                <p className="text-xs text-tertiary mt-1">Foreign Spouse</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <nav className="flex space-x-8 mb-8 border-b border-surface-container overflow-x-auto">
        <a className="pb-4 text-sm font-bold text-primary border-b-2 border-primary relative whitespace-nowrap" href="#">
          Document Checklist
          {totalDocs > 0 && <span className="absolute -top-1 -right-4 w-5 h-5 bg-primary-container text-[10px] text-white rounded-full flex items-center justify-center">{totalDocs}</span>}
        </a>
        <a className="pb-4 text-sm font-medium text-tertiary hover:text-on-surface transition-colors whitespace-nowrap" href="#">Filing Assistant</a>
        <a className="pb-4 text-sm font-medium text-tertiary hover:text-on-surface transition-colors whitespace-nowrap" href="#">Receipt Numbers</a>
        <a className="pb-4 text-sm font-medium text-tertiary hover:text-on-surface transition-colors whitespace-nowrap" href="#">Status Log</a>
        <a className="pb-4 text-sm font-medium text-tertiary hover:text-on-surface transition-colors whitespace-nowrap" href="#">Notes</a>
      </nav>

      {/* Main Content Split */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* Left: Document List */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Progress Header */}
          <div className="bg-surface-container-low p-6 rounded-xl flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
            <div className="flex-grow md:mr-12 w-full">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-on-surface">Overall Completion</span>
                <span className="text-sm font-bold text-primary">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${progressPercent}%`, background: 'linear-gradient(135deg, #006970 0%, #3AAFB9 100%)' }}></div>
              </div>
              <p className="text-xs text-tertiary mt-2">{receivedDocs} of {totalDocs} documents received and verified.</p>
            </div>
            {receivedDocs > 0 && (
              <button className="px-5 py-2.5 text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center space-x-2 shrink-0 w-full md:w-auto" style={{ background: 'linear-gradient(135deg, #006970 0%, #3AAFB9 100%)' }}>
                <span className="material-symbols-outlined text-sm" data-icon="download">download</span>
                <span>Download All as ZIP</span>
              </button>
            )}
          </div>

          {/* Group: Required Documents */}
          <section>
            <div className="flex items-center justify-between mb-4 px-2">
              <h4 className="text-sm font-black text-on-surface-variant uppercase tracking-widest">Required Documents</h4>
            </div>
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-[#ebeef3]">
              {documents.length === 0 ? (
                <div className="p-8 text-center text-sm text-tertiary">No checklist items yet.</div>
              ) : (
                documents.map((doc: any, i: number) => (
                  <div key={doc.id || i} className="p-4 flex flex-wrap items-center justify-between group hover:bg-surface-container-low transition-colors border-b border-surface-container-high last:border-0">
                    <div className="flex items-center space-x-4">
                      {doc.received ? (
                        <span className="material-symbols-outlined text-primary" data-icon="check_circle">check_circle</span>
                      ) : (
                        <span className="material-symbols-outlined text-surface-variant cursor-pointer" data-icon="radio_button_unchecked">radio_button_unchecked</span>
                      )}
                      <span className={`text-sm font-semibold ${doc.received ? 'text-on-surface' : 'text-tertiary'}`}>{doc.label}</span>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 sm:mt-0 ml-10 sm:ml-0">
                      {doc.received ? (
                        <>
                          <span className="text-xs text-tertiary font-medium">Uploaded</span>
                          <button className="text-primary hover:bg-primary/10 p-1.5 rounded-md transition-all">
                            <span className="material-symbols-outlined text-lg" data-icon="visibility">visibility</span>
                          </button>
                        </>
                      ) : (
                        <>
                          {doc.required && (
                            <span className="flex items-center space-x-1 px-2 py-0.5 bg-error-container text-on-error-container text-[10px] font-bold rounded uppercase">
                              <span className="material-symbols-outlined text-[10px]" data-icon="warning">warning</span>
                              <span>Missing</span>
                            </span>
                          )}
                          <button className="text-primary text-xs font-bold border border-primary-container px-3 py-1 rounded hover:bg-primary-container hover:text-white transition-all">
                            Upload
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="flex justify-center pt-4">
            <button className="flex items-center space-x-2 text-tertiary hover:text-primary font-bold text-sm transition-all group">
              <span className="material-symbols-outlined group-hover:rotate-90 transition-transform" data-icon="add_circle">add_circle</span>
              <span>Add Custom Item</span>
            </button>
          </div>
        </div>

        {/* Right: Secondary Info */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          
          {/* Filing Assistant Section */}
          <section>
            <h4 className="text-sm font-black text-on-surface-variant uppercase tracking-widest mb-4">Filing Assistant</h4>
            <div className="grid grid-cols-1 gap-3">
              {forms.length === 0 ? (
                <div className="p-4 bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant/30 text-center text-sm text-tertiary">
                  No forms added to this case.
                </div>
              ) : (
                forms.map((form: any) => (
                  <div key={form.id} className="bg-surface-container-lowest p-4 rounded-xl flex items-center justify-between border border-transparent border-[#ebeef3] hover:border-primary-container transition-all">
                    <div>
                      <h5 className="text-sm font-bold text-on-surface">Form {form.form_type?.toUpperCase()}</h5>
                      <p className="text-[10px] text-tertiary">{form.filing_mode} filing</p>
                    </div>
                    {form.filing_mode === 'online' ? (
                      <Link href={`/cases/${id}/filing/${form.id}`} className="text-primary text-xs font-bold flex items-center hover:opacity-80">
                        Open Filing
                        <span className="material-symbols-outlined text-xs ml-1" data-icon="arrow_outward">arrow_outward</span>
                      </Link>
                    ) : (
                      <Link href={`/cases/${id}/pdf/${form.id}`} className="text-primary text-xs font-bold flex items-center hover:opacity-80">
                        Generate PDF
                        <span className="material-symbols-outlined text-xs ml-1" data-icon="picture_as_pdf">picture_as_pdf</span>
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Receipt Numbers */}
          <section>
            <h4 className="text-sm font-black text-on-surface-variant uppercase tracking-widest mb-4">Receipt Numbers</h4>
            <div className="space-y-3">
              {forms.filter((f: any) => f.receipt_number).map((form: any) => (
                <div key={form.id} className="bg-surface-container p-4 rounded-xl border border-outline-variant/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-on-surface">{form.receipt_number}</span>
                    <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-white/50 rounded uppercase">{form.form_type}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="material-symbols-outlined text-primary text-sm" data-icon="sync">sync</span>
                    <span className="text-xs font-medium text-tertiary">Status: {form.current_uscis_status || 'Checking...'}</span>
                  </div>
                </div>
              ))}
              <button className="w-full py-3 bg-surface-container-low text-tertiary text-xs font-bold rounded-xl border-2 border-dashed border-outline-variant/20 hover:border-primary-container hover:text-primary transition-all">
                + Add Receipt Number
              </button>
            </div>
          </section>

          {/* Case Stats Visualization */}
          <section className="text-white p-6 rounded-2xl relative overflow-hidden" style={{ backgroundColor: '#006970' }}>
            <div className="relative z-10">
              <p className="text-[10px] uppercase font-black tracking-widest opacity-80 mb-4">Case Timeline</p>
              <div className="flex items-end justify-between space-x-1 h-12 mb-4">
                <div className="w-full bg-white/20 h-4 rounded-t-sm"></div>
                <div className="w-full bg-white/40 h-8 rounded-t-sm"></div>
                <div className="w-full bg-white/60 h-6 rounded-t-sm"></div>
                <div className="w-full bg-white/80 h-10 rounded-t-sm"></div>
                <div className="w-full bg-white h-12 rounded-t-sm"></div>
              </div>
              <p className="text-sm font-bold">{Math.floor((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24))} Days Since Filing</p>
              <p className="text-xs opacity-80">Est. completion: {new Date(new Date().setMonth(new Date().getMonth() + 6)).toLocaleDateString()}</p>
            </div>
            {/* Decorative pattern */}
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined text-9xl" data-icon="analytics" style={{ fontSize: '160px', transform: 'translate(40px, 40px)' }}>analytics</span>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
