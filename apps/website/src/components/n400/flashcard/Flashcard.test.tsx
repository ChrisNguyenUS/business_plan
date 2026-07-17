// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Flashcard } from './Flashcard';

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
    const { container, rerender } = render(
      <Flashcard {...baseProps} questionId={1} flipped={false} />,
    );
    const before = rotor(container);
    rerender(<Flashcard {...baseProps} questionId={1} flipped />);
    expect(rotor(container)).toBe(before);
  });

  it('remounts the rotating element when the question changes (no unflip animation can leak the opposite face)', () => {
    const { container, rerender } = render(
      <Flashcard {...baseProps} questionId={1} flipped />,
    );
    const before = rotor(container);
    rerender(<Flashcard {...baseProps} questionId={2} flipped={false} />);
    expect(rotor(container)).not.toBe(before);
  });

  it('renders the new card front-side up after navigating away from a flipped card', () => {
    const { container, rerender } = render(
      <Flashcard {...baseProps} questionId={1} flipped />,
    );
    rerender(<Flashcard {...baseProps} questionId={2} flipped={false} />);
    const el = rotor(container) as HTMLElement;
    expect(el.style.transform).toBe('rotateY(0deg)');
  });
});
