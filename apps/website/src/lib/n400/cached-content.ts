// Phase 8 Task 3 — Tag-cached content reads.
//
// Today's runtime reads questions from a static TS bundle (questions-data.ts,
// auto-generated from docs/N400_questions_*.md). That made admin saves
// ineffective at runtime — the admin UI updated DB rows but the public app
// kept rendering the bundle. Phase 8 swaps the runtime path to these cached
// helpers so admin saves on n400_questions / n400_answers / n400_state_data /
// n400_representatives surface the next time the cache rolls.
//
// Cache keys live under the 'n400-content' tag. Admin server actions call
// updateTag('n400-content') after every mutation; this triggers an
// invalidation across all consumers below. The 1h soft revalidate is a
// safety net in case a future code path forgets the updateTag call.
//
// All helpers return DB-shape rows. Higher-level shape (N400Question with
// inlined answers) lives in the consumer modules so this file stays close
// to the schema.

import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

const N400_CONTENT_TAG = 'n400-content';

// Use the anon-key client here (no auth context needed — content tables
// are public-read, RLS already enforces deleted_at IS NULL filtering on
// anon SELECT). Doing this with createServerClient + cookies() would
// poison the cache key per request.
function publicReader() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

export interface DbQuestion {
  id: number;
  category: string;
  category_code: string | null;
  question_en: string;
  question_vi: string;
  question_audio_url: string | null;
  is_location_based: boolean;
}

export interface DbAnswer {
  id: string;
  question_id: number;
  answer_en: string;
  answer_vi: string;
  is_correct: boolean;
  answer_audio_url: string | null;
  display_order: number;
}

export interface DbLocationAnswer {
  question_id: number;
  state_code: string;
  answer_en: string;
  answer_vi: string;
  answer_audio_url: string | null;
}

export interface DbStateData {
  state_code: string;
  state_name_en: string;
  state_name_vi: string;
  governor_name: string;
  capital_city: string | null;
  senator_1: string | null;
  senator_2: string | null;
}

export interface DbRepresentative {
  state_code: string;
  district_number: number;
  rep_name: string;
  rep_audio_url: string | null;
}

export interface CachedN400Content {
  questions: DbQuestion[];
  answers: DbAnswer[];
  locationAnswers: DbLocationAnswer[];
  stateData: DbStateData[];
  representatives: DbRepresentative[];
}

// All four content tables in one cache slot. Single tag → single
// invalidation per admin save. Tradeoff: a bookmark-only edit (rare)
// rebuilds everything; absolute size is ~500KB JSON which is fine in
// memory. Splitting into per-table caches saves ~maybe 100ms p99 per
// admin save and adds complexity — defer until measured.
export const getAllN400Content = unstable_cache(
  async (): Promise<CachedN400Content> => {
    const supabase = publicReader();
    const [questionsRes, answersRes, locationRes, stateRes, repsRes] = await Promise.all([
      supabase
        .from('n400_questions')
        .select('id, category, category_code, question_en, question_vi, question_audio_url, is_location_based')
        .is('deleted_at', null)
        .order('id'),
      supabase
        .from('n400_answers')
        .select('id, question_id, answer_en, answer_vi, is_correct, answer_audio_url, display_order')
        .is('deleted_at', null)
        .order('question_id')
        .order('is_correct', { ascending: false })
        .order('display_order'),
      supabase
        .from('n400_location_answers')
        .select('question_id, state_code, answer_en, answer_vi, answer_audio_url'),
      supabase
        .from('n400_state_data')
        .select('state_code, state_name_en, state_name_vi, governor_name, capital_city, senator_1, senator_2')
        .order('state_code'),
      supabase
        .from('n400_representatives')
        .select('state_code, district_number, rep_name, rep_audio_url')
        .order('state_code')
        .order('district_number'),
    ]);
    return {
      questions: (questionsRes.data ?? []) as DbQuestion[],
      answers: (answersRes.data ?? []) as DbAnswer[],
      locationAnswers: (locationRes.data ?? []) as DbLocationAnswer[],
      stateData: (stateRes.data ?? []) as DbStateData[],
      representatives: (repsRes.data ?? []) as DbRepresentative[],
    };
  },
  ['n400-all-content'],
  { tags: [N400_CONTENT_TAG], revalidate: 3600 },
);

// Latest updated_at across the content tables. Used by /api/n400/content-version
// for the Service Worker's cache-busting key. Tagged so admin saves bump the
// version on the very next request after the cache rolls. Short revalidate (60s)
// because the SW polls this and we want it cheap; updateTag still wins.
export const getN400ContentVersion = unstable_cache(
  async (): Promise<string> => {
    const supabase = publicReader();
    // n400_questions has updated_at; n400_answers / n400_state_data /
    // n400_representatives don't. The mock-test admin path always touches
    // n400_questions on save, but bookmark/state edits won't bump it.
    // Hashing latest(updated_at, max(id)) catches inserts/deletes too.
    const [qRes, aRes] = await Promise.all([
      supabase
        .from('n400_questions')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('n400_answers')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const ts = qRes.data?.updated_at ?? '0';
    const lastAnswerId = aRes.data?.id ?? '0';
    return `${ts}:${lastAnswerId}`;
  },
  ['n400-content-version'],
  { tags: [N400_CONTENT_TAG], revalidate: 60 },
);
