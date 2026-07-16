'use client';

// Thi thử Viết — writing (dictation) mock test. Runs DictationQuiz over 3
// sentences drawn from the writing bank; the pass rule mirrors the real USCIS
// exam: writing ONE of the three sentences correctly is a pass. When the
// dictation session ends we swap the quiz for the shared mock result screen
// (pass/fail hero + per-sentence answer sheet).

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { WRITING_SENTENCES } from '@/lib/n400/writing-data';
import { shuffle, writingAudioUrl } from '@/lib/n400/quiz-engine';
import { useN400UserState } from '@/lib/n400/user-state';
import { DictationQuiz } from '@/components/n400/speaking/DictationQuiz';
import { MockResultScreen, type MockResultRow } from '@/components/n400/MockResultScreen';

const SENTENCE_COUNT = 3;
const PASS_THRESHOLD = 1; // đúng ít nhất 1/3 là đạt

interface Outcome {
  correct: number;
  total: number;
  rows: MockResultRow[];
}

export default function ThiThuVietPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
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
        requirement={`Cần viết đúng ≥ ${PASS_THRESHOLD}/${outcome.total} câu để vượt qua.`}
        passSubtitle="Bạn đã sẵn sàng cho phần Viết của buổi phỏng vấn."
        onRetake={retake}
        rows={outcome.rows}
        userAnswerLabel="Bạn viết:"
        reviewHref={`/${locale}/n400app/writing`}
        reviewLabel="Ôn luyện Viết"
        reviewTip="Ôn lại phần viết chính tả để cải thiện điểm số của bạn!"
        hubHref={`/${locale}/n400app/mock-test`}
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
          router.push(`/${locale}/n400app/mock-test`);
          return;
        }
        const rows: MockResultRow[] = perItem.flatMap((item, i) => {
          const q = questions.find((s) => s.id === item.sentenceId);
          if (!q) return [];
          return [
            {
              key: item.sentenceId,
              badge: `Câu ${i + 1} / Viết #${q.num}`,
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
