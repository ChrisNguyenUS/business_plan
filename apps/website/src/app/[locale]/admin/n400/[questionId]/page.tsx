// Phase 7 Task 3 — Admin edit question page.
//
// Server-rendered shell that loads the question + answers, then renders
// inline forms bound to the server actions in ./actions.ts. Mutations
// post back through native <form action> handlers so the page works
// without JS for the text fields. The audio uploader is a client island
// (AudioUploadButton) because it has to PUT a file to a signed URL.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import { AudioUploadButton } from '@/components/n400/AudioUploadButton';
import {
  updateQuestion,
  updateAnswer,
  addAnswer,
  deleteAnswer,
} from './actions';

export const revalidate = 0;

interface Question {
  id: number;
  question_en: string;
  question_vi: string;
  category: string | null;
  category_code: string | null;
  is_location_based: boolean | null;
  question_audio_url: string | null;
}

interface Answer {
  id: string;
  question_id: number;
  answer_en: string;
  answer_vi: string;
  is_correct: boolean;
  answer_audio_url: string | null;
  display_order: number;
  deleted_at: string | null;
}

async function getQuestion(id: number): Promise<{ question: Question | null; answers: Answer[] }> {
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
  const [qRes, aRes] = await Promise.all([
    supabase.from('n400_questions').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('n400_answers')
      .select('*')
      .eq('question_id', id)
      .is('deleted_at', null)
      .order('is_correct', { ascending: false })
      .order('display_order'),
  ]);
  return {
    question: (qRes.data as Question | null) ?? null,
    answers: ((aRes.data as Answer[] | null) ?? []) as Answer[],
  };
}

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ locale: string; questionId: string }>;
}) {
  const { locale, questionId } = await params;
  const id = parseInt(questionId, 10);
  if (Number.isNaN(id)) {
    return <div className="p-6 text-sm text-muted-foreground">Invalid question id.</div>;
  }
  const { question, answers } = await getQuestion(id);
  if (!question) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Question #{id} not found.</p>
        <Link
          href={`/${locale}/admin/n400`}
          className="inline-flex items-center gap-1 text-sm text-primary mt-2 hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>
      </div>
    );
  }

  const updateQ = updateQuestion.bind(null, id);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link
          href={`/${locale}/admin/n400`}
          className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <h1 className="text-xl font-bold text-charcoal">Question #{id}</h1>
        {question.is_location_based ? (
          <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
            <MapPin className="h-3 w-3" />
            location-based
          </span>
        ) : null}
        {question.category_code ? (
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
            {question.category_code}
          </span>
        ) : null}
      </div>

      {/* Question text + category */}
      <form action={updateQ} className="bg-white border border-border rounded-xl p-5 mb-6 space-y-4">
        <h2 className="font-semibold text-charcoal">Question text</h2>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">English</label>
          <textarea
            name="question_en"
            defaultValue={question.question_en}
            className="w-full border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            rows={2}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Vietnamese</label>
          <textarea
            name="question_vi"
            defaultValue={question.question_vi}
            className="w-full border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            rows={2}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Category (free text — category_code A-E is set by migration)
          </label>
          <input
            name="category"
            defaultValue={question.category ?? ''}
            className="w-full border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-teal-dark transition-colors"
          >
            Save question
          </button>
          <AudioUploadButton
            questionId={id}
            type="question"
            currentUrl={question.question_audio_url}
          />
        </div>
      </form>

      {/* Answers */}
      <div className="bg-white border border-border rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-charcoal mb-3">
          Answers <span className="text-xs text-muted-foreground font-normal">({answers.length})</span>
        </h2>
        <div className="space-y-3">
          {answers.map((a) => {
            const update = updateAnswer.bind(null, a.id);
            const del = deleteAnswer.bind(null, a.id);
            return (
              <div
                key={a.id}
                className={`border rounded-lg p-3 ${
                  a.is_correct ? 'border-green-300 bg-green-50/40' : 'border-border'
                }`}
              >
                <form action={update} className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      name="answer_en"
                      defaultValue={a.answer_en}
                      placeholder="English"
                      className="border border-border rounded p-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      name="answer_vi"
                      defaultValue={a.answer_vi}
                      placeholder="Vietnamese"
                      className="border border-border rounded p-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="inline-flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        name="is_correct"
                        value="true"
                        defaultChecked={a.is_correct}
                      />
                      Correct
                    </label>
                    <button
                      type="submit"
                      className="text-xs bg-primary text-white px-3 py-1 rounded hover:bg-teal-dark"
                    >
                      Save
                    </button>
                    <AudioUploadButton
                      questionId={id}
                      type="answer"
                      answerId={a.id}
                      currentUrl={a.answer_audio_url}
                    />
                  </div>
                </form>
                <form action={del} className="mt-2">
                  <button
                    type="submit"
                    className="text-xs text-red-500 hover:underline"
                  >
                    Delete answer
                  </button>
                </form>
              </div>
            );
          })}
        </div>

        {/* Add new */}
        <form
          action={addAnswer.bind(null, id)}
          className="mt-5 pt-4 border-t border-border space-y-2"
        >
          <h3 className="text-sm font-medium text-charcoal">Add answer</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              name="answer_en"
              placeholder="English"
              className="border border-border rounded p-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
            <input
              name="answer_vi"
              placeholder="Vietnamese"
              className="border border-border rounded p-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1 text-xs">
              <input type="checkbox" name="is_correct" value="true" />
              Correct answer
            </label>
            <button
              type="submit"
              className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              Add
            </button>
          </div>
        </form>
      </div>

      {question.is_location_based ? (
        <p className="text-xs text-muted-foreground mb-6">
          Location-based questions (Q23 senators, Q29 representatives, Q61 governors, Q62 capitals)
          pull their per-state answers from{' '}
          <Link href={`/${locale}/admin/n400/state-data`} className="text-primary hover:underline">
            State Data
          </Link>{' '}
          and{' '}
          <Link href={`/${locale}/admin/n400/representatives`} className="text-primary hover:underline">
            Representatives
          </Link>{' '}
          rather than the answer rows above.
        </p>
      ) : null}
    </div>
  );
}
