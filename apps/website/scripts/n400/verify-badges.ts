// Phase 6B verification script for badges system.
// Run with: npx tsx scripts/n400/verify-badges.ts
//
// Cross-checks the four invariants we care about:
//   1. All 24 expected badge PNGs exist at public/images/n400/badges/<slug>.png
//   2. n400_badges has exactly 24 active rows after seed
//   3. Every catalog slug has a registered evaluator in BADGE_EVALUATORS
//   4. Every registered evaluator has a corresponding catalog row
//
// Doubles as a manual recompute driver: pass --recompute <userId> to
// run all 24 evaluators for that user with trigger='manual_recompute'.
// Useful for backfilling existing users when this phase first ships.

import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { BADGE_EVALUATORS } from '../../src/lib/n400/badges/registry';
import { evaluateBadges } from '../../src/lib/n400/badges/evaluator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BADGES_DIR = join(process.cwd(), 'public', 'images', 'n400', 'badges');

const EXPECTED_SLUGS = [
  'streak-3', 'streak-7', 'streak-14', 'streak-30', 'streak-60', 'streak-100',
  'onboarding-first-session', 'mock-pass-first', 'mock-pass-five',
  'mock-high-score', 'mock-perfect', 'mock-comeback',
  'correct-answers-100', 'flashcards-mastery', 'all-128-answered', 'sessions-100',
  'practice-sessions-10', 'practice-sessions-30', 'sessions-50',
  'category-democracy', 'category-government', 'category-rights',
  'category-history', 'category-symbols',
];

const fail: string[] = [];
const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const bad = (msg: string) => {
  console.log(`  ✗ ${msg}`);
  fail.push(msg);
};

async function check(label: string, fn: () => Promise<void>): Promise<void> {
  console.log(`\n${label}`);
  await fn();
}

async function main() {
  await check('1. PNG assets', async () => {
    for (const slug of EXPECTED_SLUGS) {
      const path = join(BADGES_DIR, `${slug}.png`);
      if (existsSync(path)) ok(`${slug}.png present`);
      else bad(`${slug}.png missing`);
    }
  });

  await check('2. n400_badges catalog', async () => {
    const { data, error } = await supabase
      .from('n400_badges')
      .select('slug, is_active')
      .order('slug');
    if (error) {
      bad(`query failed: ${error.message}`);
      return;
    }
    const active = (data ?? []).filter((r) => r.is_active);
    if (active.length === 24) ok(`24 active catalog rows`);
    else bad(`expected 24 active, got ${active.length}`);

    const seenSlugs = new Set(active.map((r) => r.slug));
    for (const slug of EXPECTED_SLUGS) {
      if (seenSlugs.has(slug)) ok(`catalog has ${slug}`);
      else bad(`catalog missing ${slug}`);
    }
    for (const slug of seenSlugs) {
      if (!EXPECTED_SLUGS.includes(slug)) bad(`unexpected catalog slug: ${slug}`);
    }
  });

  await check('3. Evaluator registry covers every catalog slug', async () => {
    const registered = new Set(Object.keys(BADGE_EVALUATORS));
    for (const slug of EXPECTED_SLUGS) {
      if (registered.has(slug)) ok(`evaluator registered for ${slug}`);
      else bad(`no evaluator for ${slug}`);
    }
    for (const slug of registered) {
      if (!EXPECTED_SLUGS.includes(slug)) bad(`evaluator without catalog row: ${slug}`);
    }
  });

  await check('4. Question category_code backfill', async () => {
    const { count, error } = await supabase
      .from('n400_questions')
      .select('id', { count: 'exact', head: true })
      .is('category_code', null);
    if (error) {
      bad(`query failed: ${error.message}`);
      return;
    }
    if (count === 0) ok('all 128 questions have category_code set');
    else bad(`${count} questions missing category_code`);
  });

  // Optional manual recompute for one user.
  const idx = process.argv.indexOf('--recompute');
  if (idx !== -1 && process.argv[idx + 1]) {
    const userId = process.argv[idx + 1];
    await check(`5. manual_recompute for user ${userId}`, async () => {
      const newSlugs = await evaluateBadges(userId, { trigger: 'manual_recompute' }, supabase);
      if (newSlugs.length === 0) ok('no new unlocks (user already up-to-date or no qualifying activity)');
      else ok(`unlocked ${newSlugs.length} new badges: ${newSlugs.join(', ')}`);
    });
  }

  if (fail.length > 0) {
    console.log(`\n❌ ${fail.length} issue(s) found.`);
    process.exit(1);
  }
  console.log('\n✅ All checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
