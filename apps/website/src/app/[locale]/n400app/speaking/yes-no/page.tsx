'use client';

import { useMemo, useState } from 'react';
import { Layers, ArrowRight } from 'lucide-react';
import { useN400UserState } from '@/lib/n400/user-state';
import { YESNO_QUESTIONS, YESNO_QUESTIONS_BY_ID } from '@/lib/n400/yesno-data';
import { YESNO_PRESETS } from '@/lib/n400/section-presets';
import { deriveSectionSeen } from '@/lib/n400/section-progress';
import { sectionDailyFive, dailyFiveDoneCount } from '@/lib/n400/section-daily';
import { shuffle, yesNoAudioUrl, type PracticePreset } from '@/lib/n400/quiz-engine';
import { PracticeSessionPicker } from '@/components/n400/PracticeSessionPicker';
import {
  SectionFlashcardScreen,
  type SectionCard,
} from '@/components/n400/speaking/SectionFlashcardScreen';
import { SectionYesNoQuiz } from '@/components/n400/speaking/SectionYesNoQuiz';

const ALL_IDS = YESNO_QUESTIONS.map((q) => q.id);

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type Mode =
  | { kind: 'landing' }
  | { kind: 'deck'; ids: string[] }
  | { kind: 'quiz'; ids: string[] };

const answerLabel = (answer: 'yes' | 'no') => (answer === 'yes' ? 'Yes, officer' : 'No, officer');

function toCard(id: string): SectionCard {
  const q = YESNO_QUESTIONS_BY_ID[id];
  const audio = yesNoAudioUrl(q.num);
  return {
    id,
    badge: `Câu hỏi Yes/No #${q.num}`,
    questionEn: q.questionEn,
    questionVi: q.questionVi,
    questionAudioSrc: audio,
    answerAudioSrc: audio,
    answers: [{ en: answerLabel(q.answer), vi: q.questionVi }],
    listPrimary: q.questionEn,
    listSecondary: answerLabel(q.answer),
  };
}

export default function YesNoPage() {
  const { state, hydrated, recordSectionAnswer, setSectionKnown } = useN400UserState();
  const [mode, setMode] = useState<Mode>({ kind: 'landing' });

  const known = useMemo(() => new Set(state.sectionKnown.yesno), [state.sectionKnown.yesno]);
  const seen = useMemo(() => deriveSectionSeen(state.sectionAttempts).yesno, [state.sectionAttempts]);
  const daily = useMemo(
    () => sectionDailyFive('yesno', ALL_IDS, known, seen, todayLocal()),
    [known, seen],
  );
  const dailyDone = dailyFiveDoneCount(daily, known);

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  if (mode.kind === 'deck') {
    return (
      <SectionFlashcardScreen
        cards={mode.ids.map(toCard)}
        known={known}
        onSetKnown={(id, v) => void setSectionKnown('yesno', id, v)}
        onExit={() => setMode({ kind: 'landing' })}
        title="Câu hỏi Yes/No"
      />
    );
  }

  if (mode.kind === 'quiz') {
    return (
      <SectionYesNoQuiz
        questions={mode.ids.map((id) => YESNO_QUESTIONS_BY_ID[id])}
        onAnswer={(id, ok) => void recordSectionAnswer('yesno', id, ok, 'practice')}
        onExit={() => setMode({ kind: 'landing' })}
        onRestart={() => startQuizWith(mode.ids.length)}
        title="Yes No Quiz"
      />
    );
  }

  function startQuizWith(count: number) {
    const ids = shuffle([...ALL_IDS], `yn-quiz-${Date.now()}`).slice(0, count);
    setMode({ kind: 'quiz', ids });
  }

  const startQuiz = (preset: PracticePreset) => {
    startQuizWith(preset.count ?? ALL_IDS.length);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-8">
        {/* Daily 5 hero */}
        <section className="rounded-[24px] border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-teal-600">Daily 5 hôm nay</div>
          <div className="mt-1 text-lg font-extrabold text-gray-900">Học 5 câu hỏi — {dailyDone}/5</div>
          <button
            type="button"
            onClick={() => setMode({ kind: 'deck', ids: daily })}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white shadow-md"
          >
            {dailyDone >= 5 ? 'Ôn lại' : 'Bắt đầu'} <ArrowRight size={16} />
          </button>
        </section>

        {/* Học tất cả */}
        <button
          type="button"
          onClick={() => setMode({ kind: 'deck', ids: [...ALL_IDS] })}
          className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Layers size={22} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-800">Học tất cả</div>
            <div className="text-sm text-gray-500">Lật thẻ toàn bộ {ALL_IDS.length} câu hỏi</div>
          </div>
        </button>

        {/* Luyện tập Yes/No */}
        <div>
          <h2 className="mb-3 text-base font-bold text-gray-800">Luyện tập Yes/No</h2>
          <PracticeSessionPicker
            presets={YESNO_PRESETS}
            totalCount={ALL_IDS.length}
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
