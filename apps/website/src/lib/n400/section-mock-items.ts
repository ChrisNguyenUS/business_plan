// Per-item rows for the Speaking and Writing mocks — standalone and the Full
// interview's parts (owner decision 2026-10-08, B′). Like the Civics mock's
// question rows they are graded (mode 'mock_test', study-tip spec D1): a miss
// joins "Ôn câu sai" and a right answer counts toward "thuộc".

import type { AnswerMode } from './attempt-row';
import type { SectionKey } from './section-progress';

export interface SectionMockItem {
  section: SectionKey;
  itemId: string;
  wasCorrect: boolean;
  answerMode?: AnswerMode;
}

/** 'wm-<n>' → whatmean, 'yn-<n>' → yesno, 'wr-<n>' → writing; anything else is not a section item. */
export function sectionOfItem(itemId: string): SectionKey | null {
  if (itemId.startsWith('wm-')) return 'whatmean';
  if (itemId.startsWith('yn-')) return 'yesno';
  if (itemId.startsWith('wr-')) return 'writing';
  return null;
}

/** Speaking answers → rows. A spoken item keeps how it was answered (mic → voice,
 *  typed → typed); a picked one leaves answer_mode to its 'choice' default. */
export function speakingMockItems(
  answers: readonly { itemId: string; wasCorrect: boolean; input?: 'mic' | 'typed' }[],
): SectionMockItem[] {
  return answers.flatMap(({ itemId, wasCorrect, input }): SectionMockItem[] => {
    const section = sectionOfItem(itemId);
    if (!section) return [];
    return [{ section, itemId, wasCorrect, ...(input ? { answerMode: input === 'mic' ? 'voice' : 'typed' } : {}) }];
  });
}

/** Writing dictation verdicts → rows. */
export function writingMockItems(perItem: readonly { sentenceId: string; correct: boolean }[]): SectionMockItem[] {
  return perItem.map(({ sentenceId, correct }) => ({ section: 'writing', itemId: sentenceId, wasCorrect: correct }));
}
