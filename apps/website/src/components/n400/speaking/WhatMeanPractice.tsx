'use client';

import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { AudioButton } from '@/components/n400/AudioButton';
import { buildWhatMeanOptions } from '@/lib/n400/whatmean-options';
import { whatMeanQuestionAudioUrl } from '@/lib/n400/quiz-engine';
import { WHATMEAN_QUESTIONS_BY_ID } from '@/lib/n400/whatmean-data';

export function WhatMeanPractice({
  itemIds,
  seed,
  onAnswer,
  onExit,
  title,
}: {
  itemIds: string[];
  seed: string;
  onAnswer: (itemId: string, wasCorrect: boolean) => void;
  onExit: () => void;
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const done = index >= itemIds.length;
  const q = done ? null : WHATMEAN_QUESTIONS_BY_ID[itemIds[index]];
  const options = useMemo(
    () => (q ? buildWhatMeanOptions(q, `${seed}-${index}`) : []),
    [q, seed, index],
  );
  const answered = selected !== null;

  if (done || !q) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <div className="text-5xl">🎉</div>
        <div>
          <div className="text-2xl font-extrabold text-gray-800">
            {correctCount}/{itemIds.length}
          </div>
          <div className="text-gray-500">câu đúng</div>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white"
        >
          Hoàn thành
        </button>
      </div>
    );
  }

  const pick = (optText: string, isCorrect: boolean) => {
    if (answered) return;
    setSelected(optText);
    if (isCorrect) setCorrectCount((c) => c + 1);
    onAnswer(q.id, isCorrect);
  };

  const next = () => {
    setSelected(null);
    setIndex((i) => i + 1);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onExit}
          className="text-sm font-semibold text-gray-500 hover:text-gray-800"
        >
          ← {title}
        </button>
        <span className="text-xs font-semibold text-gray-500">
          {index + 1}/{itemIds.length}
        </span>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-gray-900">{q.termEn}</div>
            <div className="mt-0.5 text-sm text-gray-500">{q.questionEn}</div>
          </div>
          <AudioButton src={whatMeanQuestionAudioUrl(q.num)} label="Nghe câu hỏi" size="sm" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {options.map((o) => {
          const isChosen = selected === o.text;
          const showCorrect = answered && o.isCorrect;
          const showWrong = answered && isChosen && !o.isCorrect;
          return (
            <button
              key={o.id}
              type="button"
              disabled={answered}
              onClick={() => pick(o.text, o.isCorrect)}
              className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors ${
                showCorrect
                  ? 'border-teal-500 bg-teal-50 text-teal-800'
                  : showWrong
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : 'border-gray-200 bg-white hover:border-teal-300'
              }`}
            >
              <span>{o.text}</span>
              {showCorrect ? <Check size={18} className="shrink-0 text-teal-600" /> : null}
              {showWrong ? <X size={18} className="shrink-0 text-red-500" /> : null}
            </button>
          );
        })}
      </div>

      {answered ? (
        <div className="mt-auto rounded-2xl bg-gray-50 p-4">
          <div className="text-sm font-semibold text-gray-700">
            {q.termVi} — {q.definitionVi}
          </div>
          <button
            type="button"
            onClick={next}
            className="mt-3 w-full rounded-xl bg-teal-600 py-3 font-semibold text-white"
          >
            {index + 1 < itemIds.length ? 'Câu tiếp theo' : 'Xem kết quả'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
