import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('N400 mobile layout contracts', () => {
  test('app shell keeps desktop sidebar offset out of mobile view', () => {
    const layout = source('src/app/[locale]/n400app/(app)/layout.tsx');
    const sidebar = source('src/components/n400/Sidebar.tsx');

    expect(layout).toContain('lg:ml-64');
    expect(layout).not.toContain('className="ml-64');
    expect(sidebar).toContain('hidden lg:flex');
  });

  test('dashboard collapses desktop columns on mobile', () => {
    const dashboard = source('src/app/[locale]/n400app/(app)/dashboard-client.tsx');

    // Hero panorama shows on mobile without the desktop torch overflow.
    expect(dashboard).toContain('w-[45%] lg:w-[44%]');
    expect(dashboard).toContain('[--pop:0px] lg:[--pop:32px]');
    // Goals/suggestion row stacks; quick-nav stays 3-up but compact; stats
    // strip scrolls horizontally instead of wrapping.
    expect(dashboard).toContain('grid-cols-1 gap-3 lg:grid-cols-5');
    expect(dashboard).toContain('grid grid-cols-3 gap-2 sm:gap-4');
    expect(dashboard).toContain('overflow-x-auto xl:grid xl:grid-cols-4');
  });

  test('progress tabs avoid fixed desktop columns on mobile', () => {
    const detail = source('src/app/[locale]/n400app/(app)/statistic/page.tsx');
    const overview = source('src/app/[locale]/n400app/(app)/progress/page.tsx');

    expect(detail).toContain('grid grid-cols-1 gap-4 xl:grid-cols-2');
    expect(detail).not.toContain('grid grid-cols-5 gap-4');
    expect(detail).not.toContain('className="w-3/5');
    expect(detail).not.toContain('className="w-2/5');

    // The overview must fit one mobile screen: compact stack, no desktop grid.
    expect(overview).toContain('flex-col gap-2');
    expect(overview).not.toContain('xl:grid-cols-5');
  });
});
