// Minimal ambient types for the untyped `edit-distance` npm package.
// We only use the Levenshtein (string) variant with numeric cost functions.
declare module 'edit-distance' {
  interface Levenshtein {
    distance: number;
    pairs(): [string | null, string | null][];
    alignment(): { alignmentA: (string | null)[]; alignmentB: (string | null)[] };
  }

  export function levenshtein(
    stringA: string,
    stringB: string,
    insert: (node: string) => number,
    remove: (node: string) => number,
    update: (a: string, b: string) => number,
  ): Levenshtein;
}
