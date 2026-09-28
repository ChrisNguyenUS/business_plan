import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// No DOM in vitest: pin the Full interview voice wiring by source (speaking spec §5.2).
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('useSpokenExam', () => {
  const hook = read('src/components/n400/oral/use-spoken-exam.ts');

  it('voice only in a voice run and for items that can be spoken; the rest stay multiple choice (Review Focus 2)', () => {
    expect(hook).toContain('const voiceHere = voice !== undefined && item !== null && canSpeak(item, location);');
  });

  it('confirm follows the mock rules: re-ask on unclear, retry once', () => {
    expect(hook).toContain('mockConfirm(current, text, itemInput, gradeSpokenItem(item, text, location).verdict)');
    expect(hook).toContain('mockRetry(itemInput)');
  });

  it('grades only at Next, with no verdict before (§5.1)', () => {
    const body = hook.slice(hook.indexOf('const settle'), hook.indexOf('return { wasCorrect, answer: current };'));
    expect(body).toContain("gradeSpokenItem(item, current.transcript, location).verdict === 'correct'");
    expect(body).toContain('trackOralAnswer(spokenAnswerEvent(item, current, wasCorrect, voice.context));');
  });

  it('a lost mic is latched by the page, so every remaining voice item types (Review Focus 3)', () => {
    expect(hook).toContain('voiceRunMicLost(voice.input, mic.error, mic.supported)');
    expect(hook).toContain('const micLost = (voice?.micLost ?? false) || lostNow;');
    expect(hook.match(/latchMicLost\(\);/g)).toHaveLength(3);
  });

  it('mic errors and re-asks carry the run context', () => {
    expect(hook).toContain('micErrorEvent(spokenQid(item), voice.context, micError, spokenSection(item))');
    expect(hook).toContain('mockReaskEvent(item, itemInput, next.retried, text, voice.context)');
  });
});

describe('SectionMCQuiz — exam voice run', () => {
  const quiz = read('src/components/n400/speaking/SectionMCQuiz.tsx');

  it('uses the exam hook only in exam mode', () => {
    expect(quiz).toContain('useSpokenExam({ itemId: examMode && q ? q.itemId : null, voice: examMode ? examVoice : undefined })');
  });

  it('answers through the Civics mock panel: Đúng vậy locks, Nói lại once, re-ask prompt', () => {
    expect(quiz).toMatch(/exam\.voiceHere \? \(\s*<MicAnswerPanel\s+key=\{q\.itemId\}\s+variant="mock"/);
    expect(quiz).toContain('canRetry={!exam.current?.retried}');
    expect(quiz).toContain("prompt={exam.current?.reask ? (exam.itemInput === 'typed' ? dict.oral.yesNoReaskTyped : dict.oral.yesNoReask) : undefined}");
  });

  it('grades at Next and hands the words to the page (Review Focus 4)', () => {
    expect(quiz).toContain('const settled = exam.settle();');
    expect(quiz).toContain(
      "onAnswer(q.itemId, settled.wasCorrect, undefined, settled.answer.input === 'typed' ? 'typed' : 'voice', settled.answer);",
    );
  });

  it('Next waits for Đúng vậy on a voice item and for a pick otherwise (Review Focus 2)', () => {
    expect(quiz).toContain('const examNextBlocked = examMode && (exam.voiceHere ? exam.current?.confirmed !== true : !selected);');
    expect(quiz).toContain('disabled={examNextBlocked}');
  });
});

describe('Full interview review — voice rows', () => {
  const review = read('src/app/n400ready/(app)/mock-test/full/ReviewAnswers.tsx');
  const vi = read('src/lib/n400/i18n/vi.ts');
  const en = read('src/lib/n400/i18n/en.ts');

  it('a voice row shows the words under "Bạn nói" / "Bạn trả lời" (Review Focus 4)', () => {
    expect(review.match(/userAnswer: a\.transcript \?\? a\.selectedEn \?\? null,/g)).toHaveLength(2);
    expect(review).toContain("a.transcript === undefined ? undefined : a.input === 'typed' ? rt.youTyped : rt.youSaid");
    expect(review).toContain("{item.answerLabel ?? (item.section === 'writing' ? rt.yourAnswer : rt.yourSelection)}");
    expect(vi).toContain("youSaid: 'Bạn nói',");
    expect(en).toContain("youSaid: 'You said',");
  });

  it('the review 🔊 can follow the iOS rules (Review Focus 5)', () => {
    expect(review).toMatch(/onBeforePlay=\{onBeforePlay\}\s+preferWebAudio=\{preferWebAudio\}/);
  });
});

describe('Phỏng vấn đầy đủ — voice run', () => {
  const page = read('src/app/n400ready/(app)/mock-test/full/page.tsx');

  it('offers "Toàn bộ bằng giọng" only when voice is available here, remembered for this test (Review Focus 1)', () => {
    expect(page).toContain('enabled: voiceFlags.speakingOn,');
    expect(page).toContain('{voiceAvailable || pickerPending ? (');
    expect(page).toContain('labels={{ choice: dict.oral.modeChoice, voice: dict.oral.fullModeVoice }}');
    expect(page).toContain("const FULL_MODE_KEY = 'n400.mock.full.answerMode';");
  });

  it('one choice at Bắt đầu covers the Civics and Speaking parts', () => {
    expect(page).toContain("setRunMode(answerMode === 'voice' && voiceAvailable ? 'voice' : 'choice');");
    expect(page.match(/examVoice=\{examVoice\}/g)).toHaveLength(2);
  });

  it('the mic-lost latch spans both parts and resets at Bắt đầu (Review Focus 3)', () => {
    expect(page).toContain('onMicLost: () => setMicLatched(true)');
    expect(page).toContain('setMicLatched(false);');
  });

  it('records how each part was answered, and the Civics words (Review Focus 4)', () => {
    expect(page).toContain('answerModeOf(civicsAnswers.current.map((a) => a.input))');
    expect(page).toContain(
      "recordSectionMockResult('speaking', passed, correct, FULL_SPEAKING_COUNT, answerModeOf(speakingAnswers.current.map((a) => a.input)))",
    );
    expect(page).toContain('...(transcript !== undefined ? { transcript } : {})');
  });

  it('the review 🔊 follows the iOS rules (Review Focus 5)', () => {
    expect(page).toMatch(/onBeforePlay=\{beforeAudio\}\s+preferWebAudio=\{mic\.sessionRunning\}/);
  });
});

describe('useSpokenExam resets its own mic (S4 final review)', () => {
  const hook = read('src/components/n400/oral/use-spoken-exam.ts');

  it('a new item never inherits the previous capture window, without relying on the practice hook', () => {
    expect(hook).toMatch(/useEffect\(\(\) => \{\s*resetMic\(\);\s*\}, \[itemId, resetMic\]\);/);
  });
});
