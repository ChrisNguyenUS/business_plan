import { describe, it, expect } from 'vitest';
import { parseQuestionsMarkdown } from './parse-questions';

const EN = `## PART A: Principles of American Democracy
**1. What is the form of government of the United States?**
* Republic
* Constitution-based federal republic

**2. What is the supreme law of the land?**
* The (U.S.) Constitution
`;

const VI = `## PHẦN A: Các Nguyên Tắc Dân Chủ Hoa Kỳ
**1. Hình thức chính phủ của Hoa Kỳ là gì?**
* Cộng hòa
* Cộng hòa liên bang dựa trên Hiến pháp

**2. Luật tối cao của quốc gia là gì?**
* Hiến pháp
`;

describe('parseQuestionsMarkdown', () => {
  it('returns correct question count', () => {
    expect(parseQuestionsMarkdown(EN, VI)).toHaveLength(2);
  });

  it('parses id, EN question, VI question, category', () => {
    const q = parseQuestionsMarkdown(EN, VI)[0];
    expect(q.id).toBe(1);
    expect(q.question_en).toBe('What is the form of government of the United States?');
    expect(q.question_vi).toBe('Hình thức chính phủ của Hoa Kỳ là gì?');
    expect(q.category).toBe('Principles of American Democracy');
  });

  it('parses correct answers in both languages', () => {
    const q = parseQuestionsMarkdown(EN, VI)[0];
    expect(q.answers_en).toEqual(['Republic', 'Constitution-based federal republic']);
    expect(q.answers_vi).toEqual(['Cộng hòa', 'Cộng hòa liên bang dựa trên Hiến pháp']);
  });

  it('marks location-based questions (Q23, Q29, Q61, Q62)', () => {
    const q = parseQuestionsMarkdown(EN, VI)[0];
    expect(q.is_location_based).toBe(false);
  });
});
