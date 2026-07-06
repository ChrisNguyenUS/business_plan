import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('N400 information architecture contracts', () => {
  test('flashcards page offers cards and list view modes', () => {
    const page = source('src/app/[locale]/n400app/flashcards/page.tsx');

    expect(page).toContain("'cards' | 'list'");
    expect(page).toContain('QuestionList');
    expect(page).toContain('Học thẻ');
    expect(page).toContain('Danh sách');
  });

  test('bookmark is no longer a navigation destination', () => {
    expect(source('src/components/n400/Sidebar.tsx')).not.toContain("'bookmark'");
    expect(source('src/components/n400/AvatarMenu.tsx')).not.toContain('/bookmark');
    expect(source('src/components/n400/Header.tsx')).not.toContain('bookmark:');
  });
});
