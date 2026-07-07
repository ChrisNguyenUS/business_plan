import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KeywordHighlight } from './KeywordHighlight';

// The repo's vitest runs in the default `node` environment (no jsdom /
// testing-library), so we render the component to a static HTML string and
// assert on that markup. `.keyword-highlight` is the class on each rendered
// keyword, so counting its occurrences counts the highlighted elements.
const countKeywords = (html: string) => (html.match(/keyword-highlight/g) ?? []).length;

const TERMS = [
  { id: 't-vote', termEn: 'vote' },
  { id: 't-citizen', termEn: 'citizen' },
];
const DEFINITIONS = {
  't-vote': 'to choose a leader',
  't-citizen': 'a member of a country',
};

describe('KeywordHighlight', () => {
  it('renders text with underlined keywords', () => {
    const html = renderToStaticMarkup(
      <KeywordHighlight
        text="You can vote if you are a citizen."
        terms={TERMS}
        definitions={DEFINITIONS}
      />,
    );
    expect(countKeywords(html)).toBe(2);
  });

  it('handles text with no matches', () => {
    const text = 'Nothing here appears on the list.';
    const html = renderToStaticMarkup(
      <KeywordHighlight text={text} terms={TERMS} definitions={DEFINITIONS} />,
    );
    expect(countKeywords(html)).toBe(0);
    expect(html).toContain(text);
  });

  it('preserves non-matching text between keywords', () => {
    const html = renderToStaticMarkup(
      <KeywordHighlight
        text="Please vote and become a citizen soon."
        terms={TERMS}
        definitions={DEFINITIONS}
      />,
    );
    expect(countKeywords(html)).toBe(2);
    // The literal text between the two keywords must survive untouched.
    expect(html).toContain(' and become a ');
    expect(html).toContain('Please ');
    expect(html).toContain(' soon.');
  });
});
