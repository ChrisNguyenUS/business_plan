'use client';

import Image from 'next/image';
import { ClipboardCheck, ArrowRight, CheckCircle, XCircle, Trophy, Volume2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { AudioButton } from '@/components/n400/AudioButton';
import { useN400UserState } from '@/lib/n400/user-state';
import type { MockResult } from '@/lib/n400/storage';
import {
  buildOptions,
  selectMockTestQuestions,
  questionAudioUrl,
  isPass,
  MOCK_TEST_QUESTION_COUNT,
  MOCK_TEST_PASS_THRESHOLD,
  type QuizOption,
} from '@/lib/n400/quiz-engine';
import type { N400Question } from '@/lib/n400/questions-data';

type Stage = 'intro' | 'taking' | 'result';

interface PerQuestionAnswer {
  questionId: number;
  pickedId: QuizOption['id'] | null;
  options: QuizOption[];
  wasCorrect: boolean | null;
}

export default function MockTestPage() {
  const { state, recordMockResult, hydrated } = useN400UserState();
  const stateCode = state.settings.stateCode;

  const [stage, setStage] = useState<Stage>('intro');
  const [seed, setSeed] = useState<string>('');
  const [questions, setQuestions] = useState<N400Question[]>([]);
  const [answers, setAnswers] = useState<PerQuestionAnswer[]>([]);
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<string>('');
  const [finalResult, setFinalResult] = useState<MockResult | null>(null);
  const recordedRef = useRef(false);

  const startNew = () => {
    const s = String(Date.now());
    const qs = selectMockTestQuestions(s);
    setSeed(s);
    setQuestions(qs);
    setAnswers(
      qs.map((q) => ({
        questionId: q.id,
        pickedId: null,
        options: buildOptions(q, stateCode, `mock-${s}-${q.id}`),
        wasCorrect: null,
      }))
    );
    setIndex(0);
    setStartedAt(new Date().toISOString());
    setStage('taking');
    setFinalResult(null);
    recordedRef.current = false;
  };

  const finish = (final: PerQuestionAnswer[]) => {
    const score = final.filter((a) => a.wasCorrect).length;
    const result: MockResult = {
      id: `mock-${seed}`,
      startedAt,
      completedAt: new Date().toISOString(),
      score,
      total: MOCK_TEST_QUESTION_COUNT,
      passed: isPass(score),
      questionResults: final.map((a) => ({
        questionId: a.questionId,
        wasCorrect: !!a.wasCorrect,
      })),
    };
    setFinalResult(result);
    setStage('result');
    if (!recordedRef.current) {
      recordedRef.current = true;
      recordMockResult(result);
    }
  };

  const onPick = (id: QuizOption['id']) => {
    setAnswers((prev) => {
      const next = [...prev];
      const cur = { ...next[index] };
      const opt = cur.options.find((o) => o.id === id);
      cur.pickedId = id;
      cur.wasCorrect = !!opt?.isCorrect;
      next[index] = cur;
      return next;
    });
  };

  const onNext = () => {
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
    } else {
      // We need the latest answers — read from state asynchronously via callback.
      setAnswers((prev) => {
        finish(prev);
        return prev;
      });
    }
  };

  const current = questions[index];
  const currentAnswer = answers[index];
  const answeredCount = answers.filter((a) => a.pickedId !== null).length;

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  if (stage === 'intro') {
    return <Intro onStart={startNew} />;
  }

  if (stage === 'result' && finalResult) {
    return <Result result={finalResult} questions={questions} answers={answers} onRetake={startNew} />;
  }

  if (!current || !currentAnswer) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">
            Câu {index + 1} / {MOCK_TEST_QUESTION_COUNT}
          </span>
          <span className="text-xs text-gray-500">
            Đã trả lời: {answeredCount} / {MOCK_TEST_QUESTION_COUNT}
          </span>
        </div>
        <ProgressBar progress={((index + 1) / MOCK_TEST_QUESTION_COUNT) * 100} heightClass="h-2" />
      </div>

      <Card className="p-8 max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <div className="text-sm text-gray-500 mb-1">Câu hỏi / Question #{current.id}</div>
            <div className="text-xl font-bold text-gray-800 leading-snug">
              {current.questionEn}
            </div>
            <div className="text-sm text-gray-500 mt-1">{current.questionVi}</div>
          </div>
          <AudioButton src={questionAudioUrl(current.id)} label="Nghe câu hỏi" />
        </div>

        <div className="space-y-3">
          {currentAnswer.options.map((opt) => {
            const isPicked = currentAnswer.pickedId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onPick(opt.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                  isPicked
                    ? 'border-teal-600 bg-teal-50 shadow-sm'
                    : 'border-gray-200 hover:border-teal-300 bg-white'
                }`}
              >
                <div className="font-bold text-gray-800 w-6">{opt.id}</div>
                <div className="flex-1 text-gray-800 font-medium">
                  <div>{opt.en}</div>
                  {opt.vi !== opt.en ? (
                    <div className="text-xs text-gray-500 mt-0.5">{opt.vi}</div>
                  ) : null}
                </div>
                {isPicked ? (
                  <CheckCircle size={22} className="text-teal-600" />
                ) : (
                  <span className="w-6 h-6 rounded-full border-2 border-gray-200" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            ⚠️ Đáp án sẽ chỉ hiển thị khi bạn hoàn thành tất cả 20 câu.
          </div>
          <button
            type="button"
            onClick={onNext}
            disabled={currentAnswer.pickedId === null}
            className="py-3 px-6 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 shadow-md flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {index === questions.length - 1 ? 'Nộp bài' : 'Tiếp theo'} <ArrowRight size={16} />
          </button>
        </div>
      </Card>
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="grid grid-cols-[3fr_2fr] gap-8 items-start animate-in fade-in duration-300">
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
            <ClipboardCheck size={26} />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">Thi thử N400</h3>
        </div>
        <p className="text-sm text-gray-600 mt-2 mb-6">
          Mô phỏng kỳ thi quốc tịch thật. Trả lời {MOCK_TEST_QUESTION_COUNT} câu hỏi ngẫu nhiên,
          đạt {MOCK_TEST_PASS_THRESHOLD} câu đúng để vượt qua.
        </p>

        <div className="space-y-3 text-sm text-gray-700 mb-8">
          <Bullet color="bg-teal-500">{MOCK_TEST_QUESTION_COUNT} câu ngẫu nhiên trên 128 câu chính thức.</Bullet>
          <Bullet color="bg-orange-500">Không hiển thị đáp án giữa chừng — như thi thật.</Bullet>
          <Bullet color="bg-purple-500">
            Đạt ≥ {MOCK_TEST_PASS_THRESHOLD}/{MOCK_TEST_QUESTION_COUNT} câu để vượt qua.
          </Bullet>
          <Bullet color="bg-yellow-500">Có audio MP3 phát âm chuẩn cho từng câu hỏi.</Bullet>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="w-full py-4 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 shadow-md flex items-center justify-center gap-2"
        >
          Bắt đầu thi thử <ArrowRight size={16} />
        </button>
      </Card>

      <div className="relative h-[420px] rounded-3xl overflow-hidden">
        <Image
          src="/images/n400/illu-flag-holding-transparent.png"
          alt=""
          fill
          className="object-contain"
          sizes="500px"
          priority
        />
      </div>
    </div>
  );
}

function Bullet({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-1.5 w-2 h-2 rounded-full ${color} shrink-0`} />
      <span>{children}</span>
    </div>
  );
}

function Result({
  result,
  questions,
  answers,
  onRetake,
}: {
  result: MockResult;
  questions: N400Question[];
  answers: PerQuestionAnswer[];
  onRetake: () => void;
}) {
  const passed = result.passed;
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card className={`p-8 text-center ${passed ? 'bg-teal-50 border-teal-200' : 'bg-orange-50 border-orange-200'}`}>
        <div className="flex items-center justify-center gap-3 mb-4">
          <Trophy className={passed ? 'text-teal-600' : 'text-orange-500'} size={40} />
          <h3 className="text-3xl font-extrabold text-gray-800">
            {passed ? 'Chúc mừng! Bạn đã vượt qua!' : 'Cố lên! Lần sau bạn sẽ làm tốt hơn.'}
          </h3>
        </div>
        <div className="text-5xl font-extrabold text-gray-900 mb-2">
          {result.score}
          <span className="text-2xl text-gray-500">/{result.total}</span>
        </div>
        <p className="text-sm text-gray-600">
          Cần đạt ≥ {MOCK_TEST_PASS_THRESHOLD} câu đúng để vượt qua. Bạn đạt{' '}
          {Math.round((result.score / result.total) * 100)}% độ chính xác.
        </p>
        <div className="flex justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={onRetake}
            className="px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 shadow-md"
          >
            Thi lại
          </button>
        </div>
      </Card>

      <Card className="p-6">
        <h4 className="font-bold text-gray-800 mb-4">Chi tiết các câu trả lời</h4>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const a = answers[i];
            const correct = a?.options.find((o) => o.isCorrect);
            const picked = a?.options.find((o) => o.id === a?.pickedId);
            const ok = !!a?.wasCorrect;
            return (
              <div
                key={q.id}
                className={`p-4 rounded-xl border ${ok ? 'border-teal-200 bg-teal-50/40' : 'border-orange-200 bg-orange-50/40'}`}
              >
                <div className="flex items-start gap-3">
                  {ok ? (
                    <CheckCircle className="text-teal-600 shrink-0 mt-0.5" size={20} />
                  ) : (
                    <XCircle className="text-orange-500 shrink-0 mt-0.5" size={20} />
                  )}
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">
                      Câu {i + 1} / Question #{q.id}
                    </div>
                    <div className="font-semibold text-gray-800 mt-1">{q.questionEn}</div>
                    <div className="text-xs text-gray-500">{q.questionVi}</div>
                    <div className="text-sm mt-2">
                      <span className="text-gray-500">Bạn chọn: </span>
                      <span className={ok ? 'text-teal-700 font-medium' : 'text-orange-600 font-medium'}>
                        {picked ? picked.en : '— (bỏ qua)'}
                      </span>
                    </div>
                    {!ok ? (
                      <div className="text-sm">
                        <span className="text-gray-500">Đáp án đúng: </span>
                        <span className="text-teal-700 font-medium">{correct?.en}</span>
                      </div>
                    ) : null}
                  </div>
                  <Volume2 className="text-gray-300" size={16} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
