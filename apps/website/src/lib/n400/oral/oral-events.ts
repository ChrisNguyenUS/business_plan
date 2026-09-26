// n400_oral_answer payloads (spec §9). Pure, so the pages only hand these to
// trackOralAnswer; mock verdicts come from the server finalize, never the client.

import type { OralAnswerEvent, OralSection } from '@/lib/n400/analytics';
import type { VoiceItem } from './mock-voice-items';
import type { MicError } from './speech-controller';
import type { OralVerdict } from './types';

/** Practice: a graded answer, a near answer the learner confirmed or denied, or a
 *  Yes/No answer that was neither (unclear → re-asked). */
export function practiceAnswerEvent(
  qid: number,
  input: 'mic' | 'typed',
  verdict: OralVerdict | 'unclear',
  confirmedNear: boolean | null,
  transcript: string,
  section: OralSection = 'civics',
): OralAnswerEvent {
  return {
    qid,
    section,
    context: 'practice',
    input,
    verdict,
    retried: null,
    confirmedNear,
    error: 'none',
    transcriptLength: transcript.length,
  };
}

/** A mic error while answering: no verdict, no transcript. Always `input: 'mic'`,
 *  since only the mic errors; the page's input has already flipped to 'typed'
 *  for the errors that kill the mic (micLost latch re-renders first). */
export function micErrorEvent(
  qid: number,
  context: 'practice' | 'mock',
  error: MicError,
  section: OralSection = 'civics',
): OralAnswerEvent {
  return { qid, section, context, input: 'mic', verdict: 'none', retried: null, confirmedNear: null, error, transcriptLength: 0 };
}

/** Mock: one event per spoken or typed item, verdicts from the server finalize.
 *  Multiple-choice items inside a voice mock (null items) send nothing. */
export function mockAnswerEvents(
  qids: readonly number[],
  items: readonly (VoiceItem | null)[],
  answers: readonly { qid: number; wasCorrect: boolean }[],
): OralAnswerEvent[] {
  const byQid = new Map(answers.map((a) => [a.qid, a.wasCorrect]));
  const events: OralAnswerEvent[] = [];
  qids.forEach((qid, i) => {
    const item = items[i];
    const wasCorrect = byQid.get(qid);
    if (!item || wasCorrect === undefined) return;
    events.push({
      qid,
      section: 'civics',
      context: 'mock',
      input: item.input,
      verdict: wasCorrect ? 'correct' : 'wrong',
      retried: item.retried,
      confirmedNear: null,
      error: 'none',
      transcriptLength: item.transcript.length,
    });
  });
  return events;
}
