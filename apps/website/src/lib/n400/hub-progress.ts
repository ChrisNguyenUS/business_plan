// Pure helpers behind the hubs' "Tiếp tục học" card. "Seen" is skill-specific
// (civics: attempted question ids; sections: deriveSectionSeen) — callers pass
// a predicate so this file stays data-agnostic.

export interface HubProgress {
  seenCount: number;
  totalCount: number;
  /** 0–100, rounded. */
  percent: number;
  /** Display number of the first unseen item; null when everything is seen. */
  nextNumber: number | null;
  started: boolean;
}

export function deriveHubProgress<T>(
  items: readonly T[],
  isSeen: (item: T) => boolean,
  numberOf: (item: T) => number,
): HubProgress {
  const seenCount = items.filter(isSeen).length;
  const firstUnseen = items.find((it) => !isSeen(it));
  return {
    seenCount,
    totalCount: items.length,
    percent: items.length === 0 ? 0 : Math.round((seenCount / items.length) * 100),
    nextNumber: firstUnseen === undefined ? null : numberOf(firstUnseen),
    started: seenCount > 0,
  };
}

/** Stable "continue" ordering: unseen items first, then seen — original order kept. */
export function continueOrder<T>(items: readonly T[], isSeen: (item: T) => boolean): T[] {
  return [...items.filter((it) => !isSeen(it)), ...items.filter(isSeen)];
}
