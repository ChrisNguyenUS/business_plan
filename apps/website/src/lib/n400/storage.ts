'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import type { StateCode } from './state-data';

// ── Types ────────────────────────────────────────────────────────────────────

export type QuizMode = 'practice' | 'mock_test' | 'flashcard';

export interface QuestionAttempt {
  questionId: number;
  wasCorrect: boolean;
  mode: QuizMode;
  at: string; // ISO datetime
}

export interface MockResult {
  id: string;
  startedAt: string;
  completedAt: string;
  score: number;
  total: number;
  passed: boolean;
  questionResults: { questionId: number; wasCorrect: boolean }[];
}

export interface UserSettings {
  stateCode: StateCode;
  audioEnabled: boolean;
}

export interface N400State {
  attempts: QuestionAttempt[];
  bookmarks: number[];
  flashcardKnown: number[];
  mockResults: MockResult[];
  streak: {
    current: number;
    longest: number;
    lastActivityDate: string | null;
  };
  settings: UserSettings;
}

const STORAGE_KEY = 'n400.app.state.v1';

const initialState: N400State = {
  attempts: [],
  bookmarks: [],
  flashcardKnown: [],
  mockResults: [],
  streak: { current: 0, longest: 0, lastActivityDate: null },
  settings: { stateCode: 'TX', audioEnabled: true },
};

// ── Date helpers ─────────────────────────────────────────────────────────────

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yesterdayLocal(today: string): string {
  const [y, m, d] = today.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function nextStreak(
  prev: { current: number; longest: number; lastActivityDate: string | null },
  today: string
): { current: number; longest: number; lastActivityDate: string } {
  if (prev.lastActivityDate === today) {
    return { ...prev, lastActivityDate: today };
  }
  let current = 1;
  if (prev.lastActivityDate === yesterdayLocal(today)) {
    current = prev.current + 1;
  }
  const longest = Math.max(current, prev.longest);
  return { current, longest, lastActivityDate: today };
}

// ── External store (single source of truth, decoupled from React) ───────────

type Listener = () => void;

class N400Store {
  private state: N400State = initialState;
  private listeners = new Set<Listener>();
  private hydrated = false;

  getSnapshot = (): N400State => this.state;
  getServerSnapshot = (): N400State => initialState;

  isHydrated() {
    return this.hydrated;
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  hydrate() {
    if (this.hydrated || typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<N400State>;
        this.state = {
          ...initialState,
          ...parsed,
          streak: { ...initialState.streak, ...(parsed.streak ?? {}) },
          settings: { ...initialState.settings, ...(parsed.settings ?? {}) },
          attempts: parsed.attempts ?? [],
          bookmarks: parsed.bookmarks ?? [],
          flashcardKnown: parsed.flashcardKnown ?? [],
          mockResults: parsed.mockResults ?? [],
        };
      }
    } catch {
      /* keep defaults */
    }
    this.hydrated = true;
    this.installCrossTabSync();
    this.emit();
  }

  private persist() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* ignore quota */
    }
  }

  private emit() {
    for (const l of this.listeners) l();
  }

  set(updater: (s: N400State) => N400State) {
    this.state = updater(this.state);
    this.persist();
    this.emit();
  }

  reset() {
    this.state = initialState;
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    this.emit();
  }

  // Cross-tab sync (idempotent — safe to call from hydrate()).
  private crossTabInstalled = false;
  installCrossTabSync() {
    if (this.crossTabInstalled || typeof window === 'undefined') return;
    this.crossTabInstalled = true;
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        if (e.newValue) {
          const parsed = JSON.parse(e.newValue) as Partial<N400State>;
          this.state = { ...initialState, ...parsed };
        } else {
          this.state = initialState;
        }
        this.emit();
      } catch {
        /* ignore */
      }
    });
  }
}

const store = new N400Store();

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useN400State() {
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  // Hydrate once on the client. The store is a singleton; React only needs to
  // know when to flip the "hydrated" flag so SSR HTML stays stable.
  if (typeof window !== 'undefined') {
    store.hydrate();
  }

  // Track post-mount with the "adjust state during render" pattern: only flip the
  // hydrated flag once after first client render. We compare prevHydrated -> hydrated
  // to ensure setHydrated runs at most once.
  const [hydrated, setHydrated] = useState(false);
  const [prevTick, setPrevTick] = useState(false);
  if (typeof window !== 'undefined' && !prevTick) {
    setPrevTick(true);
    if (!hydrated) setHydrated(true);
  }

  const recordAnswer = useCallback((questionId: number, wasCorrect: boolean, mode: QuizMode) => {
    store.set((s) => {
      const today = todayLocal();
      const streak = nextStreak(s.streak, today);
      return {
        ...s,
        attempts: [
          ...s.attempts,
          { questionId, wasCorrect, mode, at: new Date().toISOString() },
        ].slice(-2000),
        streak,
      };
    });
  }, []);

  const toggleBookmark = useCallback((questionId: number) => {
    store.set((s) => ({
      ...s,
      bookmarks: s.bookmarks.includes(questionId)
        ? s.bookmarks.filter((id) => id !== questionId)
        : [...s.bookmarks, questionId],
    }));
  }, []);

  const setFlashcardKnown = useCallback((questionId: number, known: boolean) => {
    store.set((s) => ({
      ...s,
      flashcardKnown: known
        ? Array.from(new Set([...s.flashcardKnown, questionId]))
        : s.flashcardKnown.filter((id) => id !== questionId),
    }));
  }, []);

  const recordMockResult = useCallback((result: MockResult) => {
    store.set((s) => {
      const today = todayLocal();
      const streak = nextStreak(s.streak, today);
      return {
        ...s,
        mockResults: [...s.mockResults, result].slice(-100),
        streak,
      };
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    store.set((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const resetAll = useCallback(() => {
    store.reset();
  }, []);

  const stats = useMemo(() => {
    const total = state.attempts.length;
    const correct = state.attempts.filter((a) => a.wasCorrect).length;
    const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);
    const distinctAnswered = new Set(state.attempts.map((a) => a.questionId));
    const lastSeen = new Map<number, QuestionAttempt>();
    for (const a of state.attempts) lastSeen.set(a.questionId, a);
    let masteredCount = 0;
    for (const [, a] of lastSeen) if (a.wasCorrect) masteredCount += 1;
    return {
      totalAttempts: total,
      correctCount: correct,
      accuracy,
      distinctAnswered: distinctAnswered.size,
      mastered: masteredCount,
      coverage: Math.round((distinctAnswered.size / 128) * 100),
    };
  }, [state.attempts]);

  return {
    hydrated,
    state,
    stats,
    recordAnswer,
    toggleBookmark,
    setFlashcardKnown,
    recordMockResult,
    updateSettings,
    resetAll,
  };
}
