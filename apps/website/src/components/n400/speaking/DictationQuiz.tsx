'use client';

// Writing (dictation) practice screen. Uses the shared calm "Luyện tập" chrome
// (PracticeProgressRow + PracticeSupportPanel) like the Civics practice page.
// The learner hears the sentence (Listen / Slow), types what they hear, and
// checks it. Wrong answers stay on the card so the learner must retype the
// sentence correctly (active recall) — there is no retry limit. Feedback shows a
// per-word diff plus an always-visible guidance box with the USCIS writing rules.

import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Lightbulb,
  ArrowRight,
  RotateCw,
  EarOff,
  Volume2,
  Pause,
  Turtle,
  RotateCcw,
  Check,
} from 'lucide-react';
import type { WritingSentence } from '@/lib/n400/writing-data';
import { writingAudioUrl } from '@/lib/n400/quiz-engine';
import { gradeWritingSentence, type GradeResult } from '@/lib/n400/writing-grader';
import { buildFeedbackBlocks } from '@/lib/n400/writing-feedback';
import { WordDiff } from '@/components/n400/ui/WordDiff';
import { PracticeSessionSummary } from '@/components/n400/PracticeSessionSummary';
import { PracticeProgressRow, PracticeSupportPanel, LearningTipCard } from '@/components/n400/practice-chrome';
import {
  MockExamProgress,
  MockExamPanel,
  MockExamRulesCard,
  type MockExamSection,
  type MockMode,
} from '@/components/n400/mock-test-chrome';

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
   * an abandon apart from a real completion. `perItem` carries the per-sentence
   * verdicts so callers can record real attempts (review debt needs them).
   */
  onSessionEnd: (results: {
    correct: number;
    total: number;
    answered: number;
    perItem: { sentenceId: string; correct: boolean }[];
  }) => void;
  // Mock tests own their single result screen — skip this component's internal
  // PracticeSessionSummary and hand off to the caller as soon as the last
  // sentence is graded, instead of showing two result screens back to back.
  skipSummary?: boolean;
  // Exam mode (mock tests / full interview): no Kiểm tra step, no per-word
  // diff, no correct answer, no "Chưa nghe được" reveal. The learner types
  // what they hear and hits Tiếp theo; grading happens silently and the score
  // only surfaces after the whole section is finished, like the real exam.
  examMode?: boolean;
  /** Full Interview section badge shown in the exam progress card. */
  examSection?: MockExamSection;
  /** Which exam-page thumbnail the exam right rail shows. */
  mockMode?: MockMode;
}

// Strips the **bold** markers the feedback builder uses so guidance reads cleanly
// as plain text inside the yellow box.
function stripBold(text: string): string {
  return text.replace(/\*\*/g, '');
}

const WRITING_TIP = (
  <>Nghe kỹ, dùng nút <b className="font-semibold">Đọc chậm</b> nếu chưa rõ. Viết hoa tên
  riêng &amp; địa danh, không viết tắt (viết <i>United States</i>, không <i>U.S.</i>).</>
);

/**
 * Audio transport for the dictation card (image mock): a strong primary
 * "Listen" button + a lighter secondary "Slow" button. Listen flips to
 * "Đang phát… / Playing" while audio plays and to "Nghe lại / Replay" once it
 * finishes. Single shared audio element — no duplicate audio buttons elsewhere.
 */
function DictationAudio({ src, examMode = false }: { src: string | null; examMode?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Dispose the audio element on unmount. The parent remounts this component per
  // sentence (key={audioSrc}), so transport state resets without an effect.
  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  if (!src) return null;

  const ensure = () => {
    if (!audioRef.current) {
      const a = new Audio(src);
      a.addEventListener('ended', () => {
        setPlaying(false);
        setHasPlayed(true);
      });
      a.addEventListener('error', () => {
        setUnavailable(true);
        setPlaying(false);
      });
      audioRef.current = a;
    }
    return audioRef.current;
  };

  const start = (rate: number) => {
    if (unavailable) return;
    const audio = ensure();
    audio.pause();
    audio.currentTime = 0;
    audio.playbackRate = rate;
    if ('preservesPitch' in audio) audio.preservesPitch = true;
    const p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(() => setPlaying(true)).catch(() => setUnavailable(true));
    } else {
      setPlaying(true);
    }
  };

  const onListen = () => {
    if (playing) {
      // Toggle: stop what's playing.
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      setPlaying(false);
      setHasPlayed(true);
      return;
    }
    start(1);
  };

  const ListenIcon = playing ? Pause : hasPlayed ? RotateCcw : Volume2;
  const listenLabel = playing ? 'Đang phát… / Playing' : hasPlayed ? 'Nghe lại / Replay' : 'Nghe / Listen';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onListen}
        disabled={unavailable}
        className="flex items-center gap-2.5 rounded-2xl bg-teal-600 px-5 py-3 font-semibold text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
        style={{ fontSize: 'clamp(0.875rem, 1.6vw, 1rem)' }}
      >
        <ListenIcon size={18} className="shrink-0" />
        <span>{listenLabel}</span>
      </button>
      <button
        type="button"
        onClick={() => start(0.7)}
        disabled={unavailable}
        className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)' }}
      >
        <Turtle size={17} className="shrink-0" />
        {/* Exam renames this "Speak Slower" — a real USCIS interview request,
            not a media control. Practice keeps the plainer "Slow". */}
        <span>Đọc chậm / {examMode ? 'Speak Slower' : 'Slow'}</span>
      </button>
    </div>
  );
}

export function DictationQuiz({
  questions,
  onSessionEnd,
  skipSummary = false,
  examMode = false,
  examSection,
  mockMode = 'full',
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

  const sessionResults = () => ({
    correct: results.filter((r) => r.correct).length,
    total: questions.length,
    answered: results.length,
    perItem: results.map((r) => ({ sentenceId: r.sentenceId, correct: r.correct })),
  });

  useEffect(() => {
    if (done && skipSummary) {
      onSessionEnd(sessionResults());
    }
    // Only re-fire when a session actually finishes — onSessionEnd/results are
    // captured fresh at that point, not tracked as deps to avoid re-triggering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, skipSummary]);

  // Restore any saved draft when entering a sentence (truthful "Auto saving…"
  // resume: a mid-sentence reload keeps what was typed). Practice only — never
  // in exam mode, where a leftover practice draft would be an unfair hint.
  useEffect(() => {
    if (done || examMode || typeof window === 'undefined') return;
    const id = questions[index]?.id;
    const saved = id ? window.sessionStorage.getItem(`n400.writing.draft.${id}`) : null;
    if (saved) setUserInput(saved);
    // Only when the sentence index changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Persist the draft as the learner types (practice only).
  useEffect(() => {
    if (!q || examMode || typeof window === 'undefined') return;
    const key = `n400.writing.draft.${q.id}`;
    if (userInput) window.sessionStorage.setItem(key, userInput);
    else window.sessionStorage.removeItem(key);
  }, [userInput, q, examMode]);

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
          onChangeMode={() => onSessionEnd(sessionResults())}
        />
      </div>
    );
  }

  const isCorrect = gradeResult?.isCorrect ?? false;
  const wordCount = userInput.trim() ? userInput.trim().split(/\s+/).length : 0;

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
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(`n400.writing.draft.${q.id}`);
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
      {/* Progress — exam uses the calm mock card; practice keeps the estimate row. */}
      {examMode ? (
        <MockExamProgress index={index} total={questions.length} section={examSection} />
      ) : (
        <PracticeProgressRow
          index={index}
          total={questions.length}
          unit="Câu"
          onBack={() => onSessionEnd(sessionResults())}
          showTime
        />
      )}

      {/* Main area */}
      <div className="flex-1 min-h-0 flex gap-[clamp(0.5rem,1vw,1.5rem)]">
        {/* Exercise card */}
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          <div
            className="flex-1 min-h-0 overflow-y-auto p-[clamp(0.75rem,2vh,1.5rem)]"
            style={{ scrollbarGutter: 'stable' }}
          >
            {/* Header — instruction is the hero */}
            <div className="mb-[clamp(0.5rem,1vw,1rem)]">
              <div className="text-gray-500" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.875rem)' }}>
                Câu viết / Writing #{q.num} · {q.topicVi}
              </div>
              <div className="font-bold leading-snug text-gray-800 mt-0.5" style={{ fontSize: 'clamp(1.125rem, 2.6vw, 1.5rem)' }}>
                Nghe và gõ lại câu bạn nghe
              </div>
              <div className="text-gray-500 mt-1" style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)' }}>
                Listen and type the sentence you hear
              </div>
            </div>

            {/* Audio controls — Listen (primary) + Slow (secondary).
                key remounts the transport for each new sentence. */}
            <DictationAudio key={audioSrc} src={audioSrc} examMode={examMode} />

            {/* Input */}
            <div className="mt-[clamp(0.75rem,1.5vh,1.25rem)]">
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
                placeholder="Gõ chính xác câu bạn nghe... / Type exactly what you hear..."
                rows={2}
                className="w-full resize-none rounded-2xl border-2 border-gray-200 bg-white p-[clamp(0.625rem,1.5vh,1rem)] text-gray-800 leading-relaxed outline-none transition-colors focus:border-teal-400"
                style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.05rem)' }}
                autoFocus
              />
              {/* Word count while empty → truthful "Auto saving…" once typing
                  starts (practice only; exam never persists drafts). */}
              <div className="mt-1.5 flex items-center justify-end text-xs">
                {userInput.length > 0 && !examMode ? (
                  <span className="flex items-center gap-1 font-medium text-teal-600">
                    <Check size={13} className="shrink-0" /> Auto saving…
                  </span>
                ) : (
                  <span className="text-gray-400">{wordCount} từ / words</span>
                )}
              </div>
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

            {/* Mobile support — exam shows Exam Rules; practice shows a Writing Tip */}
            {examMode ? (
              <div className="mt-[clamp(0.75rem,2vh,1.25rem)] lg:hidden">
                <MockExamRulesCard />
              </div>
            ) : !showFeedback && !revealed ? (
              <div className="mt-[clamp(0.75rem,2vh,1.25rem)] lg:hidden">
                <LearningTipCard title="Mẹo viết / Writing Tip">{WRITING_TIP}</LearningTipCard>
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
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold shadow-md transition-all ${
                  userInput.trim()
                    ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20'
                    : 'cursor-not-allowed bg-teal-600/20 text-teal-700/50 shadow-none'
                }`}
                style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
              >
                <span>{index === questions.length - 1 ? 'Nộp bài' : 'Next'}</span>
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

        {/* Right rail — exam: illustration + Exam Rules; practice: illustration + Writing Tip */}
        {examMode ? (
          <MockExamPanel mode={mockMode} />
        ) : (
          <PracticeSupportPanel
            tip={<LearningTipCard title="Mẹo viết / Writing Tip">{WRITING_TIP}</LearningTipCard>}
          />
        )}
      </div>
    </div>
  );
}
