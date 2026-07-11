'use client';

// Writing (dictation) practice screen. Reuses the SectionMCQuiz chrome: progress
// strip + a card holding the exercise and the decorative right sidebar. The user
// hears the sentence (normal + slow), types what they hear, and checks it. Wrong
// answers stay on the card so the learner must retype the sentence correctly
// (active recall) — there is no retry limit. Feedback shows a per-word diff plus
// an always-visible guidance box with the USCIS writing rules.

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  SlidersHorizontal,
  RotateCw,
  CheckCircle,
  XCircle,
  Lightbulb,
  ArrowRight,
  Target,
  Award,
  Ear,
  EarOff,
} from 'lucide-react';
import type { WritingSentence } from '@/lib/n400/writing-data';
import { writingAudioUrl } from '@/lib/n400/quiz-engine';
import { gradeWritingSentence, type GradeResult } from '@/lib/n400/writing-grader';
import { buildFeedbackBlocks } from '@/lib/n400/writing-feedback';
import { AudioButton } from '@/components/n400/AudioButton';
import { ProgressBar } from '@/components/n400/ui';
import { WordDiff } from '@/components/n400/ui/WordDiff';
import { PracticeSessionSummary } from '@/components/n400/PracticeSessionSummary';

interface DictationResult {
  sentenceId: string;
  userInput: string;
  correct: boolean;
  retryCount: number;
}

interface DictationQuizProps {
  questions: WritingSentence[];
  /**
   * `answered` = sentences actually graded; when the session is abandoned
   * mid-quiz (Đổi chế độ) it is < total, so orchestrating callers can tell
   * an abandon apart from a real completion.
   */
  onSessionEnd: (results: { correct: number; total: number; answered: number }) => void;
  // Mock tests own their single result screen — skip this component's internal
  // PracticeSessionSummary and hand off to the caller as soon as the last
  // sentence is graded, instead of showing two result screens back to back.
  skipSummary?: boolean;
  // Exam mode (mock tests / full interview): no Kiểm tra step, no per-word
  // diff, no correct answer, no "Chưa nghe được" reveal. The learner types
  // what they hear and hits Tiếp theo; grading happens silently and the score
  // only surfaces after the whole section is finished, like the real exam.
  examMode?: boolean;
}

// Strips the **bold** markers the feedback builder uses so guidance reads cleanly
// as plain text inside the yellow box.
function stripBold(text: string): string {
  return text.replace(/\*\*/g, '');
}

export function DictationQuiz({
  questions,
  onSessionEnd,
  skipSummary = false,
  examMode = false,
}: DictationQuizProps) {
  const [index, setIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  // Learner tapped "Chưa nghe được" — the caption is revealed and they must
  // retype the whole sentence correctly before they can move on (no skipping).
  const [revealed, setRevealed] = useState(false);
  // Correctness of the FIRST attempt on the current question — this is what the
  // session score reflects, so later retries don't inflate the result.
  const [firstCorrect, setFirstCorrect] = useState<boolean | null>(null);
  const [results, setResults] = useState<DictationResult[]>([]);

  const done = index >= questions.length;
  const q = done ? null : questions[index];

  useEffect(() => {
    if (done && skipSummary) {
      onSessionEnd({
        correct: results.filter((r) => r.correct).length,
        total: questions.length,
        answered: results.length,
      });
    }
    // Only re-fire when a session actually finishes — onSessionEnd/results are
    // captured fresh at that point, not tracked as deps to avoid re-triggering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, skipSummary]);

  if (done || !q) {
    if (skipSummary) return null;
    const correct = results.filter((r) => r.correct).length;
    const wrongCount = results.filter((r) => !r.correct).length;
    const restart = () => {
      setIndex(0);
      setUserInput('');
      setGradeResult(null);
      setShowFeedback(false);
      setRetryCount(0);
      setRevealed(false);
      setFirstCorrect(null);
      setResults([]);
    };
    return (
      <div className="flex flex-col h-full overflow-hidden max-w-[1100px] mx-auto w-full">
        <PracticeSessionSummary
          correct={correct}
          total={questions.length}
          wrongCount={wrongCount}
          onReviewWrong={restart}
          onRetry={restart}
          onChangeMode={() => onSessionEnd({ correct, total: questions.length, answered: results.length })}
        />
      </div>
    );
  }

  const isCorrect = gradeResult?.isCorrect ?? false;

  const onCheck = () => {
    if (!userInput.trim()) return;
    const result = gradeWritingSentence(userInput, q.sentenceEn);
    setGradeResult(result);
    setShowFeedback(true);
    // Score the question by its first attempt only.
    if (firstCorrect === null) setFirstCorrect(result.isCorrect);
  };

  // Active recall: clear the field and let the learner retype from scratch.
  // Keeps `revealed` intact so the caption stays on screen while they retype.
  const onRetry = () => {
    setUserInput('');
    setGradeResult(null);
    setShowFeedback(false);
    setRetryCount((c) => c + 1);
  };

  // "Chưa nghe được": reveal the caption and force a full retype. Counts as a
  // miss for the session score (they didn't recall it from listening), and the
  // learner can't skip ahead until they type the sentence correctly.
  const onReveal = () => {
    setRevealed(true);
    setUserInput('');
    setGradeResult(null);
    setShowFeedback(false);
    if (firstCorrect === null) setFirstCorrect(false);
  };

  const onNext = () => {
    // Exam mode grades right here — the learner never saw a Kiểm tra step, so
    // the one submitted attempt IS the graded attempt.
    const examCorrect = examMode
      ? gradeWritingSentence(userInput, q.sentenceEn).isCorrect
      : null;
    setResults((prev) => [
      ...prev,
      {
        sentenceId: q.id,
        userInput,
        correct: examMode ? !!examCorrect : firstCorrect ?? isCorrect,
        retryCount,
      },
    ]);
    setUserInput('');
    setGradeResult(null);
    setShowFeedback(false);
    setRetryCount(0);
    setRevealed(false);
    setFirstCorrect(null);
    setIndex((i) => i + 1);
  };

  const audioSrc = writingAudioUrl(q.num);
  const feedbackBlocks = gradeResult ? buildFeedbackBlocks(gradeResult.annotations) : [];
  const guidance = feedbackBlocks.find((b) => b.type === 'guidance');
  const annotationHints = feedbackBlocks.filter((b) => b.type === 'annotation');

  return (
    <div
      className="flex flex-col h-full overflow-hidden gap-[clamp(0.25rem,1vw,1rem)] max-w-[1100px] mx-auto w-full animate-in fade-in duration-300"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      {/* Progress row */}
      <div className="shrink-0 flex items-center justify-between gap-2">
        <span className="font-bold text-gray-700" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}>
          Câu {index + 1} / {questions.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onSessionEnd({
                correct: results.filter((r) => r.correct).length,
                total: questions.length,
                answered: results.length,
              })
            }
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <SlidersHorizontal size={14} /> Đổi chế độ
          </button>
        </div>
      </div>
      <ProgressBar progress={((index + 1) / questions.length) * 100} heightClass="h-[clamp(4px,0.5vw,10px)]" />

      {/* Main area */}
      <div className="flex-1 min-h-0 flex gap-[clamp(0.5rem,1vw,1.5rem)]">
        {/* Exercise card */}
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          <div
            className="flex-1 min-h-0 overflow-y-auto p-[clamp(0.75rem,2vh,1.5rem)]"
            style={{ scrollbarGutter: 'stable' }}
          >
            {/* Header */}
            <div className="mb-[clamp(0.5rem,1vw,1rem)]">
              <div className="text-gray-500" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.875rem)' }}>
                Câu viết / Writing #{q.num} · {q.topicVi}
              </div>
              <div className="font-bold leading-snug text-gray-800" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
                Nghe và gõ lại câu bạn nghe
              </div>
              <div className="text-gray-500 mt-0.5" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                Listen and type the sentence you hear
              </div>
            </div>

            {/* Audio controls */}
            <div className="flex items-center gap-3 rounded-2xl bg-teal-50/60 border border-teal-100 p-[clamp(0.625rem,1.5vh,1rem)]">
              <div className="flex items-center gap-2">
                <AudioButton src={audioSrc} label="Nghe" size="md" />
                <span className="font-semibold text-gray-700" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                  Nghe
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AudioButton src={audioSrc} label="Đọc chậm" size="md" rate={0.7} variant="slow" />
                <span className="font-semibold text-gray-700" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                  Đọc chậm
                </span>
              </div>
            </div>

            {/* Input */}
            <div className="mt-[clamp(0.5rem,1.5vh,1rem)]">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (examMode) {
                      if (userInput.trim()) onNext();
                    } else if (!showFeedback) {
                      onCheck();
                    }
                  }
                }}
                readOnly={showFeedback && isCorrect}
                placeholder="Gõ câu bạn nghe..."
                rows={2}
                className="w-full resize-none rounded-2xl border-2 border-gray-200 bg-white p-[clamp(0.625rem,1.5vh,1rem)] text-gray-800 leading-relaxed outline-none transition-colors focus:border-teal-400"
                style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.05rem)' }}
                autoFocus
              />
            </div>

            {/* Revealed caption — learner tapped "Chưa nghe được" and must now
                retype this sentence exactly before moving on. */}
            {revealed && !showFeedback ? (
              <div className="mt-[clamp(0.5rem,1vh,0.75rem)] rounded-2xl bg-blue-50 border border-blue-200 p-[clamp(0.625rem,1.5vh,1rem)] animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none">
                <div className="flex items-center gap-2 mb-1">
                  <EarOff size={16} className="text-blue-500 shrink-0" />
                  <span className="font-bold text-blue-800 uppercase tracking-wide" style={{ fontSize: 'clamp(0.6rem, 1vw, 0.7rem)' }}>
                    Câu đúng — gõ lại để tiếp tục
                  </span>
                </div>
                <div className="font-medium text-blue-900" style={{ fontSize: 'clamp(0.85rem, 1.6vw, 1rem)' }}>
                  {q.sentenceEn}
                </div>
              </div>
            ) : null}

            {/* Feedback */}
            {showFeedback && gradeResult ? (
              <div className="mt-[clamp(0.5rem,1vh,0.75rem)] space-y-[clamp(0.5rem,1vh,0.75rem)] animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none">
                <div
                  className={`flex items-center gap-2 rounded-2xl p-[clamp(0.625rem,1.5vh,1rem)] border-l-4 ${
                    isCorrect ? 'bg-teal-50 border-teal-500' : 'bg-red-50 border-red-500'
                  }`}
                >
                  {isCorrect ? (
                    <CheckCircle size={18} className="text-teal-600 shrink-0" />
                  ) : (
                    <XCircle size={18} className="text-red-500 shrink-0" />
                  )}
                  <span className="font-bold text-gray-800" style={{ fontSize: 'clamp(0.8rem, 1.5vw, 0.95rem)' }}>
                    {isCorrect ? '✓ Đúng!' : '✗ Sai — vui lòng thử lại'}
                  </span>
                </div>

                {/* Per-word diff */}
                <WordDiff wordResults={gradeResult.wordResults} />

                {/* Correct answer (shown so the learner can retype it) */}
                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-[clamp(0.5rem,1.2vh,0.875rem)]">
                  <div className="text-gray-400 uppercase tracking-wide mb-1" style={{ fontSize: 'clamp(0.6rem, 1vw, 0.7rem)' }}>
                    Câu đúng / Answer
                  </div>
                  <div className="font-medium text-gray-800" style={{ fontSize: 'clamp(0.85rem, 1.6vw, 1rem)' }}>
                    {q.sentenceEn}
                  </div>
                </div>

                {/* Guidance box (always shown) */}
                {guidance ? (
                  <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-[clamp(0.625rem,1.5vh,1rem)]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Lightbulb size={16} className="text-yellow-500 shrink-0" />
                      <span className="font-bold text-yellow-800" style={{ fontSize: 'clamp(0.75rem, 1.4vw, 0.875rem)' }}>
                        Quy tắc viết
                      </span>
                    </div>
                    <p className="text-yellow-900/90 whitespace-pre-line leading-relaxed" style={{ fontSize: 'clamp(0.75rem, 1.4vw, 0.875rem)' }}>
                      {stripBold(guidance.content)}
                    </p>
                    {annotationHints.length > 0 ? (
                      <ul className="mt-2 space-y-0.5 list-disc pl-5 text-yellow-900" style={{ fontSize: 'clamp(0.75rem, 1.4vw, 0.875rem)' }}>
                        {annotationHints.map((b, i) => (
                          <li key={i}>{stripBold(b.content)}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Pinned actions */}
          <div
            className="mt-auto shrink-0 border-t border-gray-100 px-[clamp(0.75rem,2vh,1.5rem)] pt-2.5"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
          >
            {examMode ? (
              // Exam: one button — submit what you typed, no checking, no reveal.
              <button
                type="button"
                onClick={onNext}
                disabled={!userInput.trim()}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold shadow-md transition-all ${
                  userInput.trim()
                    ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                }`}
                style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
              >
                <span>{index === questions.length - 1 ? 'Nộp bài' : 'Tiếp theo / Next'}</span>
                <ArrowRight size={16} />
              </button>
            ) : !showFeedback ? (
              <div className={`grid gap-3 ${revealed ? 'grid-cols-1' : 'grid-cols-[1fr_auto]'}`}>
                <button
                  type="button"
                  onClick={onCheck}
                  disabled={!userInput.trim()}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 font-semibold shadow-md transition-all ${
                    userInput.trim()
                      ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                  }`}
                  style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
                >
                  <CheckCircle size={16} /> Kiểm tra / Check
                </button>
                {!revealed ? (
                  <button
                    type="button"
                    onClick={onReveal}
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                    style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
                  >
                    <EarOff size={16} /> Chưa nghe được
                  </button>
                ) : null}
              </div>
            ) : (
              <div className={`grid gap-3 ${!isCorrect && !revealed ? 'grid-cols-[1fr_1fr]' : 'grid-cols-1'}`}>
                {!isCorrect ? (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                    style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
                  >
                    <RotateCw size={16} /> Thử lại
                  </button>
                ) : null}
                {/* After revealing the caption the learner must type it correctly —
                    no skipping. Next only appears once the answer is right. */}
                {isCorrect || !revealed ? (
                  <button
                    type="button"
                    onClick={onNext}
                    className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 font-semibold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all"
                    style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
                  >
                    <span>Tiếp theo / Next</span>
                    <ArrowRight size={16} />
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Decorative sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:gap-4 lg:max-w-[300px] xl:max-w-[400px] shrink-0 self-start">
          <div className="relative h-60 w-full overflow-hidden rounded-3xl">
            <Image
              src="/images/n400/illu-statue-city.png"
              alt="Statue of Liberty with American flag and city skyline"
              fill
              className="object-contain object-bottom"
              sizes="400px"
              priority
            />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800 leading-snug">
              Luyện viết mỗi ngày
              <br />
              để tự tin trong ngày thi!
            </h2>
            <p className="text-sm text-gray-500 mt-2">Nghe kỹ, viết đúng chính tả và viết hoa nhé! ✍️</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <TipCard icon={<Ear size={20} />} tone="teal" title="Nghe kỹ hai lần" desc="Dùng nút Đọc chậm nếu chưa nghe rõ." />
            <TipCard icon={<Target size={20} />} tone="orange" title="Viết hoa đúng chỗ" desc="Tên người, địa danh luôn viết hoa." />
            <TipCard icon={<Award size={20} />} tone="purple" title="Không viết tắt" desc="Viết đầy đủ: United States, không U.S." />
          </div>
        </div>
      </div>
    </div>
  );
}

function TipCard({
  icon,
  tone,
  title,
  desc,
}: {
  icon: React.ReactNode;
  tone: 'teal' | 'orange' | 'purple';
  title: string;
  desc: string;
}) {
  const styles = {
    teal: 'bg-teal-50 text-teal-600',
    orange: 'bg-orange-50 text-orange-500',
    purple: 'bg-purple-50 text-purple-600',
  } as const;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${styles[tone]}`}>{icon}</div>
      <div className="font-bold text-sm text-gray-800 mb-1 leading-tight">{title}</div>
      <div className="text-[11px] text-gray-500 leading-snug">{desc}</div>
    </div>
  );
}
