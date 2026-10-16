import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LandingPage from './page';

async function html(locale: string) {
  return renderToStaticMarkup(await LandingPage({ params: Promise.resolve({ locale }) }));
}

describe('/[locale]/n400ready', () => {
  it('server-renders the full Vietnamese landing text with one h1', async () => {
    const h = await html('vi');
    expect(h.match(/<h1/g)).toHaveLength(1);
    expect(h).toContain('luyện thi quốc tịch Mỹ miễn phí');
    expect(h).toContain('/n400ready/login?lang=vi');
    expect(h).toContain('/vi/blog/128-cau-hoi-thi-quoc-tich-my');
    expect(h).toContain('không phải hãng luật');
    expect(h).toContain('application/ld+json');
  });

  it('renders the English version', async () => {
    const h = await html('en');
    expect(h).toContain('free U.S. citizenship test practice');
    expect(h).toContain('/n400ready/login?lang=en');
    expect(h).toContain('not a law firm');
  });
});
