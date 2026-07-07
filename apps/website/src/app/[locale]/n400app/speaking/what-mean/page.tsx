'use client';

import { useMemo, useState } from 'react';
import { Layers, ArrowRight } from 'lucide-react';
import { useN400UserState } from '@/lib/n400/user-state';
import { WHATMEAN_QUESTIONS, WHATMEAN_QUESTIONS_BY_ID } from '@/lib/n400/whatmean-data';
import { WHATMEAN_PRESETS } from '@/lib/n400/section-presets';
import { deriveSectionSeen } from '@/lib/n400/section-progress';
import { sectionDailyFive, dailyFiveDoneCount } from '@/lib/n400/section-daily';
import { buildWhatMeanOptions } from '@/lib/n400/whatmean-options';
import {
  shuffle,
  whatMeanQuestionAudioUrl,
  whatMeanAnswerAudioUrl,
  type PracticePreset,
} from '@/lib/n400/quiz-engine';
import { PracticeSessionPicker } from '@/components/n400/PracticeSessionPicker';
import {
  SectionFlashcardScreen,
  type SectionCard,
} from '@/components/n400/speaking/SectionFlashcardScreen';
import { SectionMCQuiz, type MCQuestion } from '@/components/n400/speaking/SectionMCQuiz';

const ALL_IDS = WHATMEAN_QUESTIONS.map((q) => q.id);

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type Mode =
  | { kind: 'landing' }
  | { kind: 'deck'; ids: string[] }
  | { kind: 'practice'; ids: string[]; seed: string };

function toCard(id: string): SectionCard {
  const q = WHATMEAN_QUESTIONS_BY_ID[id];
  return {
    id,
    badge: `Từ vựng / Vocabulary #${q.num}`,
    questionEn: q.termEn,
    questionVi: q.termVi,
    questionAudioSrc: whatMeanQuestionAudioUrl(q.num),
    answerAudioSrc: whatMeanAnswerAudioUrl(q.num),
    answers: [{ en: q.definitionEn, vi: q.definitionVi }],
    listPrimary: q.termEn,
    listSecondary: q.definitionEn,
  };
}

function toQuestion(id: string, seed: string, i: number): MCQuestion {
  const q = WHATMEAN_QUESTIONS_BY_ID[id];
  const options = buildWhatMeanOptions(q, `${seed}-${i}`).map((o) => ({
    id: o.id,
    en: o.text,
    vi: '',
    isCorrect: o.isCorrect,
  }));
  return {
    itemId: id,
    badge: `Từ vựng / Vocabulary #${q.num}`,
    headerEn: q.termEn,
    headerVi: q.questionVi,
    questionAudioSrc: whatMeanQuestionAudioUrl(q.num),
    answerAudioSrc: whatMeanAnswerAudioUrl(q.num),
    options,
    accepted: [{ en: q.definitionEn, vi: q.definitionVi }],
  };
}

export default function WhatMeanPage() {
  const { state, hydrated, recordSectionAnswer, setSectionKnown } = useN400UserState();
  const [mode, setMode] = useState<Mode>({ kind: 'landing' });

  const known = useMemo(() => new Set(state.sectionKnown.whatmean), [state.sectionKnown.whatmean]);
  const seen = useMemo(
    () => deriveSectionSeen(state.sectionAttempts).whatmean,
    [state.sectionAttempts],
  );
  const daily = useMemo(
    () => sectionDailyFive('whatmean', ALL_IDS, known, seen, todayLocal()),
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
        onSetKnown={(id, v) => void setSectionKnown('whatmean', id, v)}
        onExit={() => setMode({ kind: 'landing' })}
        title="Câu hỏi What Mean"
      />
    );
  }

  if (mode.kind === 'practice') {
    return (
      <SectionMCQuiz
        questions={mode.ids.map((id, i) => toQuestion(id, mode.seed, i))}
        onAnswer={(id, ok) => void recordSectionAnswer('whatmean', id, ok, 'practice')}
        onExit={() => setMode({ kind: 'landing' })}
        onRestart={() => startPracticeWith(mode.ids.length)}
        title="Câu hỏi What Mean"
      />
    );
  }

  function startPracticeWith(count: number) {
    const seed = `${Date.now()}`;
    const ids = shuffle([...ALL_IDS], `wm-practice-${seed}`).slice(0, count);
    setMode({ kind: 'practice', ids, seed });
  }

  const startPractice = (preset: PracticePreset) => {
    startPracticeWith(preset.count ?? ALL_IDS.length);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-8">
        {/* Daily 5 hero */}
        <section className="rounded-[24px] border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-teal-600">Daily 5 hôm nay</div>
          <div className="mt-1 text-lg font-extrabold text-gray-900">Học 5 từ vựng — {dailyDone}/5</div>
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
            <div className="text-sm text-gray-500">Lật thẻ toàn bộ {ALL_IDS.length} từ vựng</div>
          </div>
        </button>

        {/* Luyện tập MC */}
        <div>
          <h2 className="mb-3 text-base font-bold text-gray-800">Luyện tập trắc nghiệm</h2>
          <PracticeSessionPicker
            presets={WHATMEAN_PRESETS}
            totalCount={ALL_IDS.length}
            resume={null}
            recommendation={null}
            onSelect={startPractice}
            onResume={() => {}}
            onPracticeRecommendation={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
