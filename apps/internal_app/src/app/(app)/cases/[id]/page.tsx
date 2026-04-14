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

  const caseStatus = c.status as CaseStatus

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/cases" className="text-slate-400 hover:text-slate-600 transition-colors">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
            </Link>
            <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Case #{id.slice(0, 8).toUpperCase()}
            </h2>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                CASE_STATUS_COLORS[caseStatus] ?? 'bg-slate-100 text-slate-700'
              }`}
            >
              {CASE_STATUS_LABELS[caseStatus] ?? caseStatus}
            </span>
          </div>
          <p className="text-sm text-slate-400 ml-8">
            {primaryClient
              ? `${primaryClient.last_name}, ${primaryClient.first_name}`
              : 'Unknown client'}
            {secondaryClient && ` · ${secondaryClient.last_name}, ${secondaryClient.first_name}`}
            {' · '}
            <span className="capitalize">{c.case_type}</span> case
            {' · '}
            {new Date(c.created_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          {documents.find((d: any) => d.received) && (
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 border border-[#bcc9ca]/40 hover:bg-[#f1f4f9] transition-colors">
              <span className="material-symbols-outlined text-sm">download</span>
              Download ZIP
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Forms & Filing */}
          <div
            className="bg-white rounded-xl p-6"
            style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
          >
            <h3 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-[#ebeef3]">
              Forms & Filing Assistant
            </h3>
            {forms.length === 0 ? (
              <p className="text-sm text-slate-400">No forms added to this case.</p>
            ) : (
              <div className="space-y-3">
                {forms.map((form: any) => (
                  <div
                    key={form.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-[#ebeef3] hover:border-[#bcc9ca]/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(58, 175, 185, 0.1)' }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ color: '#3AAFB9' }}
                        >
                          description
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 uppercase">
                          {form.form_type}
                        </p>
                        <p className="text-xs text-slate-400 capitalize">
                          {form.filing_mode} filing
                          {form.receipt_number && ` · Receipt: ${form.receipt_number}`}
                          {form.current_uscis_status && ` · ${form.current_uscis_status}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {form.filing_mode === 'online' ? (
                        <Link
                          href={`/cases/${id}/filing/${form.id}`}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                          style={{ backgroundColor: '#3AAFB9' }}
                        >
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                          Open Filing Screen
                        </Link>
                      ) : (
                        <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-[#3AAFB9] transition-all"
                          style={{ color: '#006970' }}
                        >
                          <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                          Generate PDF
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Document Checklist */}
          <div
            className="bg-white rounded-xl p-6"
            style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#ebeef3]">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Document Checklist</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {receivedDocs} of {totalDocs} documents received
                </p>
              </div>
              {totalDocs > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-[#ebeef3] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${totalDocs > 0 ? (receivedDocs / totalDocs) * 100 : 0}%`,
                        backgroundColor: '#3AAFB9',
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {totalDocs > 0 ? Math.round((receivedDocs / totalDocs) * 100) : 0}%
                  </span>
                </div>
              )}
            </div>

            {documents.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                No checklist items yet. Add forms to auto-populate the checklist, or
                add custom items.
              </p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-[#f7f9ff] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                        style={
                          doc.received
                            ? { backgroundColor: '#16a34a', borderColor: '#16a34a' }
                            : { borderColor: '#bcc9ca' }
                        }
                      >
                        {doc.received && (
                          <span className="material-symbols-outlined text-white" style={{ fontSize: '13px' }}>
                            check
                          </span>
                        )}
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            doc.received ? 'text-slate-400 line-through' : 'text-slate-700'
                          }`}
                        >
                          {doc.label}
                        </p>
                        {doc.required && !doc.received && (
                          <p className="text-[10px] font-bold text-amber-500 uppercase">Required</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.file_path ? (
                        <>
                          <button className="text-xs font-semibold text-[#3AAFB9] hover:underline">
                            View
                          </button>
                          <button className="text-xs font-semibold text-slate-500 hover:underline">
                            Download
                          </button>
                        </>
                      ) : (
                        <button className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-[#bcc9ca]/40 rounded-lg px-2 py-1">
                          <span className="material-symbols-outlined text-xs">upload</span>
                          Upload
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Client Info */}
          <div
            className="bg-white rounded-xl p-6"
            style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
          >
            <h3 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-[#ebeef3]">
              {c.case_type === 'package' ? 'Clients' : 'Client'}
            </h3>
            {primaryClient && (
              <Link
                href={`/clients/${primaryClient.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f7f9ff] transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: '#3AAFB9' }}
                >
                  {primaryClient.first_name?.[0]}{primaryClient.last_name?.[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {primaryClient.last_name}, {primaryClient.first_name}
                  </p>
                  {c.case_type === 'package' && (
                    <p className="text-[11px] text-slate-400">Petitioner</p>
                  )}
                </div>
                <span className="material-symbols-outlined text-slate-300 text-sm ml-auto">
                  chevron_right
                </span>
              </Link>
            )}
            {secondaryClient && (
              <Link
                href={`/clients/${secondaryClient.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f7f9ff] transition-colors mt-2"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: '#2D8E96' }}
                >
                  {secondaryClient.first_name?.[0]}{secondaryClient.last_name?.[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {secondaryClient.last_name}, {secondaryClient.first_name}
                  </p>
                  <p className="text-[11px] text-slate-400">Beneficiary</p>
                </div>
                <span className="material-symbols-outlined text-slate-300 text-sm ml-auto">
                  chevron_right
                </span>
              </Link>
            )}
          </div>

          {/* Case Notes */}
          {c.notes && (
            <div
              className="bg-white rounded-xl p-6"
              style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
            >
              <h3 className="text-base font-semibold text-slate-800 mb-3">Notes</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{c.notes}</p>
            </div>
          )}

          {/* Payments Summary */}
          <div
            className="bg-white rounded-xl p-6"
            style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-semibold text-slate-800">Payments</h3>
              <button
                className="text-xs font-semibold"
                style={{ color: '#3AAFB9' }}
              >
                + Log Payment
              </button>
            </div>
            {(c.payments ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">No payments logged yet.</p>
            ) : (
              <div className="space-y-2">
                {(c.payments ?? []).slice(0, 3).map((p: any) => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="text-slate-600">{p.milestone_label ?? 'Payment'}</span>
                    <span className="font-semibold text-slate-800">
                      ${p.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
