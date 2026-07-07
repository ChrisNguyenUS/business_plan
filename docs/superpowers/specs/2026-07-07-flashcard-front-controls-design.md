# Design Spec: Flashcard Front Controls & Flip Hint Improvement

This specification outlines the changes required to display the study mastery buttons ("Chưa thuộc" and "Đã thuộc") directly on the front face of flashcards, and to make the tap-to-flip interaction instructions larger and clearer with a pointing icon.

## Proposed Changes

### 1. Always-On Study Controls
In [page.tsx](file:///Users/anhnguyen/Obsidian/Business%20planning/apps/website/src/app/[locale]/n400app/flashcards/page.tsx), we will modify the bottom study controls so that the two buttons **Chưa thuộc** and **Đã thuộc** are always visible at the bottom of the card, regardless of whether the card is flipped (`flipped === true` or `flipped === false`).

We will remove the conditional branch that renders the "Flip Card" button. Since the card itself can be clicked to flip (and Space can be pressed), the explicit "Flip Card" button is redundant once the mastery buttons are always available.

### 2. Enhanced Flip Hint Text
We will improve the hint text on both sides of the card to make the click-to-flip interaction prominent and highly discoverable.

#### Front Face: [FlashcardFront.tsx](file:///Users/anhnguyen/Obsidian/Business%20planning/apps/website/src/components/n400/flashcard/FlashcardFront.tsx)
- **Text:** Change from `"Nhấn vào thẻ để xem đáp án"` to `"Nhấn vào thẻ để xem đáp án"` (in uppercase/lowercase as styled) but styled larger and with higher contrast.
- **Icon:** Add Lucide's `Pointer` icon alongside the text.
- **Style:**
  - Increase text size from `text-[clamp(0.5rem,0.8vw,0.7rem)]` (approx 8-11px) to `text-[clamp(0.75rem,1.2vw,0.9rem)]` (approx 12-14px).
  - Use `text-slate-400` instead of `text-slate-300` for better legibility (contrast).
  - Arrange elements in a flex row with a small gap and center-aligned.

#### Back Face: [FlashcardBack.tsx](file:///Users/anhnguyen/Obsidian/Business%20planning/apps/website/src/components/n400/flashcard/FlashcardBack.tsx)
- **Text:** Change from `"Nhấn lại để quay về câu hỏi"`.
- **Icon:** Add Lucide's `Pointer` icon alongside the text.
- **Style:**
  - Increase text size to match the front side: `text-[clamp(0.75rem,1.2vw,0.9rem)]`.
  - Use `text-teal-500` instead of `text-teal-400` for better legibility.
  - Arrange elements in a flex row with a small gap and center-aligned.

## Verification Plan

### Automated Checks
- Run `pnpm run type-check` in the website directory to ensure imports (especially `Pointer` from `lucide-react`) are correct and compile successfully.
- Run `pnpm run lint` to ensure ESLint rules are met.

### Manual Verification
- Load the application in a local browser.
- Verify that both the front and back of the cards show "Chưa thuộc" and "Đã thuộc" buttons at the bottom.
- Confirm that the hint text is larger, clearer, and features the pointer hand icon on both sides.
- Verify that clicking the card body flips it correctly.
- Verify that clicking "Chưa thuộc" / "Đã thuộc" on the front/back side saves the state and automatically advances to the next card (if available).
