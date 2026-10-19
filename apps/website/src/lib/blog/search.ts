/** Words of a card, normalized: title words alone, and every searchable word. */
export interface SearchDoc {
  title: string[];
  all: string[];
}

/** Lowercase, drop Vietnamese accents (đ→d), keep letters and digits separated by single spaces. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const words = (text: string): string[] => (text ? normalize(text).split(" ").filter(Boolean) : []);

export function searchDoc(title: string, ...rest: string[]): SearchDoc {
  const t = words(title);
  return { title: t, all: [...t, ...rest.flatMap(words)] };
}

// True when a and b differ by at most one inserted, deleted or substituted character.
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

export function tokenMatchesWord(token: string, word: string): boolean {
  if (word.startsWith(token)) return true;
  if (token.length < 4) return false;
  return withinOneEdit(token, word) || withinOneEdit(token, word.slice(0, token.length));
}

const allMatch = (tokens: string[], ws: string[]) => tokens.every((tok) => ws.some((w) => tokenMatchesWord(tok, w)));

/** Items whose words match every query token; title matches first, input order otherwise. */
export function searchItems<T>(items: readonly T[], query: string, doc: (item: T) => SearchDoc): T[] {
  const tokens = words(query);
  if (tokens.length === 0) return [...items];
  const inTitle: T[] = [];
  const elsewhere: T[] = [];
  for (const item of items) {
    const d = doc(item);
    if (allMatch(tokens, d.title)) inTitle.push(item);
    else if (allMatch(tokens, d.all)) elsewhere.push(item);
  }
  return [...inTitle, ...elsewhere];
}
