'use client';

// Thi thử Viết — writing (dictation) mock test. Runs DictationQuiz over 3
// sentences drawn from the writing bank; the pass rule mirrors the real USCIS
// exam: writing ONE of the three sentences correctly is a pass. When the
// dictation session ends we swap the quiz for the shared mock result screen
// (pass/fail hero + per-sentence answer sheet).

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WRITING_SENTENCES } from '@/lib/n400/writing-data';
import { shuffle, writingAudioUrl } from '@/lib/n400/quiz-engine';
import { useN400UserState } from '@/lib/n400/user-state';
import { DictationQuiz } from '@/components/n400/speaking/DictationQuiz';
import { MockResultScreen, type MockResultRow } from '@/components/n400/MockResultScreen';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { tFormat } from '@/lib/n400/i18n/format';

const SENTENCE_COUNT = 3;
const PASS_THRESHOLD = 1; // đúng ít nhất 1/3 là đạt

interface Outcome {
  correct: number;
  total: number;
  rows: MockResultRow[];
}

export default function ThiThuVietPage() {
  const { dict } = useN400Lang();
  const router = useRouter();
  const { recordSectionMockResult } = useN400UserState();

  // Fresh random 3 sentences per attempt; `seed` bumps to reshuffle + remount.
  const [seed, setSeed] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const questions = useMemo(
    () => shuffle([...WRITING_SENTENCES], `mock-viet-${seed}`).slice(0, SENTENCE_COUNT),
    [seed],
  );

  const retake = () => {
    setOutcome(null);
    setSeed((s) => s + 1);
  };

  if (outcome) {
    return (
      <MockResultScreen
        passed={outcome.correct >= PASS_THRESHOLD}
        score={outcome.correct}
        total={outcome.total}
        requirement={tFormat(dict.mockTest.writingMock.requirement, { need: PASS_THRESHOLD, total: outcome.total })}
        passSubtitle={dict.mockTest.writingMock.passSubtitle}
        onRetake={retake}
        rows={outcome.rows}
        userAnswerLabel={dict.mockTest.writingMock.userAnswerLabel}
        reviewHref={`/n400ready/writing`}
        reviewLabel={dict.mockTest.writingMock.reviewLabel}
        reviewTip={dict.mockTest.writingMock.reviewTip}
        hubHref={`/n400ready/mock-test`}
      />
    );
  }

  return (
    <DictationQuiz
      key={seed}
      questions={questions}
      skipSummary
      examMode
      onSessionEnd={({ correct, total, answered, perItem }) => {
        // "Đổi chế độ" mid-test abandons the attempt — back to the picker
        // without recording, matching the full interview's abandon semantics.
        if (answered < total) {
          router.push(`/n400ready/mock-test`);
          return;
        }
        const rows: MockResultRow[] = perItem.flatMap((item, i) => {
          const q = questions.find((s) => s.id === item.sentenceId);
          if (!q) return [];
          return [
            {
              key: item.sentenceId,
              badge: tFormat(dict.mockTest.writingMock.badge, { index: i + 1, num: q.num }),
              prompt: q.sentenceEn,
              promptVi: q.sentenceVi,
              userAnswer: item.userInput.trim() || null,
              ok: item.correct,
              audioSrc: writingAudioUrl(q.num),
            },
          ];
        });
        setOutcome({ correct, total, rows });
        void recordSectionMockResult('writing', correct >= PASS_THRESHOLD, correct, total);
      }}
    />
  );
}
