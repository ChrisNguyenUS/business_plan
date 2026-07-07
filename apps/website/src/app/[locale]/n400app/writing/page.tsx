'use client';

// Writing (dictation) section. Landing shows the session picker + the always-on
// USCIS writing-rules guidance box; picking a preset drops into DictationQuiz for
// that many sentences. Mirrors the what-mean / yes-no section shell, minus the
// Daily 5 / flashcard deck (writing is practice-only).

import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useN400UserState } from '@/lib/n400/user-state';
import { WRITING_SENTENCES, type WritingSentence } from '@/lib/n400/writing-data';
import { WRITING_PRESETS } from '@/lib/n400/section-presets';
import { shuffle, type PracticePreset } from '@/lib/n400/quiz-engine';
import { PracticeSessionPicker } from '@/components/n400/PracticeSessionPicker';
import { DictationQuiz } from '@/components/n400/speaking/DictationQuiz';

const ALL = WRITING_SENTENCES;

type Mode =
  | { kind: 'landing' }
  | { kind: 'quiz'; questions: WritingSentence[] };

const WRITING_RULES = [
  'Viết hoa tên người và địa danh (ví dụ: George Washington, California).',
  'Viết hoa chữ cái đầu câu và không viết tắt (viết United States, không viết U.S.).',
  'Nghe kỹ — dùng nút "Đọc chậm" nếu chưa rõ, rồi gõ lại đúng chính tả.',
];

export default function WritingPage() {
  const { hydrated, recordSectionAnswer } = useN400UserState();
  const [mode, setMode] = useState<Mode>({ kind: 'landing' });

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  const startQuiz = (preset: PracticePreset) => {
    const count = preset.count ?? ALL.length;
    const questions = shuffle([...ALL], `wr-quiz-${Date.now()}`).slice(0, count);
    setMode({ kind: 'quiz', questions });
  };

  if (mode.kind === 'quiz') {
    const { questions } = mode;
    return (
      <DictationQuiz
        questions={questions}
        onSessionEnd={({ correct }) => {
          // DictationQuiz reports only an aggregate score, so record each sentence
          // in the session as a practice attempt: this advances the streak and marks
          // the sentences "seen". Practice-mode attempts never feed known-state
          // (that is flashcard-only), so the arbitrary correct/wrong split is safe.
          questions.forEach((q, i) => {
            void recordSectionAnswer('writing', q.id, i < correct, 'practice');
          });
          setMode({ kind: 'landing' });
        }}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-8">
        {/* Intro */}
        <section>
          <h1 className="text-xl font-extrabold text-gray-900">✍️ Luyện tập Writing</h1>
          <p className="mt-1 text-sm text-gray-600">
            Nghe câu và gõ lại câu đó. Quy tắc USCIS: viết hoa tên người/địa danh, không viết tắt.
          </p>
        </section>

        {/* Guidance box (always visible) */}
        <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Lightbulb size={18} className="shrink-0 text-yellow-500" />
            <span className="text-sm font-bold text-yellow-800">Quy tắc viết</span>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-yellow-900">
            {WRITING_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        {/* Session picker */}
        <div>
          <h2 className="mb-3 text-base font-bold text-gray-800">Chọn bài luyện viết</h2>
          <PracticeSessionPicker
            presets={WRITING_PRESETS}
            totalCount={ALL.length}
            resume={null}
            recommendation={null}
            onSelect={startQuiz}
            onResume={() => {}}
            onPracticeRecommendation={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
