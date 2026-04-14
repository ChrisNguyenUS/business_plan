import { getClient } from '@/actions/clients'
import { ClientForm } from '@/components/clients/ClientForm'
import { notFound } from 'next/navigation'

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const client = await getClient(id).catch(() => null)
  if (!client) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
          Edit — {client.last_name}, {client.first_name}
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">Update client information</p>
      </div>
      <div
        className="bg-white rounded-xl p-8"
        style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }}
      >
        <ClientForm defaultValues={client} clientId={client.id} />
      </div>
    </div>
  )
}
