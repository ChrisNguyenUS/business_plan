import { createClient } from '@/lib/supabase/server'
import { getClient } from '@/actions/clients'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getInitials, formatDate } from '@/lib/utils'
import type { ServiceTag } from '@/types'

export const dynamic = 'force-dynamic'

const SERVICE_COLORS: Record<ServiceTag, string> = {
  immigration: 'bg-[rgba(58,175,185,0.1)] text-[#006970]',
  tax: 'bg-amber-50 text-amber-700',
  insurance: 'bg-blue-50 text-blue-700',
  ai: 'bg-purple-50 text-purple-700',
}

function InfoBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="bg-[#f7f9ff] p-4 rounded-lg">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-medium text-slate-700">{value || '—'}</p>
    </div>
  )
}

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const client = await getClient(id).catch(() => null)
  if (!client) notFound()

  const supabase = await createClient()

  // Fetch cases for this client
  const { data: cases } = await supabase
    .from('cases')
    .select(`
      id, status, case_type, created_at,
      case_forms(form_type)
    `)
    .or(`primary_client_id.eq.${id},secondary_client_id.eq.${id}`)
    .order('created_at', { ascending: false })
    .limit(5)

  const addr = client.address as Record<string, string> | null
  const addressStr = addr
    ? [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ')
    : null

  const initials = getInitials(client.first_name, client.last_name)
  const services = (client.services_used ?? []) as ServiceTag[]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-5">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
            style={{ backgroundColor: '#3AAFB9' }}
          >
            {initials}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              {client.last_name}, {client.first_name}{' '}
              {client.middle_name ? client.middle_name : ''}
            </h2>
            {client.a_number && (
              <p className="text-sm text-slate-500 font-mono mt-0.5">A# {client.a_number}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {services.map((s) => (
                <span
                  key={s}
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold capitalize ${SERVICE_COLORS[s]}`}
                >
                  {s}
                </span>
              ))}
              {services.length === 0 && (
                <span className="text-[11px] text-slate-400">No services tagged</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/clients/${client.id}/edit`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 border border-[#bcc9ca]/40 hover:bg-[#f1f4f9] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            Edit
          </Link>
          <Link
            href={`/cases/new?clientId=${client.id}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all"
            style={{ backgroundColor: '#3AAFB9' }}
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Case
          </Link>
        </div>
      </div>

      {/* Personal Info */}
      <div
        className="bg-white rounded-xl p-6"
        style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
      >
        <h3 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-[#ebeef3]">
          Personal Information
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoBlock label="Date of Birth" value={formatDate(client.date_of_birth)} />
          <InfoBlock label="Country of Birth" value={client.country_of_birth} />
          <InfoBlock label="Marital Status" value={client.marital_status} />
          <InfoBlock label="Phone" value={client.phone} />
          <InfoBlock label="Email" value={client.email} />
          <InfoBlock label="Address" value={addressStr} />
          <InfoBlock label="A-Number" value={client.a_number ? `A# ${client.a_number}` : null} />
          <InfoBlock label="SSN" value={client.ssn ? '•••-••-••••' : null} />
        </div>
        {client.notes && (
          <div className="mt-4 pt-4 border-t border-[#ebeef3]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Notes
            </p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Case History */}
      <div
        className="bg-white rounded-xl p-6"
        style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#ebeef3]">
          <h3 className="text-base font-semibold text-slate-800">Case History</h3>
          <Link
            href={`/cases/new?clientId=${client.id}`}
            className="text-xs font-semibold flex items-center gap-1"
            style={{ color: '#3AAFB9' }}
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Case
          </Link>
        </div>

        {!cases || cases.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No cases yet.</p>
        ) : (
          <div className="space-y-3">
            {cases.map((c: any) => {
              const firstForm = c.case_forms?.[0]
              return (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-[#f7f9ff] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'rgba(58, 175, 185, 0.1)' }}
                    >
                      <span
                        className="material-symbols-outlined text-lg"
                        style={{ color: '#3AAFB9' }}
                      >
                        folder_shared
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 capitalize">
                        {c.case_type} case
                        {firstForm && ` · ${firstForm.form_type.toUpperCase()}`}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        #{c.id.slice(0, 8).toUpperCase()} ·{' '}
                        {new Date(c.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        c.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : c.status === 'denied'
                          ? 'bg-red-100 text-red-700'
                          : c.status === 'documents_pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-[rgba(58,175,185,0.1)] text-[#006970]'
                      }`}
                    >
                      {c.status.replace(/_/g, ' ')}
                    </span>
                    <span className="material-symbols-outlined text-slate-300 text-sm group-hover:text-slate-500 transition-colors">
                      chevron_right
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
