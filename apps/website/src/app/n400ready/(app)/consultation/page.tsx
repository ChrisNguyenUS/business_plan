'use client';

// Consultation booking form (spec §5). One screen, three states:
// form → confirm (with Calendly link), or "already requested" if an open
// request exists. Flags off → bounce to the dashboard; the CTA that links
// here is flag-gated too, so this is only a deep-link guard.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import {
  getBookingContext, submitConsultationRequest, type BookingContext,
} from '@/lib/n400/growth/booking-actions';
import { ingestClientEvent } from '@/lib/n400/growth/ingest';
import {
  CONSULTATION_TOPICS, PREFERRED_TIMES,
  type ConsultationTopic, type PreferredTime,
} from '@/lib/n400/growth/booking';

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? 'https://calendly.com/mannaonesolution';

export default function ConsultationPage() {
  const { dict } = useN400Lang();
  const router = useRouter();
  const t = dict.growth.booking;

  const [ctx, setCtx] = useState<BookingContext | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredTime, setPreferredTime] = useState<PreferredTime>('weekday_evening');
  const [topic, setTopic] = useState<ConsultationTopic>('n400_review');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openedLogged = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getBookingContext()
      .then((c) => {
        if (cancelled) return;
        if (!c.enabled) { router.replace('/n400ready'); return; }
        setCtx(c);
        setName(c.prefillName);
        setTopic(c.prefillTopic);
        if (!c.alreadyRequested && !openedLogged.current) {
          openedLogged.current = true;
          void ingestClientEvent('consultation_form_opened', { source_cta: c.sourceCta ?? 'none' });
        }
      })
      .catch(() => { router.replace('/n400ready'); });
    return () => { cancelled = true; };
  }, [router]);

  if (!ctx) return null;

  if (submitted || ctx.alreadyRequested) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-teal-600">{t.eyebrow}</div>
          <h1 className="mt-1.5 text-xl font-bold text-gray-800">
            {submitted ? t.confirmTitle : t.alreadyTitle}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {submitted ? t.confirmBody : t.alreadyBody}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={CALENDLY_URL} target="_blank" rel="noopener noreferrer"
              className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              {t.calendlyCta}
            </a>
            <Link
              href="/n400ready"
              className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              {t.backToDashboard}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await submitConsultationRequest({ name, phone, preferredTime, topic });
      if (res.ok) setSubmitted(true);
      else setError(res.error?.startsWith('invalid_') ? t.errorRequired : t.errorGeneric);
    } catch {
      setError(t.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wide text-teal-600">{t.eyebrow}</div>
        <h1 className="mt-1.5 text-xl font-bold text-gray-800">{t.title}</h1>
        <p className="mt-1 text-sm text-gray-600">{t.subtitle}</p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">{t.nameLabel}</span>
            <input
              value={name} onChange={(e) => setName(e.target.value)} required maxLength={120}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">{t.phoneLabel}</span>
            <input
              value={phone} onChange={(e) => setPhone(e.target.value)} required
              type="tel" inputMode="tel" placeholder="(713) 555-0100"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </label>
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700">{t.timeLabel}</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {PREFERRED_TIMES.map((v) => (
                <button
                  key={v} type="button" onClick={() => setPreferredTime(v)}
                  className={`rounded-full border px-4 py-1.5 text-sm ${
                    preferredTime === v
                      ? 'border-teal-600 bg-teal-50 font-semibold text-teal-700'
                      : 'border-slate-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t.timeOptions[v]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">{t.topicLabel}</span>
            <select
              value={topic} onChange={(e) => setTopic(e.target.value as ConsultationTopic)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              {CONSULTATION_TOPICS.map((v) => (
                <option key={v} value={v}>{t.topics[v]}</option>
              ))}
            </select>
          </label>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button
            type="submit" disabled={submitting}
            className="w-full rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-40"
          >
            {submitting ? t.submitting : t.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
