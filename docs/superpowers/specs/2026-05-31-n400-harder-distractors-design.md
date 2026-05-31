# Design Spec: N400 Quiz Distractors Realignment

## Goal
Improve the educational value of the N400 practice app by using close, manually authored, plausible distractors for multiple-choice questions, instead of the current dynamic approach of picking correct answers from unrelated questions in the same category.

---

## Architectural Changes

### 1. Synchronization Script
A script at `apps/website/scripts/n400-build-distractors.mjs` will parse the manual distractor definitions from `apps/website/supabase/migrations/n400_03_distractors.sql` and write them to a static TypeScript data module: `apps/website/src/lib/n400/distractors-data.ts`.

This script:
- Reads `apps/website/supabase/migrations/n400_03_distractors.sql`.
- Parses SQL INSERT statements to extract `(question_id, answer_en, answer_vi)`.
- Generates a static TypeScript mapping.
- Ensures offline/client-side capability.

### 2. Static Data Module
`apps/website/src/lib/n400/distractors-data.ts` will contain the parsed distractors.
```typescript
export interface N400Distractor {
  en: string;
  vi: string;
}

export const N400_DISTRACTORS: Record<number, N400Distractor[]> = {
  1: [
    { en: 'Monarchy', vi: 'Quân chủ' },
    { en: 'Direct democracy', vi: 'Dân chủ trực tiếp' },
    { en: 'Theocracy', vi: 'Thần quyền' },
    { en: 'Communist state', vi: 'Nhà nước cộng sản' },
    { en: 'Confederation', vi: 'Liên minh các bang (Confederation)' }
  ],
  // ... (for all 128 questions)
};
```

### 3. Quiz Engine Logic Updates
Update `buildOptions` in `apps/website/src/lib/n400/quiz-engine.ts` to integrate static distractors safely:
1. Retrieve correct answers using `correctAnswersFor(question, stateCode, districtNumber)`.
2. Extract candidates from `N400_DISTRACTORS[question.id]`.
3. **Collision Safety Filter**: Remove any distractor that matches the current question's correct answer (case-insensitive substring/equality comparison). This protects location-based questions (e.g., if a user's Senator is Bernie Sanders, Bernie Sanders will be filtered out of the distractors pool for Q23, avoiding double entries).
4. **Fallback mechanism**: If no static distractors are defined for a question, or if there are fewer than 3 distractors remaining after filtering, fall back to the old behavior (gathering candidate distractors from correct answers of other questions in the same category).
5. Shuffle options and assign IDs (A, B, C, D) as usual.

---

## Verification Plan

### 1. Run Automated Unit Tests
- Execute `pnpm test` in `apps/website` to run `quiz-engine.test.ts`.
- Ensure all existing and new test cases pass.

### 2. Manual Verification
- Run local development server (`npm run dev`) and test the Practice Mode.
- Verify option choices for questions like:
  - Q1 Form of Government (expect other forms of government).
  - Q7 Number of amendments (expect other numbers).
  - Q23 Senators, Q61 Governor, Q62 State Capital (expect location-based correct answer + other senators/governors/cities as distractors, with no duplication of correct answer).
