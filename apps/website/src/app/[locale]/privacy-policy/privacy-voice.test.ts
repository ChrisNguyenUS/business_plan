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

  it('discloses the always-on iPhone microphone (D15, EN + VI)', () => {
    expect(page).toContain('On iPhone, while you use voice answers, the microphone stays on between questions');
    expect(page).toContain('Trên iPhone, khi bạn trả lời bằng giọng, micro bật suốt giữa các câu hỏi');
  });
});
