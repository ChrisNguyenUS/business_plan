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
});
