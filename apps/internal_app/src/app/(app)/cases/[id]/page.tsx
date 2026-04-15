import { getCase } from '@/actions/cases'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CASE_STATUS_LABELS, type CaseStatus } from '@/types'
import StatusDropdown from '@/components/cases/StatusDropdown'
import DocumentChecklist from '@/components/cases/DocumentChecklist'
import ReceiptNumberForm from '@/components/cases/ReceiptNumberForm'

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

  const caseStatus = c.status as CaseStatus

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-tertiary mb-6 font-medium">
        <Link className="hover:text-primary transition-colors" href="/cases">Cases</Link>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="text-on-surface-variant">MOS-{id.split('-')[0].toUpperCase()}</span>
      </nav>

      {/* Page Title & Actions */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-[#2C2C2C] tracking-tight">
            Case Details - {c.package_type ? c.package_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : c.case_type.toUpperCase()}
          </h2>
        </div>
        <div className="flex items-center space-x-3">
          <StatusDropdown caseId={id} currentStatus={caseStatus} />
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
                {c.package_type ? `Package — ${c.package_type.replace(/_/g, ' ')}` : c.case_type}
              </span>
            </div>
            <p className="text-sm text-tertiary font-medium">Created: <span className="text-on-surface">{new Date(c.created_at).toLocaleDateString()}</span></p>
            <p className="text-sm text-tertiary font-medium mt-1">Status: <span className="text-on-surface">{CASE_STATUS_LABELS[caseStatus] ?? caseStatus}</span></p>
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

      {/* Main Content Split */}
      <div className="grid grid-cols-12 gap-8">

        {/* Left: Document Checklist */}
        <div className="col-span-12 lg:col-span-8">
          <DocumentChecklist
            documents={documents.map((d: any) => ({
              id: d.id,
              label: d.label,
              required: d.required,
              received: d.received,
              case_form_id: d.case_form_id,
            }))}
            forms={forms.map((f: any) => ({ id: f.id, form_type: f.form_type }))}
            caseId={id}
            totalDocs={totalDocs}
            receivedDocs={receivedDocs}
          />
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
                  <div key={form.id} className="bg-surface-container-lowest p-4 rounded-xl flex items-center justify-between border border-[#ebeef3] hover:border-primary-container transition-all">
                    <div>
                      <h5 className="text-sm font-bold text-on-surface">Form {form.form_type?.toUpperCase()}</h5>
                      <p className="text-[10px] text-tertiary">{form.filing_mode} filing</p>
                    </div>
                    {form.filing_mode === 'online' ? (
                      <Link href={`/cases/${id}/filing/${form.id}`} className="text-primary text-xs font-bold flex items-center hover:opacity-80">
                        Open Filing
                        <span className="material-symbols-outlined text-xs ml-1">arrow_outward</span>
                      </Link>
                    ) : (
                      <Link href={`/cases/${id}/pdf/${form.id}`} className="text-primary text-xs font-bold flex items-center hover:opacity-80">
                        Generate PDF
                        <span className="material-symbols-outlined text-xs ml-1">picture_as_pdf</span>
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Receipt Numbers */}
          <ReceiptNumberForm
            forms={forms.map((f: any) => ({
              id: f.id,
              form_type: f.form_type,
              receipt_number: f.receipt_number,
              current_uscis_status: f.current_uscis_status,
            }))}
          />

          {/* Case Timeline */}
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
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined" style={{ fontSize: '160px', transform: 'translate(40px, 40px)' }}>analytics</span>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
