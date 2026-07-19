// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Flashcard } from './Flashcard';
import { N400LangProvider } from '@/lib/n400/i18n/provider';
import { vi as viDict } from '@/lib/n400/i18n/vi';

// Flashcard reads its labels (aria-label="Lật thẻ", etc.) from the i18n dict
// via useN400Lang(), so every render needs the provider in the tree.
function renderWithLang(ui: ReactElement) {
  return render(<N400LangProvider lang="vi" dict={viDict}>{ui}</N400LangProvider>);
}

// The bug: the 3D rotating container persisted across question changes, so
// resetting `flipped` while navigating to the next card ran the 500ms flip
// transition on the SAME element — flashing the answer face of the incoming
// card mid-navigation. The rotor must be remounted (new DOM node) whenever
// the question changes, and kept (same DOM node) when only `flipped` changes.
const baseProps = {
  onFlip: () => {},
  questionEn: 'What is the supreme law of the land?',
  questionVi: 'Luật tối cao của quốc gia là gì?',
  questionAudioSrc: null,
  answerAudioSrc: null,
  answers: [{ en: 'the Constitution', vi: 'Hiến pháp' }],
};

// The rotating element is the immediate child of the flip button.
const rotor = (container: HTMLElement) =>
  container.querySelector('[aria-label="Lật thẻ"]')!.firstElementChild!;

describe('Flashcard flip vs navigation', () => {
  it('keeps the same rotating element when the same card flips (flip stays animated)', () => {
    const { container, rerender } = renderWithLang(
      <Flashcard {...baseProps} questionId={1} flipped={false} />,
    );
    const before = rotor(container);
    rerender(<N400LangProvider lang="vi" dict={viDict}><Flashcard {...baseProps} questionId={1} flipped /></N400LangProvider>);
    expect(rotor(container)).toBe(before);
  });

  it('remounts the rotating element when the question changes (no unflip animation can leak the opposite face)', () => {
    const { container, rerender } = renderWithLang(
      <Flashcard {...baseProps} questionId={1} flipped />,
    );
    const before = rotor(container);
    rerender(<N400LangProvider lang="vi" dict={viDict}><Flashcard {...baseProps} questionId={2} flipped={false} /></N400LangProvider>);
    expect(rotor(container)).not.toBe(before);
  });

  // The mid-flip face swap hides a face by flipping the WRAPPER's
  // (inherited) `visibility`. Any descendant with `transition-all`
  // re-animates that inherited change and stays painted ~300ms past the
  // swap — the "opposite face" flash (verified in real Chrome). Two
  // guards: the wrapper must ALSO gate with `opacity` (not inherited —
  // descendants cannot counteract an ancestor's opacity), and the face
  // components must never use `transition-all`.
  it('gates the hidden face with opacity + pointer-events, not just visibility', () => {
    const { container } = renderWithLang(
      <Flashcard {...baseProps} questionId={1} flipped />,
    );
    const front = rotor(container).children[0] as HTMLElement;
    const back = rotor(container).children[1] as HTMLElement;
    expect(front.className).toContain('opacity-0');
    expect(front.className).toContain('pointer-events-none');
    expect(back.className).toContain('opacity-100');
    expect(back.className).not.toContain('pointer-events-none');
  });

  it('face content never uses transition-all (it re-animates inherited visibility)', () => {
    const { container } = renderWithLang(
      <Flashcard {...baseProps} questionId={1} flipped={false} />,
    );
    expect(container.innerHTML).not.toContain('transition-all');
  });

  it('renders the new card front-side up after navigating away from a flipped card', () => {
    const { container, rerender } = renderWithLang(
      <Flashcard {...baseProps} questionId={1} flipped />,
    );
    rerender(<N400LangProvider lang="vi" dict={viDict}><Flashcard {...baseProps} questionId={2} flipped={false} /></N400LangProvider>);
    const el = rotor(container) as HTMLElement;
    expect(el.style.transform).toBe('rotateY(0deg)');
  });
});
