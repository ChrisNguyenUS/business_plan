// Pure types and date helpers shared by useN400UserState (Supabase-backed).
// The original localStorage React hook lived here; it was removed once every
// page swapped to useN400UserState. Kept the file rather than deleting because
// MockResult and the streak helper are still imported by the new hook + pages.

import type { StateCode } from './state-data';

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

// Address + resolved district from n400_user_profile. Populated only after
// the user completes /setup. All fields nullable so the profile page can
// render a "not set" state without crashing.
export interface UserAddress {
  city: string | null;
  stateCode: string | null;
  zipcode: string | null;
  districtNumber: number | null;
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
  address: UserAddress;
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
