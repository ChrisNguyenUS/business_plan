'use client';

import { useCallback, useEffect, useMemo, useState, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import type { StateCode } from './state-data';
import { nextStreak, milestoneCrossed } from './storage';
import { evaluateAfterAttempt, evaluateAfterStreak } from './badges/actions';
import type { QuizMode, MockResult, UserSettings, UserAddress, N400State } from './storage';

export type { QuizMode, MockResult, UserSettings, UserAddress, N400State };

const TODAY_LOCAL = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const DEFAULT_STATE: N400State = {
  attempts: [],
  bookmarks: [],
  flashcardKnown: [],
  mockResults: [],
  streak: { current: 0, longest: 0, lastActivityDate: null },
  settings: { stateCode: 'TX', audioEnabled: true },
  address: { city: null, stateCode: null, zipcode: null, districtNumber: null },
};

interface DbProfile {
  city: string | null;
  state_code: string | null;
  zipcode: string | null;
  district_number: number | null;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

interface DbAttempt {
  question_id: number;
  was_correct: boolean;
  answered_at: string;
  attempt_id: string;
}

interface DbQuiz {
  id: string;
  mode: string;
  score: number;
  total_questions: number;
  passed: boolean | null;
  started_at: string;
  completed_at: string | null;
}

async function loadAll(userId: string): Promise<N400State> {
  const [profileRes, bookmarksRes, quizzesRes] = await Promise.all([
    supabase
      .from('n400_user_profile')
      .select('city,state_code,zipcode,district_number,current_streak,longest_streak,last_activity_date')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('n400_bookmarks').select('question_id').eq('user_id', userId),
    supabase
      .from('n400_quiz_attempts')
      .select(`
        id,mode,score,total_questions,passed,started_at,completed_at,
        n400_question_attempts (
          question_id, was_correct, answered_at, attempt_id
        )
      `)
      .eq('user_id', userId)
      .order('started_at', { ascending: true }),
  ]);

  const profile = (profileRes.data ?? null) as DbProfile | null;
  const bookmarks = (bookmarksRes.data ?? []).map((r) => r.question_id as number);
  
  const rawQuizzes = quizzesRes.data ?? [];
  const quizzes: DbQuiz[] = [];
  let qa: DbAttempt[] = [];

  for (const q of rawQuizzes) {
    quizzes.push({
      id: q.id,
      mode: q.mode,
      score: q.score,
      total_questions: q.total_questions,
      passed: q.passed,
      started_at: q.started_at,
      completed_at: q.completed_at,
    });
    if (q.n400_question_attempts && Array.isArray(q.n400_question_attempts)) {
      qa.push(...(q.n400_question_attempts as DbAttempt[]));
    }
  }

  // Sort QA by answered_at (ascending) and limit to last 2000
  qa.sort((a, b) => new Date(a.answered_at).getTime() - new Date(b.answered_at).getTime());
  if (qa.length > 2000) qa = qa.slice(-2000);

  const quizModeById = new Map(quizzes.map((q) => [q.id, q.mode as QuizMode]));
  const attempts = qa
    .filter((r) => quizModeById.has(r.attempt_id))
    .map((r) => ({
      questionId: r.question_id,
      wasCorrect: r.was_correct,
      mode: quizModeById.get(r.attempt_id)!,
      at: r.answered_at,
    }));

  const flashcardKnown = (() => {
    // last-wins per question, so toggling known→unknown actually unmarks.
    const lastFlashcard = new Map<number, boolean>();
    for (const a of attempts) {
      if (a.mode === 'flashcard') lastFlashcard.set(a.questionId, a.wasCorrect);
    }
    return [...lastFlashcard.entries()].filter(([, ok]) => ok).map(([id]) => id);
  })();

  const mockResults: MockResult[] = quizzes
    .filter((q) => q.mode === 'mock_test' && q.completed_at)
    .map((q) => ({
      id: q.id,
      startedAt: q.started_at,
      completedAt: q.completed_at!,
      score: q.score,
      total: q.total_questions,
      passed: q.passed === true,
      questionResults: qa
        .filter((r) => r.attempt_id === q.id)
        .map((r) => ({ questionId: r.question_id, wasCorrect: r.was_correct })),
    }));

  return {
    attempts,
    bookmarks,
    flashcardKnown,
    mockResults,
    streak: {
      current: profile?.current_streak ?? 0,
      longest: profile?.longest_streak ?? 0,
      lastActivityDate: profile?.last_activity_date ?? null,
    },
    settings: {
      stateCode: ((profile?.state_code as StateCode | null) ?? 'TX') as StateCode,
      audioEnabled: true,
    },
    address: {
      city: profile?.city ?? null,
      stateCode: profile?.state_code ?? null,
      zipcode: profile?.zipcode ?? null,
      districtNumber: profile?.district_number ?? null,
    },
  };
}

function useN400UserStateInternal() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<N400State>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      queueMicrotask(() => {
        setState(DEFAULT_STATE);
        setHydrated(true);
      });
      return;
    }
    let cancelled = false;
    loadAll(user.id)
      .then((s) => {
        if (!cancelled) {
          setState(s);
          setHydrated(true);
        }
      })
      .catch((e) => {
        console.error('n400: failed to load user state', e);
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const stats = useMemo(() => {
    const total = state.attempts.length;
    const correct = state.attempts.filter((a) => a.wasCorrect).length;
    const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);
    const distinctAnswered = new Set(state.attempts.map((a) => a.questionId));
    const lastSeen = new Map<number, boolean>();
    for (const a of state.attempts) lastSeen.set(a.questionId, a.wasCorrect);
    let mastered = 0;
    for (const [, ok] of lastSeen) if (ok) mastered += 1;
    return {
      totalAttempts: total,
      correctCount: correct,
      accuracy,
      distinctAnswered: distinctAnswered.size,
      mastered,
      coverage: Math.round((distinctAnswered.size / 128) * 100),
    };
  }, [state.attempts]);

  const toggleBookmark = useCallback(
    async (questionId: number) => {
      if (!user) return;
      const has = state.bookmarks.includes(questionId);
      setState((s) => ({
        ...s,
        bookmarks: has ? s.bookmarks.filter((id) => id !== questionId) : [...s.bookmarks, questionId],
      }));
      const op = has
        ? supabase.from('n400_bookmarks').delete().eq('user_id', user.id).eq('question_id', questionId)
        : supabase.from('n400_bookmarks').insert({ user_id: user.id, question_id: questionId });
      const { error } = await op;
      if (error) {
        console.error('n400: bookmark toggle failed', error);
        setState((s) => ({
          ...s,
          bookmarks: has ? [...s.bookmarks, questionId] : s.bookmarks.filter((id) => id !== questionId),
        }));
      }
    },
    [user, state.bookmarks]
  );

  const updateSettings = useCallback(
    async (patch: Partial<UserSettings>) => {
      if (!user) return;
      setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
      if (patch.stateCode) {
        const today = TODAY_LOCAL();
        const { error } = await supabase.from('n400_user_profile').upsert(
          {
            user_id: user.id,
            state_code: patch.stateCode,
            updated_at: new Date().toISOString(),
            last_activity_date: state.streak.lastActivityDate ?? today,
          },
          { onConflict: 'user_id' }
        );
        if (error) console.error('n400: settings update failed', error);
      }
    },
    [user, state.streak.lastActivityDate]
  );

  // Practice/flashcard answer recording — keeps streak in lockstep with v1 logic.
  // Returns the milestone day count (3/7/14/30/60/100) when this answer pushes
  // the streak across one, otherwise null. Mock test goes through the
  // finalize_mock_attempt RPC instead and surfaces milestone via its result.
  // Also returns the badge slugs newly unlocked by this answer (Phase 6B).
  const recordAnswer = useCallback(
    async (
      questionId: number,
      wasCorrect: boolean,
      mode: QuizMode,
    ): Promise<{ milestone: number | null; unlockedBadges: string[] }> => {
      if (!user) return { milestone: null, unlockedBadges: [] };
      const today = TODAY_LOCAL();
      const newStreak = nextStreak(state.streak, today);
      const milestone = milestoneCrossed(state.streak.current, newStreak.current);
      setState((s) => {
        const nextAttempts = [
          ...s.attempts,
          { questionId, wasCorrect, mode, at: new Date().toISOString() },
        ].slice(-2000);
        // Mirror flashcardKnown to match the canonical derivation in loadAll.
        let nextFlashcard = s.flashcardKnown;
        if (mode === 'flashcard') {
          const set = new Set(s.flashcardKnown);
          if (wasCorrect) set.add(questionId);
          else set.delete(questionId);
          nextFlashcard = [...set];
        }
        return { ...s, attempts: nextAttempts, flashcardKnown: nextFlashcard, streak: newStreak };
      });

      // Practice/flashcard answers persist via a one-row quiz attempt envelope.
      // Mock test uses recordMockResult below, which writes a single attempt row.
      const { data: quiz, error: qErr } = await supabase
        .from('n400_quiz_attempts')
        .insert({
          user_id: user.id,
          mode,
          score: wasCorrect ? 1 : 0,
          total_questions: 1,
          passed: null,
          completed_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (qErr || !quiz) {
        console.error('n400: recordAnswer (quiz) failed', qErr);
        return { milestone, unlockedBadges: [] };
      }
      await supabase.from('n400_question_attempts').insert({
        attempt_id: quiz.id,
        question_id: questionId,
        was_correct: wasCorrect,
      });
      await supabase.from('n400_user_profile').upsert(
        {
          user_id: user.id,
          current_streak: newStreak.current,
          longest_streak: newStreak.longest,
          last_activity_date: newStreak.lastActivityDate,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      // Badge evaluation. Running all 24 evaluators on every practice
      // answer is too heavy, but we DO want streak badges to unlock the
      // moment a milestone is crossed. Strategy:
      //   - Always: streak_change trigger when milestone fires.
      //   - Periodic: session_complete trigger every 5th interaction
      //     in a mode (cheap heuristic for "session done"). Misses a
      //     few unlocks until the user keeps practicing — acceptable
      //     for v1; backfill script catches the rest.
      const unlockedBadges: string[] = [];
      try {
        if (milestone !== null) {
          const streakUnlocks = await evaluateAfterStreak(newStreak.current);
          unlockedBadges.push(...streakUnlocks);
        }
        const totalThisMode = state.attempts.filter((a) => a.mode === mode).length + 1;
        if (totalThisMode % 5 === 0) {
          const sessionUnlocks = await evaluateAfterAttempt(mode, quiz.id as string);
          for (const slug of sessionUnlocks) {
            if (!unlockedBadges.includes(slug)) unlockedBadges.push(slug);
          }
        }
      } catch (e) {
        console.error('n400/badges: evaluator wiring failed', e);
      }
      return { milestone, unlockedBadges };
    },
    [user, state.streak, state.attempts]
  );

  const setFlashcardKnown = useCallback(
    async (
      questionId: number,
      known: boolean,
    ): Promise<{ milestone: number | null; unlockedBadges: string[] }> => {
      // Reuse recordAnswer so mastery state, streak, and DB stay consistent.
      return recordAnswer(questionId, known, 'flashcard');
    },
    [recordAnswer]
  );

  const recordMockResult = useCallback(
    async (result: MockResult) => {
      if (!user) return;
      const today = TODAY_LOCAL();
      const newStreak = nextStreak(state.streak, today);
      setState((s) => ({
        ...s,
        mockResults: [...s.mockResults, result].slice(-100),
        streak: newStreak,
      }));

      const { data: quiz, error: qErr } = await supabase
        .from('n400_quiz_attempts')
        .insert({
          user_id: user.id,
          mode: 'mock_test',
          score: result.score,
          total_questions: result.total,
          passed: result.passed,
          started_at: result.startedAt,
          completed_at: result.completedAt,
        })
        .select('id')
        .single();
      if (qErr || !quiz) {
        console.error('n400: recordMockResult (quiz) failed', qErr);
        return;
      }
      if (result.questionResults.length > 0) {
        const rows = result.questionResults.map((r) => ({
          attempt_id: quiz.id,
          question_id: r.questionId,
          was_correct: r.wasCorrect,
        }));
        const { error: aErr } = await supabase.from('n400_question_attempts').insert(rows);
        if (aErr) console.error('n400: recordMockResult (answers) failed', aErr);
      }
      await supabase.from('n400_user_profile').upsert(
        {
          user_id: user.id,
          current_streak: newStreak.current,
          longest_streak: newStreak.longest,
          last_activity_date: newStreak.lastActivityDate,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    },
    [user, state.streak]
  );

  const resetAll = useCallback(async () => {
    if (!user) return;
    setState(DEFAULT_STATE);
    // Best-effort wipe. RLS scopes each delete to the current user.
    await Promise.all([
      supabase.from('n400_quiz_attempts').delete().eq('user_id', user.id),
      supabase.from('n400_bookmarks').delete().eq('user_id', user.id),
      supabase
        .from('n400_user_profile')
        .upsert(
          {
            user_id: user.id,
            current_streak: 0,
            longest_streak: 0,
            last_activity_date: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        ),
    ]);
  }, [user]);

  return {
    hydrated: hydrated && !authLoading,
    state,
    stats,
    toggleBookmark,
    updateSettings,
    recordAnswer,
    setFlashcardKnown,
    recordMockResult,
    resetAll,
    user,
  };
}

type N400UserContextType = ReturnType<typeof useN400UserStateInternal>;

const N400UserContext = createContext<N400UserContextType | null>(null);

export function N400UserStateProvider({ children }: { children: ReactNode }) {
  const value = useN400UserStateInternal();
  return <N400UserContext.Provider value={value}>{children}</N400UserContext.Provider>;
}

export function useN400UserState() {
  const ctx = useContext(N400UserContext);
  if (!ctx) throw new Error('useN400UserState must be used within N400UserStateProvider');
  return ctx;
}
