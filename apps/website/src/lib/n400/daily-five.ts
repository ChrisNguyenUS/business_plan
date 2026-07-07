// Deterministic "Daily 5" selection for the Speaking/Writing sections.
// Seeded by `${section}:${localDate}` so the set is stable all day (reloads
// never re-roll) and differs across sections and days. Priority: unseen →
// learning (seen but not known) → mastered; when at least `count` items are
// still unmastered and something IS mastered, exactly one slot is reserved
// for review so every day mixes in old material.

function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: readonly T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dailyFiveSelection(
  allIds: readonly string[],
  known: ReadonlySet<string>,
  seen: ReadonlySet<string>,
  seedKey: string,
  count = 5,
): string[] {
  const rand = mulberry32(hashSeed(seedKey));
  const unseen = allIds.filter((id) => !seen.has(id) && !known.has(id));
  const learning = allIds.filter((id) => seen.has(id) && !known.has(id));
  const mastered = allIds.filter((id) => known.has(id));

  const target = Math.min(count, allIds.length);
  const reviewSlots =
    mastered.length > 0 && unseen.length + learning.length >= target ? 1 : 0;

  const picks: string[] = [];
  const fresh = [...seededShuffle(unseen, rand), ...seededShuffle(learning, rand)];
  for (const id of fresh) {
    if (picks.length >= target - reviewSlots) break;
    picks.push(id);
  }
  for (const id of seededShuffle(mastered, rand)) {
    if (picks.length >= target) break;
    picks.push(id);
  }
  return picks;
}
