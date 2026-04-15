'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createCrossSellJob, type CrossSellOpportunity } from '@/actions/crossSell'
import type { ServiceTag } from '@/types'

export default function CrossSellCard({
  opportunities,
}: {
  opportunities: CrossSellOpportunity[]
}) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_12px_32px_-4px_rgba(0,105,112,0.04)] bg-gradient-to-br from-white to-primary/5">
      <div className="flex items-center gap-2 mb-6">
        <span className="material-symbols-outlined text-primary-container">auto_awesome</span>
        <h3 className="text-lg font-semibold text-slate-800">Cross-Sell Opportunities</h3>
      </div>

      <div className="space-y-4">
        {opportunities.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500 bg-surface-container-low rounded-lg">
            No cross-sell opportunities at this time.
          </div>
        ) : (
          opportunities.map((opp) => (
            <OpportunityItem key={`${opp.caseId}-${opp.clientId}`} opportunity={opp} />
          ))
        )}
      </div>
    </div>
  )
}

function OpportunityItem({ opportunity }: { opportunity: CrossSellOpportunity }) {
  const [sentServices, setSentServices] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<string | null>(null)

  async function handleSendOffer(serviceType: ServiceTag) {
    setLoading(serviceType)
    try {
      await createCrossSellJob(opportunity.clientId, opportunity.caseId, serviceType)
      setSentServices((prev) => new Set(prev).add(serviceType))
    } catch {
      // Silently handle — user sees button stays unsent
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-4 bg-white/60 rounded-xl border border-white/80 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-bold text-slate-800">{opportunity.clientName}</p>
          <p className="text-xs text-slate-500">
            {opportunity.formTypes.join(', ')} — {opportunity.triggerLabel}
          </p>
        </div>
        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          {opportunity.triggerLabel.toUpperCase()}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-[11px] font-bold text-slate-400">SUGGEST:</span>
        <div className="flex gap-1.5 flex-wrap">
          {opportunity.suggestedServices.map((s) => (
            <span
              key={s.type}
              className="text-[10px] px-2 py-1 bg-surface-container-high text-on-surface rounded-full"
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {opportunity.suggestedServices.map((s) =>
          sentServices.has(s.type) ? (
            <span
              key={s.type}
              className="flex-1 py-2 text-center text-[11px] font-bold text-green-700 bg-green-50 rounded-lg"
            >
              ✓ Job Created
            </span>
          ) : (
            <button
              key={s.type}
              onClick={() => handleSendOffer(s.type)}
              disabled={loading !== null}
              className="flex-1 py-2 bg-primary-container text-white text-[11px] font-bold uppercase tracking-wider rounded-lg hover:brightness-105 transition-all disabled:opacity-50"
            >
              {loading === s.type ? 'Creating...' : `Send ${s.label}`}
            </button>
          )
        )}
        <Link
          href={`/clients/${opportunity.clientId}`}
          className="py-2 px-4 bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-slate-200 transition-all text-center"
        >
          Profile
        </Link>
      </div>
    </div>
  )
}
