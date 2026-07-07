'use client';

import { useState } from 'react';
import { findKeywordSpans, type KeywordTerm } from '@/lib/n400/keyword-match';

interface KeywordHighlightProps {
  /** The sentence to render. */
  text: string;
  /** Vocabulary terms to underline, e.g. WHATMEAN_QUESTIONS mapped to { id, termEn }. */
  terms: readonly KeywordTerm[];
  /** Definition text keyed by term id (the `termId` returned by findKeywordSpans). */
  definitions: Record<string, string>;
}

/**
 * Renders `text` with any matched vocabulary `terms` underlined (teal) and a
 * definition popover on hover / click. Non-matching text is emitted verbatim.
 *
 * Uses a dependency-free CSS/`useState` popover rather than a headless UI
 * library: the app standardizes on Radix and has no popover primitive
 * installed, and this interaction is a lightweight hover/click tooltip.
 */
export function KeywordHighlight({ text, terms, definitions }: KeywordHighlightProps) {
  const spans = findKeywordSpans(text, terms);
  if (spans.length === 0) return <span>{text}</span>;

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  spans.forEach((span, i) => {
    if (span.start > cursor) {
      nodes.push(<span key={`text-${i}`}>{text.slice(cursor, span.start)}</span>);
    }
    const label = text.slice(span.start, span.end);
    const term = terms.find((t) => t.id === span.termId)?.termEn ?? label;
    nodes.push(
      <KeywordPopover
        key={`kw-${i}`}
        label={label}
        term={term}
        definition={definitions[span.termId] ?? ''}
      />,
    );
    cursor = span.end;
  });

  if (cursor < text.length) {
    nodes.push(<span key="text-end">{text.slice(cursor)}</span>);
  }

  return <span>{nodes}</span>;
}

interface KeywordPopoverProps {
  label: string;
  term: string;
  definition: string;
}

function KeywordPopover({ label, term, definition }: KeywordPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block group/kw">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="keyword-highlight underline decoration-teal-600 decoration-2 underline-offset-2 cursor-help hover:text-teal-600 transition-colors"
      >
        {label}
      </button>
      <span
        role="tooltip"
        className={`${open ? 'block' : 'hidden'} group-hover/kw:block absolute left-0 top-full z-20 mt-1 w-max max-w-xs bg-white border border-teal-200 rounded-lg p-2 shadow-lg text-sm text-left`}
      >
        <span className="font-semibold text-teal-700">{term}</span>
        {definition ? <span className="block text-gray-600">{definition}</span> : null}
      </span>
    </span>
  );
}
