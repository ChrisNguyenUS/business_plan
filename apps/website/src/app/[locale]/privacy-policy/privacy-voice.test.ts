import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Spec §10: the Privacy Policy (EN/VI) covers voice answers, incl. the always-on iPhone mic (D15).
const page = readFileSync(join(process.cwd(), 'src/app/[locale]/privacy-policy/page.tsx'), 'utf8');

describe('privacy policy — voice answers (spec §10, owner wording 2026-09-25)', () => {
  it('has a linkable voice section', () => {
    expect(page).toContain('<section id="voice-answers">');
  });

  it('says audio is never recorded or stored (EN + VI)', () => {
    expect(page).toContain('N400Ready does not record or store your audio.');
    expect(page).toContain('N400Ready không ghi âm hoặc lưu trữ âm thanh của bạn.');
  });

  it('discloses the always-on iPhone and iPad microphone (D15, EN + VI)', () => {
    expect(page).toContain('On iPhone and iPad, voice-answer mode may keep the microphone active between questions');
    expect(page).toContain('Trên iPhone và iPad, chế độ trả lời bằng giọng nói có thể giữ microphone hoạt động giữa các câu hỏi');
  });

  it('names the sample review of stored mock text (spec §9/§13)', () => {
    expect(page).toContain('A small sample of answer text may be reviewed by our team to improve answer recognition.');
    expect(page).toContain('Một phần nhỏ nội dung câu trả lời có thể được nhóm của chúng tôi xem xét để cải thiện khả năng nhận diện câu trả lời.');
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
