const WORDS_PER_MINUTE = 200;

/** Estimated reading time of a Markdown body in whole minutes (at least 1). */
export function readingMinutes(markdown: string): number {
  const text = markdown.replace(/\]\([^)]*\)/g, "]");
  const words = text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
