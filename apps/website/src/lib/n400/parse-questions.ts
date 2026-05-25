export interface ParsedQuestion {
  id: number;
  category: string;
  question_en: string;
  question_vi: string;
  answers_en: string[];
  answers_vi: string[];
  is_location_based: boolean;
}

const LOCATION_BASED_IDS = new Set([23, 29, 61, 62]);

function extractCategory(line: string): string | null {
  const match = line.match(/^##\s+(?:PART|PHẦN)\s+\w+:\s+(.+)/);
  return match ? match[1].trim() : null;
}

function extractQuestion(line: string): { id: number; text: string } | null {
  const match = line.match(/^\*\*(\d+)\.\s+(.+?)\*\*$/);
  if (!match) return null;
  return { id: parseInt(match[1], 10), text: match[2].trim() };
}

function extractAnswer(line: string): string | null {
  const match = line.match(/^\*\s+(.+)/);
  return match ? match[1].trim() : null;
}

interface RawEntry {
  category: string;
  question: string;
  answers: string[];
}

function parseOneLang(markdown: string): Map<number, RawEntry> {
  const result = new Map<number, RawEntry>();
  let currentCategory = '';
  let currentId: number | null = null;
  let currentQuestion = '';
  let currentAnswers: string[] = [];

  const flush = () => {
    if (currentId !== null) {
      result.set(currentId, {
        category: currentCategory,
        question: currentQuestion,
        answers: currentAnswers,
      });
    }
  };

  for (const raw of markdown.split('\n')) {
    const line = raw.trim();

    const cat = extractCategory(line);
    if (cat) {
      currentCategory = cat;
      continue;
    }

    const q = extractQuestion(line);
    if (q) {
      flush();
      currentId = q.id;
      currentQuestion = q.text;
      currentAnswers = [];
      continue;
    }

    const ans = extractAnswer(line);
    if (ans && currentId !== null) currentAnswers.push(ans);
  }
  flush();
  return result;
}

export function parseQuestionsMarkdown(
  enMarkdown: string,
  viMarkdown: string
): ParsedQuestion[] {
  const enMap = parseOneLang(enMarkdown);
  const viMap = parseOneLang(viMarkdown);
  const results: ParsedQuestion[] = [];

  for (const [id, en] of enMap) {
    const vi = viMap.get(id);
    if (!vi) throw new Error(`Missing VI translation for question ${id}`);
    results.push({
      id,
      category: en.category,
      question_en: en.question,
      question_vi: vi.question,
      answers_en: en.answers,
      answers_vi: vi.answers,
      is_location_based: LOCATION_BASED_IDS.has(id),
    });
  }

  return results.sort((a, b) => a.id - b.id);
}
