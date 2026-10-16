// Admin N400 questions index — read-only.
//
// Lists the 128 questions exactly as learners see them: text comes from
// src/lib/n400/questions-data.ts (the single source of truth), not from the
// n400_questions table, which is only an id registry for FKs. Changing a
// question means editing questions-data.ts in code (plus a sync migration —
// see resync-question-bank-migration.test.ts). The admin layout already
// gates every /admin/* route on `profile.role === 'admin'`.

import Link from 'next/link';
import { adminQuestionRows } from '@/lib/n400/admin-question-view';

export default async function AdminN400Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const questions = adminQuestionRows();

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">N400 Questions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {questions.length} questions • read-only, as learners see them (questions-data.ts)
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/${locale}/admin/n400/state-data`}
            className="border border-border rounded-lg px-4 py-2 text-sm font-medium hover:bg-teal-light"
          >
            State Data
          </Link>
          <Link
            href={`/${locale}/admin/n400/representatives`}
            className="border border-border rounded-lg px-4 py-2 text-sm font-medium hover:bg-teal-light"
          >
            Representatives
          </Link>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl divide-y divide-border">
        {questions.map((q) => (
          <Link
            key={q.id}
            href={`/${locale}/admin/n400/${q.id}`}
            className="flex items-center gap-3 p-3 hover:bg-teal-light transition-colors"
          >
            <span className="text-xs font-mono text-muted-foreground w-10 shrink-0">
              #{q.id}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-charcoal truncate">{q.questionEn}</p>
              <p className="text-xs text-muted-foreground truncate">{q.category}</p>
            </div>
            {q.isLocationBased ? (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded shrink-0">
                location
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
