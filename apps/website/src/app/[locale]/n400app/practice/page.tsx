'use client';

import Image from 'next/image';
import { Bookmark, CheckCircle, XCircle, ArrowRight, Lightbulb, Target, Award, Rocket, RotateCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { AudioButton } from '@/components/n400/AudioButton';
import { MilestoneBanner } from '@/components/n400/MilestoneBanner';
import { BadgeUnlockToast } from '@/components/n400/BadgeUnlockToast';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { trackStreakMilestone } from '@/lib/n400/analytics';
import { N400_QUESTIONS } from '@/lib/n400/questions-data';
import {
  buildOptions,
  correctAnswersFor,
  shuffle,
  type QuizOption,
} from '@/lib/n400/quiz-engine';
import { questionAudioUrl, answerAudioUrlFor } from '@/lib/n400/quiz-engine';

const TOTAL = N400_QUESTIONS.length;

export default function PracticePage() {
  const {
    state,
    hydrated,
    recordAnswer,
    toggleBookmark,
  } = useN400UserState();

  const [seed] = useState(() => {
    if (typeof window === 'undefined') return 'init';
    const existing = window.sessionStorage.getItem('n400.practice.seed');
    if (existing) return existing;
    const next = String(Date.now());
    window.sessionStorage.setItem('n400.practice.seed', next);
    return next;
  });

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<QuizOption['id'] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [prevIndex, setPrevIndex] = useState(0);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const badges = useN400Badges();

  // Reset selected/revealed when navigating between questions (React-recommended pattern).
  if (index !== prevIndex) {
    setPrevIndex(index);
    setSelected(null);
    setRevealed(false);
    setMilestone(null);
    setUnlockedBadges([]);
  }

  const stateCode = state.settings.stateCode;
  const districtNumber = state.address.districtNumber;
  const order = useMemo(() => {
    // Skip Q29 (your U.S. Representative) when the user hasn't resolved
    // their congressional district yet — without it we can't build a correct
    // answer or 4 options.
    const ids = N400_QUESTIONS
      .filter((q) => q.id !== 29 || districtNumber !== null)
      .map((q) => q.id);
    return shuffle(ids, `practice-${seed}`);
  }, [seed, districtNumber]);

  const question = useMemo(() => {
    const id = order[index];
    return N400_QUESTIONS.find((q) => q.id === id)!;
  }, [order, index]);

  const options = useMemo(
    () => buildOptions(question, stateCode, `practice-${seed}-${index}`, districtNumber),
    [question, stateCode, seed, index, districtNumber]
  );

  const correctOption = options.find((o) => o.isCorrect);
  const allCorrect = correctAnswersFor(question, stateCode, districtNumber);

  const isBookmarked = state.bookmarks.includes(question.id);

  const onPick = (id: QuizOption['id']) => {
    if (revealed) return;
    setSelected(id);
    setRevealed(true);
    const opt = options.find((o) => o.id === id);
    const wasCorrect = !!opt?.isCorrect;
    void recordAnswer(question.id, wasCorrect, 'practice').then((result) => {
      if (result.milestone) {
        setMilestone(result.milestone);
        trackStreakMilestone(result.milestone);
      }
      if (result.unlockedBadges.length > 0) setUnlockedBadges(result.unlockedBadges);
    });
  };

  const onNext = () => {
    setIndex((i) => (i + 1) % order.length);
  };

  const onRestart = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('n400.practice.seed');
      window.location.reload();
    }
  };

  if (!hydrated) {
    return <div className="animate-in fade-in duration-300 text-sm text-gray-500">Đang tải…</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {unlockedBadges.length > 0 ? (
        <BadgeUnlockToast
          slugs={unlockedBadges}
          catalog={Object.fromEntries(badges.catalog.map((b) => [b.slug, b]))}
          trigger="session_complete"
        />
      ) : null}

      {milestone !== null ? <MilestoneBanner days={milestone} /> : null}

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-700 mb-3">
            Câu hỏi {index + 1} / {TOTAL}
          </div>
          <ProgressBar progress={((index + 1) / TOTAL) * 100} heightClass="h-2" />
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm"
        >
          <RotateCw size={14} /> Trộn lại
        </button>
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-6 items-start">
        <Card className="p-8 flex flex-col">
          <div className="flex items-start gap-4 mb-8">
            <div className="relative w-28 h-28 shrink-0">
              <Image
                src="/images/n400/illu-studying.png"
                alt=""
                fill
                className="object-contain"
                sizes="112px"
                priority
              />
            </div>
            <div className="relative bg-gray-50 rounded-2xl rounded-bl-none px-5 py-3 mt-6 border border-gray-200">
              <div className="text-sm text-gray-600 leading-tight">Cùng chinh phục</div>
              <div className="text-lg font-extrabold text-gray-900 leading-tight">N400!</div>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="flex-1">
              <div className="text-sm text-gray-500 mb-1">Câu hỏi / Question #{question.id}</div>
              <div className="text-xl font-bold text-gray-800 leading-snug">
                {question.questionEn}
              </div>
              <div className="text-sm text-gray-500 mt-1">{question.questionVi}</div>
            </div>
            <div className="flex flex-col gap-2 items-end shrink-0">
              <AudioButton src={questionAudioUrl(question.id)} label="Nghe câu hỏi" />
              <button
                type="button"
                onClick={() => toggleBookmark(question.id)}
                aria-label="Đánh dấu"
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isBookmarked
                    ? 'bg-amber-50 text-amber-500'
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
              >
                <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          <div className="space-y-3 flex-1">
            {options.map((opt) => {
              const isPicked = selected === opt.id;
              let style = 'border-gray-200 hover:border-teal-300 bg-white';
              let mark = (
                <span className="w-6 h-6 rounded-full border-2 border-gray-200" />
              );

              if (revealed) {
                if (opt.isCorrect) {
                  style = 'border-teal-600 bg-teal-50';
                  mark = <CheckCircle size={22} className="text-teal-600" />;
                } else if (isPicked) {
                  style = 'border-red-400 bg-red-50';
                  mark = <XCircle size={22} className="text-red-500" />;
                } else {
                  style = 'border-gray-200 bg-white opacity-70';
                }
              } else if (isPicked) {
                style = 'border-teal-600 bg-white shadow-sm';
                mark = <CheckCircle size={22} className="text-teal-600" />;
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={revealed}
                  onClick={() => onPick(opt.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${style}`}
                >
                  <div className="font-bold text-gray-800 w-6">{opt.id}</div>
                  <div className="flex-1 text-gray-800 font-medium">
                    <div>{opt.en}</div>
                    {opt.vi !== opt.en ? (
                      <div className="text-xs text-gray-500 mt-0.5">{opt.vi}</div>
                    ) : null}
                  </div>
                  {mark}
                </button>
              );
            })}
          </div>

          {revealed ? (
            <div
              className={`mt-6 rounded-2xl p-5 border-l-4 ${
                correctOption?.id === selected
                  ? 'bg-teal-50 border-teal-500'
                  : 'bg-orange-50 border-orange-500'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <Lightbulb className="text-amber-500" size={18} />
                <div className="font-bold text-gray-800">
                  {correctOption?.id === selected
                    ? 'Chính xác! / Correct!'
                    : 'Chưa đúng / Not quite'}
                </div>
                <AudioButton
                  src={answerAudioUrlFor(question, stateCode, districtNumber)}
                  label="Nghe đáp án"
                  size="sm"
                  className="ml-auto"
                />
              </div>
              <div className="text-sm text-gray-700 mb-1">
                <span className="font-semibold">Đáp án USCIS chấp nhận:</span>
              </div>
              <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                {(allCorrect.length > 0 ? allCorrect : question.answersEn.map((en, i) => ({ en, vi: question.answersVi[i] ?? en }))).map((a, i) => (
                  <li key={i}>
                    <span className="font-medium">{a.en}</span>
                    {a.vi !== a.en ? <span className="text-gray-500"> — {a.vi}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid grid-cols-[1fr_2fr] gap-4 mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setRevealed(true)}
              disabled={revealed}
              className="py-3.5 rounded-xl border border-gray-200 bg-white font-semibold text-gray-700 flex items-center justify-center gap-3 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lightbulb size={16} />
              <span className="leading-tight text-left">
                Xem đáp án
                <br />
                <span className="text-xs font-normal text-gray-500">Reveal</span>
              </span>
            </button>
            <button
              type="button"
              onClick={onNext}
              className="py-3.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 shadow-md flex items-center justify-center gap-2"
            >
              <span>Tiếp theo / Next</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <div className="relative h-[420px] rounded-3xl overflow-hidden">
            <Image
              src="/images/n400/illu-statue-city.png"
              alt="Statue of Liberty with American flag and city skyline"
              fill
              className="object-contain"
              sizes="500px"
              priority
            />
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800 leading-snug">
              Mỗi câu trả lời đúng
              <br />
              là một bước gần hơn đến ước mơ!
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              Giữ vững phong độ và chinh phục N400 nhé! 💪
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <TipCard
              icon={<Target size={20} />}
              tone="teal"
              title="Tập trung mỗi ngày"
              desc="Tiến bộ hơn 1% hôm nay tốt hơn ngày mai."
            />
            <TipCard
              icon={<Award size={20} />}
              tone="orange"
              title="Thử thách bản thân"
              desc="Càng luyện tập nhiều, kết quả càng bứt phá."
            />
            <TipCard
              icon={<Rocket size={20} />}
              tone="purple"
              title="Chinh phục mục tiêu"
              desc="N400 không còn xa khi bạn không bỏ cuộc."
            />
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
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${styles[tone]}`}>
        {icon}
      </div>
      <div className="font-bold text-sm text-gray-800 mb-1 leading-tight">{title}</div>
      <div className="text-[11px] text-gray-500 leading-snug">{desc}</div>
    </div>
  );
}
