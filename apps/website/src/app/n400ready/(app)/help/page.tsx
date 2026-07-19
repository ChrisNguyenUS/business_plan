// Help page — bilingual FAQ stub + contact placeholder. Lives outside the
// auth gate so prospective users can read it before signing up. Wait — it's
// under /n400ready, which the middleware gates whole-route. The dashboard's
// Help link is the primary entry point for now (signed-in users only).
// If we decide to make this public later, we'll need to whitelist /n400ready/help
// in the middleware route guard.

import Link from 'next/link'
import { Card } from '@/components/n400/ui'
import { getN400Lang, getN400Dict } from '@/lib/n400/i18n/server'

export default async function HelpPage() {
  const lang = await getN400Lang()
  const dict = getN400Dict(lang)

  const faqs = [
    { q: dict.help.faq_0_q, a: dict.help.faq_0_a },
    { q: dict.help.faq_1_q, a: dict.help.faq_1_a },
    { q: dict.help.faq_2_q, a: dict.help.faq_2_a },
    { q: dict.help.faq_3_q, a: dict.help.faq_3_a },
  ]

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/n400ready" className="text-sm text-gray-500 hover:text-teal-600 hover:underline">
          ← {dict.help.backHome}
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-1">{dict.help.title}</h1>
      <p className="text-base text-gray-500 mb-8">{dict.help.subtitle}</p>

      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <Card key={i}>
            <p className="font-semibold text-base mb-1">{faq.q}</p>
            <p className="text-base text-gray-800 mt-2">{faq.a}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Card className="bg-teal-50 border-teal-100">
          <p className="font-semibold text-base mb-1">{dict.help.contactTitle}</p>
          <p className="text-sm text-gray-500 mb-4">Manna One Solution</p>
          {/* TODO(phase-9-launch): replace with real contact info */}
          <p className="text-base text-gray-800">📞 {dict.help.contactPhonePlaceholder}</p>
          <p className="text-base text-gray-800">📧 [Email]</p>
          <p className="text-base text-gray-800">📍 Houston, TX</p>
        </Card>
      </div>
    </div>
  )
}
