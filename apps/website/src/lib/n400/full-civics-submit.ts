// The Civics part of Phỏng vấn đầy đủ is graded by the server (RLS hardening
// spec §2.4): what to send, how to read the server's verdicts, and the one-retry
// save that runs in the background while the learner moves on.

import type { QuizOption } from './quiz-engine';
import type { SpokenMockAnswer } from './oral/spoken-mock';
import type { VoiceMockAnswer } from './oral/grade-voice-mock';

/** One answered Civics item as the exam reported it. */
export interface FullCivicsInput {
  questionId: number;
  selectedId?: QuizOption['id'];
  spoken?: SpokenMockAnswer;
}

export type FullCivicsSubmission =
  | { mode: 'voice'; answers: VoiceMockAnswer[] }
  | { mode: 'choice'; picks: { questionId: number; selectedOption: QuizOption['id'] }[] };

/** A voice run sends words (or a pick for questions without an oral config) to
 *  the voice finalize; a choice run sends picks. An item with neither is left
 *  out, so the server grades it wrong, like the standalone mock. */
export function fullCivicsSubmission(
  runMode: 'voice' | 'choice',
  inputs: readonly FullCivicsInput[],
): FullCivicsSubmission {
  if (runMode === 'voice') {
    const answers: VoiceMockAnswer[] = [];
    for (const { questionId, selectedId, spoken } of inputs) {
      if (spoken) {
        answers.push({ qid: questionId, transcript: spoken.transcript, retried: spoken.retried, input: spoken.input });
      } else if (selectedId) {
        answers.push({ qid: questionId, selected: selectedId });
      }
    }
    return { mode: 'voice', answers };
  }
  return {
    mode: 'choice',
    picks: inputs.flatMap(({ questionId, selectedId }) =>
      selectedId ? [{ questionId, selectedOption: selectedId }] : [],
    ),
  };
}

/** Right/wrong per question from the finalize result: the voice finalize returns
 *  its verdicts; a choice run compares each pick with the server's answer key. */
export function serverVerdicts(
  submission: FullCivicsSubmission,
  result: {
    manifest: readonly { qid: number; correct: QuizOption['id'] }[];
    answers?: readonly { qid: number; wasCorrect: boolean }[];
  },
): Map<number, boolean> {
  if (submission.mode === 'voice') {
    return new Map((result.answers ?? []).map((a) => [a.qid, a.wasCorrect]));
  }
  const correct = new Map(result.manifest.map((m) => [m.qid, m.correct]));
  return new Map(submission.picks.map((p) => [p.questionId, correct.get(p.questionId) === p.selectedOption]));
}

export type CivicsSaveStatus = 'saving' | 'saved' | 'failed' | 'unsaved';

export interface CivicsSave {
  /** The summary opened: a save that failed — now or later — gets exactly one retry. */
  retryIfFailed(): void;
}

/** Runs `save` at once. A failure waits for the summary; the summary triggers one
 *  retry; a failed retry ends as 'unsaved'. */
export function startCivicsSave<T>(
  save: () => Promise<T>,
  onChange: (status: CivicsSaveStatus, result?: T) => void,
): CivicsSave {
  let status: CivicsSaveStatus = 'saving';
  let retried = false;
  let summaryOpen = false;
  const set = (next: CivicsSaveStatus, result?: T) => {
    status = next;
    onChange(next, result);
  };
  const attempt = () => {
    set('saving');
    save().then(
      (result) => set('saved', result),
      () => {
        if (retried) {
          set('unsaved');
        } else if (summaryOpen) {
          retried = true;
          attempt();
        } else {
          set('failed');
        }
      },
    );
  };
  attempt();
  return {
    retryIfFailed() {
      summaryOpen = true;
      if (status === 'failed' && !retried) {
        retried = true;
        attempt();
      }
    },
  };
}
