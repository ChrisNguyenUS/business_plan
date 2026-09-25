import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Spec §10: the Privacy Policy (EN/VI) covers voice answers, incl. the always-on iPhone mic (D15).
const page = readFileSync(join(process.cwd(), 'src/app/[locale]/privacy-policy/page.tsx'), 'utf8');

describe('privacy policy — voice answers (spec §10)', () => {
  it('has a linkable voice section', () => {
    expect(page).toContain('<section id="voice-answers">');
  });

  it('says audio is never stored (EN + VI)', () => {
    expect(page).toContain('N400Ready never records or stores audio.');
    expect(page).toContain('N400Ready không bao giờ ghi âm hay lưu âm thanh.');
  });

  // Final review: D15 covers every iOS device (isIOSDevice), iPad included.
  it('discloses the always-on iPhone and iPad microphone (D15, EN + VI)', () => {
    expect(page).toContain('On iPhone and iPad, while you use voice answers, the microphone stays on between questions');
    expect(page).toContain('Trên iPhone và iPad, khi bạn trả lời bằng giọng, micro bật suốt giữa các câu hỏi');
  });
});

describe('in-app hint names iPad too (polish pass, D15)', () => {
  const vi = readFileSync(join(process.cwd(), 'src/lib/n400/i18n/vi.ts'), 'utf8');
  const en = readFileSync(join(process.cwd(), 'src/lib/n400/i18n/en.ts'), 'utf8');
  it('hintPersistent says iPhone and iPad', () => {
    expect(vi).toContain("hintPersistent: 'Trên iPhone và iPad,");
    expect(en).toContain("hintPersistent: 'On iPhone and iPad,");
  });
});

describe('privacy copy precision (polish pass)', () => {
  it('says the answer may include words started just before the tap (EARLY_WORDS_MS)', () => {
    expect(page).toContain('including words you had just started saying');
    expect(page).toContain('kể cả những chữ bạn vừa bắt đầu nói ngay trước đó');
  });

  it('names the sample review of stored mock text (spec §9/§13)', () => {
    expect(page).toContain('our team may review a small sample of this text to improve how answers are recognized');
    expect(page).toContain('nhóm của chúng tôi có thể xem lại một phần nhỏ để cải thiện việc nhận dạng câu trả lời');
  });
});
