// Admin N400 question detail — read-only.
//
// Shows one question exactly as learners see it: text, correct answers and
// wrong choices from questions-data.ts / distractors-data.ts, and players for
// the public/n400-audio files learners hear. Nothing here writes to the
// database or to storage; editing happens in code.

import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import { adminQuestionDetail } from '@/lib/n400/admin-question-view';

function Listen({ src, label }: { src: string; label: string }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">{label}</span>
      <audio controls preload="none" src={src} className="h-8" />
    </div>
  );
}

export default async function AdminQuestionPage({
  params,
}: {
  params: Promise<{ locale: string; questionId: string }>;
}) {
  const { locale, questionId } = await params;
  const id = parseInt(questionId, 10);
  const q = Number.isNaN(id) ? null : adminQuestionDetail(id);
  if (!q) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Question #{questionId} not found.</p>
        <Link
          href={`/${locale}/admin/n400`}
          className="inline-flex items-center gap-1 text-sm text-primary mt-2 hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link
          href={`/${locale}/admin/n400`}
          className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <h1 className="text-xl font-bold text-charcoal">Question #{q.id}</h1>
        {q.isLocationBased ? (
          <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
            <MapPin className="h-3 w-3" />
            location-based
          </span>
        ) : null}
        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{q.category}</span>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Read-only — this is what learners see. To change it, edit{' '}
        <code>src/lib/n400/questions-data.ts</code> in code.
      </p>

      <section className="bg-white border border-border rounded-xl p-5 mb-6 space-y-3">
        <h2 className="font-semibold text-charcoal">Question</h2>
        <p className="text-sm text-charcoal">{q.questionEn}</p>
        <p className="text-sm text-muted-foreground">{q.questionVi}</p>
        <Listen src={q.questionAudio} label="Question audio" />
      </section>

      <section className="bg-white border border-border rounded-xl p-5 mb-6 space-y-3">
        <h2 className="font-semibold text-charcoal">
          Correct answer{q.answers.length > 1 ? 's' : ''}
        </h2>
        <ul className="space-y-2">
          {q.answers.map((a) => (
            <li key={a.en} className="border border-green-300 bg-green-50/40 rounded-lg p-3 text-sm">
              <p className="text-charcoal">{a.en}</p>
              <p className="text-muted-foreground">{a.vi}</p>
            </li>
          ))}
        </ul>
        {q.answerAudio ? <Listen src={q.answerAudio} label="Answer audio" /> : null}
      </section>

      {q.distractors.length > 0 ? (
        <section className="bg-white border border-border rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-charcoal mb-3">
            Wrong choices <span className="text-xs text-muted-foreground font-normal">({q.distractors.length})</span>
          </h2>
          <ul className="space-y-2">
            {q.distractors.map((d, i) => (
              <li key={i} className="border border-border rounded-lg p-3 text-sm">
                <p className="text-charcoal">{d.en}</p>
                <p className="text-muted-foreground">{d.vi}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {q.isLocationBased ? (
        <p className="text-xs text-muted-foreground mb-6">
          Location-based questions (Q23 senators, Q29 representatives, Q61 governors, Q62 capitals)
          pull their per-state answers from{' '}
          <Link href={`/${locale}/admin/n400/state-data`} className="text-primary hover:underline">
            State Data
          </Link>{' '}
          and{' '}
          <Link href={`/${locale}/admin/n400/representatives`} className="text-primary hover:underline">
            Representatives
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
