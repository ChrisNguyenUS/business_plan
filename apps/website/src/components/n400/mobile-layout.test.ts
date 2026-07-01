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

  test('dashboard and quiz screens collapse desktop columns on mobile', () => {
    const dashboard = source('src/app/[locale]/n400app/dashboard-client.tsx');
    const practice = source('src/app/[locale]/n400app/practice/page.tsx');
    const mockTest = source('src/app/[locale]/n400app/mock-test/page.tsx');

    expect(dashboard).toContain('flex-col lg:flex-row');
    expect(dashboard).toContain('grid-cols-2 lg:grid-cols-4');
    expect(practice).toContain('grid-cols-1 lg:grid-cols-[3fr_2fr]');
    expect(practice).toContain('grid-cols-1 sm:grid-cols-3');
    expect(mockTest).toContain('grid-cols-1 lg:grid-cols-[3fr_2fr]');
  });

  test('dashboard streak badges sit below the badge count instead of inline with it', () => {
    const dashboard = source('src/app/[locale]/n400app/dashboard-client.tsx');

    expect(dashboard).toContain('mt-3 flex flex-col items-start gap-2');
    expect(dashboard).toContain('mt-1 flex -space-x-1.5');
    expect(dashboard).not.toContain('flex -space-x-1.5 ml-1');
  });

  test('statistics screen avoids fixed desktop columns on mobile', () => {
    const statistic = source('src/app/[locale]/n400app/statistic/page.tsx');

    expect(statistic).toContain('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5');
    expect(statistic).toContain('flex flex-col gap-6 xl:flex-row');
    expect(statistic).toContain('grid grid-cols-1 gap-6 xl:grid-cols-3');
    expect(statistic).not.toContain('grid grid-cols-5 gap-4');
    expect(statistic).not.toContain('className="w-3/5');
    expect(statistic).not.toContain('className="w-2/5');
  });
});
