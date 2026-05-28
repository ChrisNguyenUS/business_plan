// Phase 7 Task 1 — Admin N400 questions index.
//
// Server-rendered list of all 128 questions. Each row links to
// /[locale]/admin/n400/<id> for editing. Audio + location indicators
// surface "missing audio" / "location-based" at a glance so the
// operator can prioritize edits without opening every row.
//
// The admin layout (`src/app/[locale]/admin/layout.tsx`) already gates
// every /admin/* route on `profile.role === 'admin'`, so this server
// component just reads with the user's session — RLS on n400_questions
// permits SELECT for admins via the `n400 questions admin write` ALL
// policy. Cache disabled so saves reflect immediately.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';

export const revalidate = 0;

interface QuestionRow {
  id: number;
  question_en: string;
  category: string | null;
  question_audio_url: string | null;
  is_location_based: boolean | null;
}

async function getQuestions(): Promise<QuestionRow[]> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );
  const { data } = await supabase
    .from('n400_questions')
    .select('id, question_en, category, question_audio_url, is_location_based')
    .is('deleted_at', null)
    .order('id');
  return (data ?? []) as QuestionRow[];
}

export default async function AdminN400Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const questions = await getQuestions();
  const missingAudio = questions.filter((q) => !q.question_audio_url).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">N400 Questions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {questions.length} questions • {missingAudio} missing audio
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
              <p className="text-sm font-medium text-charcoal truncate">{q.question_en}</p>
              <p className="text-xs text-muted-foreground truncate">{q.category ?? '—'}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {q.is_location_based ? (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  location
                </span>
              ) : null}
              {q.question_audio_url ? (
                <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                  🔊 audio
                </span>
              ) : (
                <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">
                  no audio
                </span>
              )}
            </div>
          </Link>
        ))}
        {questions.length === 0 ? (
          <p className="px-6 py-12 text-center text-muted-foreground text-sm">
            No questions yet. Run `seed-questions.ts` first.
          </p>
        ) : null}
      </div>
    </div>
  );
}
