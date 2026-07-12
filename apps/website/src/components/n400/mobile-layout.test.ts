import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('N400 mobile layout contracts', () => {
  test('app shell keeps desktop sidebar offset out of mobile view', () => {
    const layout = source('src/app/[locale]/n400app/layout.tsx');
    const sidebar = source('src/components/n400/Sidebar.tsx');

    expect(layout).toContain('lg:ml-64');
    expect(layout).not.toContain('className="ml-64');
    expect(sidebar).toContain('hidden lg:flex');
  });

  test('dashboard collapses desktop columns on mobile', () => {
    const dashboard = source('src/app/[locale]/n400app/dashboard-client.tsx');

    // Hero panorama shows on mobile without the desktop torch overflow.
    expect(dashboard).toContain('w-[45%] lg:w-[44%]');
    expect(dashboard).toContain('[--pop:0px] lg:[--pop:32px]');
    // Hero progress bar goes full-width below lg.
    expect(dashboard).toContain('w-full lg:w-60');
    // Goals/suggestion row stacks; quick-nav stays 3-up but compact; stats
    // strip scrolls horizontally instead of wrapping.
    expect(dashboard).toContain('grid-cols-1 gap-3 lg:grid-cols-5');
    expect(dashboard).toContain('grid grid-cols-3 gap-2 sm:gap-4');
    expect(dashboard).toContain('overflow-x-auto xl:grid xl:grid-cols-4');
  });

  test('statistics screen avoids fixed desktop columns on mobile', () => {
    const statistic = source('src/app/[locale]/n400app/statistic/page.tsx');

    expect(statistic).toContain('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5');
    expect(statistic).toContain('flex flex-col gap-6 xl:flex-row');
    expect(statistic).toContain('grid grid-cols-1 gap-6 xl:grid-cols-2');
    expect(statistic).not.toContain('grid grid-cols-5 gap-4');
    expect(statistic).not.toContain('className="w-3/5');
    expect(statistic).not.toContain('className="w-2/5');
  });
});
