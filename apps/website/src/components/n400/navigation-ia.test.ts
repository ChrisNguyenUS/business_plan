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
    expect(page).toContain('Flashcard');
    expect(page).toContain('List');
  });

  test('bookmark is no longer a navigation destination', () => {
    expect(source('src/components/n400/Sidebar.tsx')).not.toContain("'bookmark'");
    expect(source('src/components/n400/AvatarMenu.tsx')).not.toContain('/bookmark');
    expect(source('src/components/n400/Header.tsx')).not.toContain('bookmark:');
  });

  test('old bookmark route redirects into flashcards list view', () => {
    const page = source('src/app/[locale]/n400app/bookmark/page.tsx');

    expect(page).toContain('redirect(');
    expect(page).toContain('view=list&filter=bookmarks');
  });

  test('study picker links to all four skills', () => {
    const page = source('src/app/[locale]/n400app/study/page.tsx');

    expect(page).toContain('study/civics');
    expect(page).toContain('speaking/what-mean');
    expect(page).toContain('speaking/yes-no');
    expect(page).toContain('/writing');
  });

  test('civics hub links to the existing flashcards and practice screens', () => {
    const page = source('src/app/[locale]/n400app/study/civics/page.tsx');

    expect(page).toContain('flashcards');
    expect(page).toContain('practice');
  });

  test('sidebar groups skills under HỌC TẬP and keeps four top-level areas', () => {
    const sidebar = source('src/components/n400/Sidebar.tsx');

    expect(sidebar).toContain('HỌC TẬP');
    expect(sidebar).toContain("href: 'study/civics'");
    expect(sidebar).toContain("href: 'speaking/what-mean'");
    expect(sidebar).toContain("href: 'speaking/yes-no'");
    expect(sidebar).toContain("href: 'writing'");
    // Learning methods are no longer nav destinations:
    expect(sidebar).not.toContain("href: 'practice'");
    expect(sidebar).not.toContain("href: 'flashcards'");
    // One merged progress entry, pointing at statistic:
    expect(sidebar).not.toContain("href: 'progress'");
    expect(sidebar).not.toContain('CIVICS (128 câu)');
  });

  test('mobile nav is Home / Học tập / Thi thử / Tiến độ', () => {
    const sidebar = source('src/components/n400/Sidebar.tsx');
    const mobile = sidebar.slice(sidebar.indexOf('MOBILE_MENU'));

    expect(mobile).toContain("href: 'study'");
    expect(mobile).toContain("href: 'mock-test'");
    expect(mobile).toContain("href: 'statistic'");
  });
});
