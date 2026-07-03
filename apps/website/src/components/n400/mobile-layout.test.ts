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

    // Dashboard main layout collapses to single column on mobile
    expect(dashboard).toContain('flex-col xl:flex-row');
    expect(dashboard).toContain('flex-col lg:flex-row');
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
