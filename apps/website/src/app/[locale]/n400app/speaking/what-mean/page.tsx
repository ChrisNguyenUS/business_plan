'use client';

import { useMemo, useState } from 'react';
import { Layers, ArrowRight } from 'lucide-react';
import { useN400UserState } from '@/lib/n400/user-state';
import { WHATMEAN_QUESTIONS, WHATMEAN_QUESTIONS_BY_ID } from '@/lib/n400/whatmean-data';
import { WHATMEAN_PRESETS } from '@/lib/n400/section-presets';
import { deriveSectionSeen } from '@/lib/n400/section-progress';
import { sectionDailyFive, dailyFiveDoneCount } from '@/lib/n400/section-daily';
import {
  shuffle,
  whatMeanQuestionAudioUrl,
  whatMeanAnswerAudioUrl,
  type PracticePreset,
} from '@/lib/n400/quiz-engine';
import { AudioButton } from '@/components/n400/AudioButton';
import { PracticeSessionPicker } from '@/components/n400/PracticeSessionPicker';
import { SectionFlashcardDeck, type DeckCard } from '@/components/n400/speaking/SectionFlashcardDeck';
import { WhatMeanPractice } from '@/components/n400/speaking/WhatMeanPractice';

const ALL_IDS = WHATMEAN_QUESTIONS.map((q) => q.id);

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type Mode =
  | { kind: 'landing' }
  | { kind: 'deck'; ids: string[] }
  | { kind: 'practice'; ids: string[]; seed: string };

function toCard(id: string): DeckCard {
  const q = WHATMEAN_QUESTIONS_BY_ID[id];
  return {
    id,
    listPrimary: q.termEn,
    listSecondary: q.definitionEn,
    front: (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-[24px] border border-gray-100 bg-white p-6 text-center shadow-sm">
        <AudioButton src={whatMeanQuestionAudioUrl(q.num)} label="Nghe" />
        <div className="mt-4 text-2xl font-extrabold text-gray-900">{q.termEn}</div>
        <div className="mt-2 text-gray-500">{q.questionEn}</div>
        <div className="mt-6 text-xs text-gray-400">Chạm để xem nghĩa</div>
      </div>
    ),
    back: (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-[24px] border border-teal-100 bg-teal-50/40 p-6 text-center shadow-sm">
        <AudioButton src={whatMeanAnswerAudioUrl(q.num)} label="Nghe nghĩa" size="sm" />
        <div className="mt-4 text-xl font-bold text-gray-900">{q.definitionEn}</div>
        <div className="mt-3 text-teal-800">
          {q.termVi} — {q.definitionVi}
        </div>
      </div>
    ),
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
    return <div className="flex flex-1 items-center justify-center text-gray-400">Đang tải…</div>;
  }

  if (mode.kind === 'deck') {
    return (
      <SectionFlashcardDeck
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
      <WhatMeanPractice
        itemIds={mode.ids}
        seed={mode.seed}
        onAnswer={(id, ok) => void recordSectionAnswer('whatmean', id, ok, 'practice')}
        onExit={() => setMode({ kind: 'landing' })}
        title="Câu hỏi What Mean"
      />
    );
  }

  const startPractice = (preset: PracticePreset) => {
    const seed = `${Date.now()}`;
    const count = preset.count ?? ALL_IDS.length;
    const ids = shuffle([...ALL_IDS], `wm-practice-${seed}`).slice(0, count);
    setMode({ kind: 'practice', ids, seed });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-8">
        {/* Daily 5 hero */}
        <section className="rounded-[24px] border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-teal-600">
            Daily 5 hôm nay
          </div>
          <div className="mt-1 text-lg font-extrabold text-gray-900">
            Học 5 từ vựng — {dailyDone}/5
          </div>
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
