import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import StatePage, { generateStaticParams } from './page';

const render = async (locale: string, state: string) =>
  renderToStaticMarkup(await StatePage({ params: Promise.resolve({ locale, state }) }));

describe('/[locale]/n400ready/states/[state]', () => {
  it('pre-renders 56 pages per locale', async () => {
    expect(await generateStaticParams({ params: { locale: 'vi' } })).toHaveLength(56);
  });

  it('server-renders the four Texas answers with one h1 and the checked date', async () => {
    const h = await render('vi', 'texas');
    expect(h.match(/<h1/g)).toHaveLength(1);
    for (const t of ['John Cornyn', 'Ted Cruz', 'Austin', 'Kiểm tra ngày', 'house.gov', 'uscis.gov/citizenship/testupdates']) {
      expect(h).toContain(t);
    }
    expect(h).toContain('/n400ready/login?lang=vi');
  });

  it('renders D.C. with the USCIS rule answers', async () => {
    const h = await render('en', 'district-of-columbia');
    expect(h).toContain('D.C. does not have a governor');
    expect(h).not.toContain('Muriel Bowser');
  });
});
