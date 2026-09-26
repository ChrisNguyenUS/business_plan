import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// No DOM in vitest: pin the Thi thử Speaking voice wiring by source (speaking spec §5.1).
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('MockResultScreen — voice rows', () => {
  const screen = read('src/components/n400/MockResultScreen.tsx');

  it('a row can say "Bạn nói:" instead of the screen-wide label', () => {
    expect(screen).toMatch(/export interface MockResultRow \{[^}]*userAnswerLabel\?: string;/);
    expect(screen).toContain('{row.userAnswerLabel ?? effectiveUserAnswerLabel} ');
  });

  it("the rows' 🔊 can follow the iOS rules (Review Focus 3)", () => {
    expect(screen).toContain('onBeforePlay={onBeforePlay}');
    expect(screen).toContain('preferWebAudio={preferWebAudio}');
  });
});

describe('SpeakingMockIntro', () => {
  const intro = read('src/components/n400/speaking/SpeakingMockIntro.tsx');

  it('uses the Civics mock "Cách trả lời" picker', () => {
    expect(intro).toContain('{dict.oral.mockModeLabel}');
    expect(intro).toContain('labels={{ choice: dict.oral.modeChoice, voice: dict.oral.mockModeVoice }}');
  });

  it('describes this test with the existing strings and starts it', () => {
    expect(intro).toContain('const test = dict.mockTest.tests.speaking;');
    expect(intro).toContain('{dict.mockTest.intro.startButtonFirst}');
    expect(intro).toContain('onClick={onStart}');
  });
});

describe('Thi thử Speaking — voice run', () => {
  const page = read('src/app/n400ready/(app)/mock-test/speaking/page.tsx');

  it('offers voice with voice_speaking + support; without it the test starts directly (Review Focus 5)', () => {
    expect(page).toContain('enabled: voiceFlags.speakingOn,');
    expect(page).toContain("startedMode ?? (voiceFlags.loaded && !voiceAvailable ? 'choice' : null)");
    expect(page).toContain('<SpeakingMockIntro');
    expect(page).toContain('if (!voiceFlags.loaded) {');
  });

  it('remembers the choice for this test, and latches a direct start on the first pick (S8)', () => {
    expect(page).toContain("const SPEAKING_MOCK_MODE_KEY = 'n400.mock.speaking.answerMode';");
    expect(page).toContain('window.localStorage.setItem(SPEAKING_MOCK_MODE_KEY, m);');
    expect(page.match(/if \(startedMode === null\) setStartedMode\('choice'\);/g)).toHaveLength(2);
  });

  it('answers through the Civics mock panel; a re-ask or a mic error keeps the retry (Review Focus 1, 2)', () => {
    expect(page).toMatch(/<MicAnswerPanel\s+key=\{item\.id\}\s+variant="mock"/);
    expect(page).toContain('canRetry={!current?.retried}');
    expect(page).toContain('prompt={current?.reask ? dict.oral.yesNoReask : undefined}');
    expect(page).toContain('mockConfirm(current, text, itemInput, gradeSpokenItem(spoken, text, location).verdict)');
  });

  it('a lost mic types the rest of the test; in-app browsers type from the start (Review Focus 2)', () => {
    expect(page).toContain("const lostNow = runMode === 'voice' && voiceRunMicLost(voiceInput, mic.error, mic.supported);");
    expect(page).toContain('const micLost = micLatched || lostNow;');
    expect(page).toContain('const itemInput = mockItemInput(voiceInput, micLost);');
    expect(page.match(/latchMicLost\(\);/g)).toHaveLength(3);
  });

  it('grades at the finish and records the run once, with how it was answered (Review Focus 4)', () => {
    expect(page).toContain('const graded = gradeSpokenMock(spokenItems, voiceAnswers, location);');
    expect(page).toContain(
      "void recordSectionMockResult('speaking', graded.score >= PASS_THRESHOLD, graded.score, TOTAL, graded.answerMode);",
    );
    expect(page).toContain('for (const e of speakingMockAnswerEvents(spokenItems, voiceAnswers, graded.ok)) trackOralAnswer(e);');
    expect(page).toContain("trackOralAnswer(micErrorEvent(spokenQid(spoken), 'mock', micError, spokenSection(spoken)));");
  });

  it('every 🔊 uses the iOS rules; the slow 🔊 never plays in a voice run or over an open session (Review Focus 3)', () => {
    expect(page.match(/onBeforePlay=\{audio\.onBeforePlay\}/g)).toHaveLength(2);
    expect(page.match(/preferWebAudio=\{audio\.preferWebAudio\}/g)).toHaveLength(2);
    expect(page.match(/\{audio\.showSlow \? \(/g)).toHaveLength(2);
    expect(page).toContain("showSlow: runMode !== 'voice' && !mic.sessionRunning(),");
    expect(page).toContain("if (mic.state === 'listening') resetMic();");
    expect(page).toMatch(/onBeforePlay=\{beforeAudio\}\s+preferWebAudio=\{mic\.sessionRunning\}/);
  });

  it('result rows say "Bạn nói:" / "Bạn trả lời:"', () => {
    expect(page).toContain("userAnswerLabel: answer?.input === 'typed' ? dict.oral.youTyped : dict.oral.youSaid,");
  });
});
