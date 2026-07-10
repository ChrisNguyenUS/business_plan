// Question builders + pass rules for Phỏng vấn đầy đủ (/mock-test/full):
// the three standalone mock formats chained into one sitting. Speaking stays
// multiple-choice — no speech-to-text. Type-only import from SectionMCQuiz
// keeps the runtime dependency direction lib → data.

import { WHATMEAN_QUESTIONS } from './whatmean-data';
import { YESNO_QUESTIONS } from './yesno-data';
import { WRITING_SENTENCES, type WritingSentence } from './writing-data';
import { buildWhatMeanOptions } from './whatmean-options';
import {
  buildOptions,
  correctAnswersFor,
  selectMockTestQuestions,
  shuffle,
  questionAudioUrl,
  whatMeanQuestionAudioUrl,
  whatMeanAnswerAudioUrl,
  yesNoAudioUrl,
} from './quiz-engine';
import type { StateCode } from './state-data';
import type { MCQuestion } from '@/components/n400/speaking/SectionMCQuiz';

export const FULL_CIVICS_COUNT = 20;
export const FULL_CIVICS_PASS = 12; // 12/20 USCIS rule
export const FULL_SPEAKING_COUNT = 10; // 5 What Mean + 5 Yes/No
export const FULL_SPEAKING_PASS = 8;
export const FULL_WRITING_COUNT = 3;
export const FULL_WRITING_PASS = 1; // write 1 of 3 correctly

export function buildCivicsPhase(
  seed: string,
  stateCode: StateCode,
  districtNumber: number | null,
): MCQuestion[] {
  return selectMockTestQuestions(seed).map((q, i) => {
    const located = correctAnswersFor(q, stateCode, districtNumber);
    const accepted =
      located.length > 0 ? located : q.answersEn.map((en, j) => ({ en, vi: q.answersVi[j] ?? en }));
    return {
      itemId: `civ-${q.id}`,
      badge: `Civics · Câu hỏi #${q.id}`,
      headerEn: q.questionEn,
      headerVi: q.questionVi,
      questionAudioSrc: questionAudioUrl(q.id),
      answerAudioSrc: null,
      options: buildOptions(q, stateCode, `full-${seed}-${i}`, districtNumber),
      accepted,
    };
  });
}

export function buildSpeakingPhase(seed: string): MCQuestion[] {
  const whatMean = shuffle([...WHATMEAN_QUESTIONS], `full-sp-wm-${seed}`)
    .slice(0, 5)
    .map((q, i): MCQuestion => ({
      itemId: q.id,
      badge: `Speaking · What Mean #${q.num}`,
      headerEn: q.termEn,
      headerVi: q.questionVi,
      questionAudioSrc: whatMeanQuestionAudioUrl(q.num),
      answerAudioSrc: whatMeanAnswerAudioUrl(q.num),
      options: buildWhatMeanOptions(q, `full-${seed}-${i}`).map((o) => ({
        id: o.id,
        en: o.text,
        vi: '',
        isCorrect: o.isCorrect,
      })),
      accepted: [{ en: q.definitionEn, vi: q.definitionVi }],
    }));

  const yesNo = shuffle([...YESNO_QUESTIONS], `full-sp-yn-${seed}`)
    .slice(0, 5)
    .map((q): MCQuestion => {
      const audio = yesNoAudioUrl(q.num);
      return {
        itemId: q.id,
        badge: `Speaking · Yes/No #${q.num}`,
        headerEn: q.questionEn,
        headerVi: q.questionVi,
        questionAudioSrc: audio,
        answerAudioSrc: audio,
        options: [
          { id: 'A', en: 'Yes, officer', vi: 'Có', isCorrect: q.answer === 'yes' },
          { id: 'B', en: 'No, officer', vi: 'Không', isCorrect: q.answer === 'no' },
        ],
        accepted: [
          {
            en: q.answer === 'yes' ? 'Yes, officer' : 'No, officer',
            vi: q.answer === 'yes' ? 'Có, thưa cán bộ' : 'Không, thưa cán bộ',
          },
        ],
      };
    });

  return [...whatMean, ...yesNo];
}

export function buildWritingPhase(seed: string): WritingSentence[] {
  return shuffle([...WRITING_SENTENCES], `full-wr-${seed}`).slice(0, FULL_WRITING_COUNT);
}
